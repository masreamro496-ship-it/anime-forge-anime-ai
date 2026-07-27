-- 1. تعطيل نظام الحماية RLS تماماً عن جدول المهمات
ALTER TABLE IF EXISTS public.task_submissions DISABLE ROW LEVEL SECURITY;

-- 2. منح كافة الصلاحيات للزوار والمستخدمين
GRANT ALL ON public.task_submissions TO anon, authenticated, service_role;
