create table if not exists public.task_submissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid,
  user_email text,
  task_id text,
  task_title text,
  proof_link text,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.task_submissions enable row level security;

drop policy if exists "Allow all operations" on public.task_submissions;

create policy "Allow all operations"
on public.task_submissions
for all
using (true)
with check (true);
