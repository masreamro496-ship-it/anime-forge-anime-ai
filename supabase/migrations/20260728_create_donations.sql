-- 1. إنشاء جدول التبرعات
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  amount NUMERIC NOT NULL,
  transaction_number TEXT NOT NULL,
  receipt_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. تعطيل نظام RLS لضمان سهولة الإرسال والقراءة
ALTER TABLE public.donations DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.donations TO anon, authenticated, service_role;

-- 3. إنشاء مجلد التخزين لرفع إيصالات التبرع
INSERT INTO storage.buckets (id, name, public)
VALUES ('donation-receipts', 'donation-receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. إعطاء الصلاحية للجميع برفع ورؤية الصور
DROP POLICY IF EXISTS "Public Upload donation-receipts" ON storage.objects;
CREATE POLICY "Public Upload donation-receipts" ON storage.objects
FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'donation-receipts');

DROP POLICY IF EXISTS "Public Read donation-receipts" ON storage.objects;
CREATE POLICY "Public Read donation-receipts" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'donation-receipts');

