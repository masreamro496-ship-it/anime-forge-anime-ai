
-- 1) Extend profiles & shorts
alter table public.profiles add column if not exists earnings_usd numeric(12,2) not null default 0;

alter table public.shorts add column if not exists description text not null default '';
alter table public.shorts add column if not exists price_usd numeric(10,2) not null default 0;
alter table public.shorts add column if not exists vodafone_phone text not null default '';

-- relax old 15s short cap: allow long video durations
alter table public.shorts alter column duration_seconds drop not null;

-- 2) Purchases
do $$ begin
  create type public.purchase_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.project_purchases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.shorts(id) on delete cascade,
  buyer_id uuid not null,
  seller_id uuid not null,
  price_usd numeric(10,2) not null,
  status public.purchase_status not null default 'pending',
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid,
  unique (project_id, buyer_id)
);

alter table public.project_purchases enable row level security;

create policy "purch: buyer read own" on public.project_purchases
  for select to authenticated using (auth.uid() = buyer_id);
create policy "purch: seller read own" on public.project_purchases
  for select to authenticated using (auth.uid() = seller_id);
create policy "purch: admin read all" on public.project_purchases
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
-- writes only via security-definer RPCs (no direct insert/update policy)

-- 3) Make shorts bucket private so video_path requires signed url
update storage.buckets set public = false where id = 'shorts';

-- drop overly-permissive read policies (if any) and only allow:
-- - public read of thumbnails (thumbs/* path)
-- - owner read of own files
-- - admin read all
drop policy if exists "shorts public read" on storage.objects;
drop policy if exists "shorts read"        on storage.objects;
drop policy if exists "shorts: public read"        on storage.objects;
drop policy if exists "shorts: owner read"         on storage.objects;
drop policy if exists "shorts: admin read"         on storage.objects;
drop policy if exists "shorts: self upload"        on storage.objects;
drop policy if exists "shorts: thumbs public read" on storage.objects;

create policy "shorts: thumbs public read" on storage.objects
  for select to public
  using (bucket_id = 'shorts' and (storage.foldername(name))[2] = 'thumbs');

create policy "shorts: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'shorts' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "shorts: admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'shorts' and public.has_role(auth.uid(),'admin'));

create policy "shorts: self upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shorts' and auth.uid()::text = (storage.foldername(name))[1]);

-- 4) RPCs

-- create_project: enforces per-user project limits (1 for user, 2 for pro) and duration
create or replace function public.create_project(
  _title text,
  _description text,
  _video_path text,
  _thumbnail_path text,
  _duration_seconds int,
  _price_usd numeric,
  _vodafone_phone text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _is_pro boolean;
  _max_count int;
  _max_seconds int;
  _existing int;
  _new_id uuid;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  if coalesce(_price_usd,0) <= 0 then raise exception 'price_usd must be > 0'; end if;
  if length(coalesce(_vodafone_phone,'')) < 8 then raise exception 'vodafone_phone required'; end if;
  if length(coalesce(_video_path,'')) < 1 then raise exception 'video_path required'; end if;

  select coalesce(is_pro,false) into _is_pro from public.profiles where id = _uid;

  if _is_pro then
    _max_count := 2;
    _max_seconds := 30 * 60;
  else
    _max_count := 1;
    _max_seconds := 2 * 60;
  end if;

  if coalesce(_duration_seconds,0) > _max_seconds then
    raise exception 'video too long (max % seconds)', _max_seconds;
  end if;

  select count(*) into _existing from public.shorts where user_id = _uid;
  if _existing >= _max_count then
    raise exception 'project limit reached (max % project(s))', _max_count;
  end if;

  insert into public.shorts (
    user_id, title, description, video_path, thumbnail_path,
    duration_seconds, status, scheduled_publish_at, published_at,
    price_usd, vodafone_phone
  ) values (
    _uid, left(coalesce(_title,''),100), left(coalesce(_description,''),1000),
    _video_path, _thumbnail_path,
    coalesce(_duration_seconds,0), 'published'::public.short_status,
    now(), now(),
    _price_usd, _vodafone_phone
  ) returning id into _new_id;

  return _new_id;
end; $$;

-- request_purchase: buyer asks to buy; returns vodafone phone of seller
create or replace function public.request_purchase(_project_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _seller uuid;
  _price numeric;
  _phone text;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  select user_id, price_usd, vodafone_phone into _seller, _price, _phone
    from public.shorts where id = _project_id;
  if _seller is null then raise exception 'project not found'; end if;
  if _seller = _uid then raise exception 'cannot buy own project'; end if;

  insert into public.project_purchases (project_id, buyer_id, seller_id, price_usd, status)
  values (_project_id, _uid, _seller, _price, 'pending')
  on conflict (project_id, buyer_id) do nothing;

  return _phone;
end; $$;

-- approve_purchase: seller or admin approves; adds earnings to seller
create or replace function public.approve_purchase(_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _seller uuid;
  _price numeric;
  _status public.purchase_status;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  select seller_id, price_usd, status into _seller, _price, _status
    from public.project_purchases where id = _purchase_id for update;
  if _seller is null then raise exception 'purchase not found'; end if;
  if _status <> 'pending' then raise exception 'already processed'; end if;
  if _seller <> _uid and not public.has_role(_uid,'admin') then
    raise exception 'not authorized';
  end if;

  update public.project_purchases
    set status = 'approved', approved_at = now(), approved_by = _uid
    where id = _purchase_id;

  update public.profiles set earnings_usd = earnings_usd + _price, updated_at = now()
    where id = _seller;
end; $$;

-- can_view_project_video: returns true if owner, admin, or has approved purchase
create or replace function public.can_view_project_video(_project_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shorts s
      where s.id = _project_id and s.user_id = _user_id
  ) or public.has_role(_user_id,'admin')
    or exists (
    select 1 from public.project_purchases p
      where p.project_id = _project_id
        and p.buyer_id = _user_id
        and p.status = 'approved'
  );
$$;

-- get_project_video_path: returns the storage path if authorized, else null
create or replace function public.get_project_video_path(_project_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _path text;
begin
  if _uid is null then return null; end if;
  if not public.can_view_project_video(_project_id, _uid) then return null; end if;
  select video_path into _path from public.shorts where id = _project_id;
  return _path;
end; $$;

-- drop old publish_short RPC (no longer needed)
drop function if exists public.publish_short(uuid);

-- 5) tighten shorts SELECT: hide vodafone_phone via column-level? Postgres RLS is row-level.
-- We'll expose a "shorts_public" view with safe columns.
create or replace view public.shorts_public as
  select
    id, user_id, title, description, thumbnail_path,
    duration_seconds, price_usd, status,
    published_at, views_count, likes_count, comments_count, created_at
  from public.shorts
  where status in ('published','test_queue');

grant select on public.shorts_public to anon, authenticated;
