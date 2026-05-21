
-- update welcome credits to 25
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_super_admin boolean := (new.email = 'khalidassdapdop@gmail.com');
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.credits (user_id, balance) values (new.id, 25);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if is_super_admin then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

-- ensure trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- shorts status enum
create type public.short_status as enum ('processing', 'test_queue', 'published', 'expired');

create table public.shorts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default '',
  video_path text not null,
  thumbnail_path text,
  duration_seconds integer not null,
  status public.short_status not null default 'processing',
  scheduled_publish_at timestamptz not null default (now() + interval '1 hour'),
  published_at timestamptz,
  views_count integer not null default 0,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_shorts_status_published on public.shorts(status, published_at desc);
create index idx_shorts_user on public.shorts(user_id);
create index idx_shorts_scheduled on public.shorts(scheduled_publish_at) where status = 'processing';

alter table public.shorts enable row level security;

create policy "shorts: public read published"
  on public.shorts for select
  using (status in ('test_queue', 'published'));
create policy "shorts: self read own"
  on public.shorts for select to authenticated
  using (auth.uid() = user_id);
create policy "shorts: admin read all"
  on public.shorts for select to authenticated
  using (has_role(auth.uid(), 'admin'));
create policy "shorts: self insert"
  on public.shorts for insert to authenticated
  with check (auth.uid() = user_id);
create policy "shorts: self update own"
  on public.shorts for update to authenticated
  using (auth.uid() = user_id);
create policy "shorts: admin write"
  on public.shorts for all to authenticated
  using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));

create trigger trg_shorts_updated before update on public.shorts
  for each row execute function public.touch_updated_at();

-- likes
create table public.shorts_likes (
  short_id uuid not null references public.shorts(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (short_id, user_id)
);
alter table public.shorts_likes enable row level security;
create policy "likes: public read" on public.shorts_likes for select using (true);
create policy "likes: self insert" on public.shorts_likes for insert to authenticated
  with check (auth.uid() = user_id);
create policy "likes: self delete" on public.shorts_likes for delete to authenticated
  using (auth.uid() = user_id);

-- comments
create table public.shorts_comments (
  id uuid primary key default gen_random_uuid(),
  short_id uuid not null references public.shorts(id) on delete cascade,
  user_id uuid not null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index idx_comments_short on public.shorts_comments(short_id, created_at desc);
alter table public.shorts_comments enable row level security;
create policy "comments: public read" on public.shorts_comments for select using (true);
create policy "comments: self insert" on public.shorts_comments for insert to authenticated
  with check (auth.uid() = user_id);
create policy "comments: self delete" on public.shorts_comments for delete to authenticated
  using (auth.uid() = user_id);
create policy "comments: admin delete" on public.shorts_comments for delete to authenticated
  using (has_role(auth.uid(), 'admin'));

-- views (unique per user per short)
create table public.shorts_views (
  short_id uuid not null references public.shorts(id) on delete cascade,
  viewer_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (short_id, viewer_id)
);
alter table public.shorts_views enable row level security;
create policy "views: insert any auth" on public.shorts_views for insert to authenticated
  with check (auth.uid() = viewer_id);
create policy "views: admin read" on public.shorts_views for select to authenticated
  using (has_role(auth.uid(), 'admin'));

-- triggers to keep counters
create or replace function public.shorts_likes_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.shorts set likes_count = likes_count + 1 where id = new.short_id;
  elsif tg_op = 'DELETE' then
    update public.shorts set likes_count = greatest(0, likes_count - 1) where id = old.short_id;
  end if;
  return null;
end; $$;
create trigger trg_likes_count after insert or delete on public.shorts_likes
  for each row execute function public.shorts_likes_counter();

create or replace function public.shorts_comments_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.shorts set comments_count = comments_count + 1 where id = new.short_id;
  elsif tg_op = 'DELETE' then
    update public.shorts set comments_count = greatest(0, comments_count - 1) where id = old.short_id;
  end if;
  return null;
end; $$;
create trigger trg_comments_count after insert or delete on public.shorts_comments
  for each row execute function public.shorts_comments_counter();

create or replace function public.shorts_views_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.shorts set views_count = views_count + 1 where id = new.short_id;
  return null;
end; $$;
create trigger trg_views_count after insert on public.shorts_views
  for each row execute function public.shorts_views_counter();

-- admin messages (user -> admin)
create table public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  body text not null check (char_length(body) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_admin_messages_unread on public.admin_messages(created_at desc) where is_read = false;
alter table public.admin_messages enable row level security;
create policy "msg: self read" on public.admin_messages for select to authenticated
  using (auth.uid() = user_id);
create policy "msg: self insert" on public.admin_messages for insert to authenticated
  with check (auth.uid() = user_id);
create policy "msg: admin read" on public.admin_messages for select to authenticated
  using (has_role(auth.uid(), 'admin'));
create policy "msg: admin update" on public.admin_messages for update to authenticated
  using (has_role(auth.uid(), 'admin'));

-- storage bucket for shorts (public)
insert into storage.buckets (id, name, public) values ('shorts', 'shorts', true)
on conflict (id) do nothing;

create policy "shorts bucket: public read"
  on storage.objects for select using (bucket_id = 'shorts');
create policy "shorts bucket: auth upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'shorts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "shorts bucket: self delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'shorts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "shorts bucket: admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'shorts' and has_role(auth.uid(), 'admin'));

-- atomic publish: deduct credits + mark short, all in one
create or replace function public.publish_short(_short_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _bal numeric;
  _owner uuid;
  _status public.short_status;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  select user_id, status into _owner, _status from public.shorts where id = _short_id for update;
  if _owner is null then raise exception 'short not found'; end if;
  if _owner <> _uid then raise exception 'not owner'; end if;
  if _status <> 'processing' then raise exception 'already published'; end if;
  select balance into _bal from public.credits where user_id = _uid for update;
  if coalesce(_bal,0) < 5 then raise exception 'insufficient credits'; end if;
  update public.credits set balance = balance - 5, updated_at = now() where user_id = _uid;
  insert into public.credit_transactions(user_id, kind, amount, description)
    values (_uid, 'publish_short', -5, 'نشر شورت');
  update public.shorts
    set scheduled_publish_at = now() + interval '1 hour'
    where id = _short_id;
end; $$;

-- promote processing -> test_queue after scheduled time
create or replace function public.promote_scheduled_shorts()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.shorts
    set status = 'test_queue', published_at = now()
    where status = 'processing' and scheduled_publish_at <= now();
  -- algorithm: promote test_queue to published if views >= 50 and likes >= 3
  update public.shorts
    set status = 'published'
    where status = 'test_queue' and views_count >= 50 and likes_count >= 3;
  -- auto-purge after 4 days
  delete from public.shorts
    where published_at is not null and published_at < now() - interval '4 days';
end; $$;

-- cron extensions and schedule
create extension if not exists pg_cron;
select cron.schedule(
  'shorts-promote-and-purge',
  '*/5 * * * *',
  $$select public.promote_scheduled_shorts();$$
);
