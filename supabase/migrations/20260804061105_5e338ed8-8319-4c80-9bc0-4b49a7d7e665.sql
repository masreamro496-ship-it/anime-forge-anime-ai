-- شارات التوثيق
ALTER TABLE public.chat_room_messages ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false;
ALTER TABLE public.anime_media ADD COLUMN IF NOT EXISTS author_is_pro boolean NOT NULL DEFAULT false;
ALTER TABLE public.anime_media ADD COLUMN IF NOT EXISTS author_is_moderator boolean NOT NULL DEFAULT false;
ALTER TABLE public.anime_media ADD COLUMN IF NOT EXISTS author_name text;

-- طلبات التقديم (إدارة / مطور)
CREATE TABLE IF NOT EXISTS public.staff_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('admin','developer')),
  full_name text NOT NULL,
  age int,
  phone text,
  skills text,
  info text NOT NULL,
  requested_credits int,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.staff_applications TO authenticated;
GRANT ALL ON public.staff_applications TO service_role;
ALTER TABLE public.staff_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own applications select" ON public.staff_applications;
CREATE POLICY "own applications select" ON public.staff_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "own applications insert" ON public.staff_applications;
CREATE POLICY "own applications insert" ON public.staff_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins update applications" ON public.staff_applications;
CREATE POLICY "admins update applications" ON public.staff_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
GRANT UPDATE ON public.staff_applications TO authenticated;