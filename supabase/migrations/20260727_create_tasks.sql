-- 1. إنشاء جدول المهمات مع كافة الأعمدة المطلوبة
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  task_id TEXT,
  task_title TEXT,
  proof_link TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. تعطيل نظام الحماية RLS لمنع حظر أي مستخدم
ALTER TABLE public.task_submissions DISABLE ROW LEVEL SECURITY;

-- 3. منح الصلاحيات الكاملة للزوار والمستخدمين
GRANT ALL ON public.task_submissions TO anon, authenticated, service_role;
