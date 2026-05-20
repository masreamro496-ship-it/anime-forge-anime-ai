
-- Roles enum
create type public.app_role as enum ('admin', 'moderator', 'pro', 'user');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  is_pro boolean not null default false,
  pro_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security definer role-check function (avoids RLS recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Credits
create table public.credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(12,2) not null default 10,
  updated_at timestamptz not null default now()
);
alter table public.credits enable row level security;

-- Credit transactions log
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  kind text not null,
  description text,
  created_at timestamptz not null default now()
);
alter table public.credit_transactions enable row level security;

-- ===== RLS Policies =====
-- profiles
create policy "profiles: self read" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles: admin read" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "profiles: self update" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "profiles: admin update" on public.profiles
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- user_roles
create policy "roles: self read" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy "roles: admin read" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "roles: admin write" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- credits
create policy "credits: self read" on public.credits
  for select to authenticated using (auth.uid() = user_id);
create policy "credits: admin read" on public.credits
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "credits: admin write" on public.credits
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- credit_transactions
create policy "tx: self read" on public.credit_transactions
  for select to authenticated using (auth.uid() = user_id);
create policy "tx: admin read" on public.credit_transactions
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "tx: admin write" on public.credit_transactions
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ===== Auto-create profile + credits + role on signup =====
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

  insert into public.credits (user_id, balance) values (new.id, 10);

  insert into public.user_roles (user_id, role) values (new.id, 'user');

  if is_super_admin then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger credits_touch before update on public.credits
  for each row execute function public.touch_updated_at();
