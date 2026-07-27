-- 1. إنشاء جدول المهمات إذا لم يكن موجوداً
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

-- 2. تعطيل نظام الحماية RLS تماماً للجدول لمنع أي حظر للزوار
alter table public.task_submissions disable row level security;

-- 3. إعطاء صلاحية كاملة للزوار والمستخدمين للإدخال والقراءة
grant all on public.task_submissions to anon, authenticated, service_role;
