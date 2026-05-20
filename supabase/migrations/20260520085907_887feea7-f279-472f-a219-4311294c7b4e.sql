
-- =========================================================
-- 1. Update default welcome credits 10 -> 20
-- =========================================================
ALTER TABLE public.credits ALTER COLUMN balance SET DEFAULT 20;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  is_super_admin boolean := (new.email = 'khalidassdapdop@gmail.com');
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );

  insert into public.credits (user_id, balance) values (new.id, 20);

  insert into public.user_roles (user_id, role) values (new.id, 'user');

  if is_super_admin then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$function$;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 2. pending_payments
-- =========================================================
CREATE TYPE public.payment_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.pending_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  op_number text NOT NULL,
  receipt_url text NOT NULL,
  amount numeric NOT NULL DEFAULT 50,
  status public.payment_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pay: self read" ON public.pending_payments
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "pay: self insert" ON public.pending_payments
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pay: admin read" ON public.pending_payments
FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "pay: admin write" ON public.pending_payments
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_pay_updated
BEFORE UPDATE ON public.pending_payments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 3. generation_requests
-- =========================================================
CREATE TYPE public.gen_type AS ENUM ('video','goku_voice');
CREATE TYPE public.gen_status AS ENUM ('pending','in_review','completed','rejected');

CREATE TABLE public.generation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type public.gen_type NOT NULL,
  prompt text NOT NULL,
  start_image_url text,
  end_image_url text,
  duration_seconds int,
  credits_charged numeric NOT NULL DEFAULT 0,
  status public.gen_status NOT NULL DEFAULT 'pending',
  result_url text,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gen: self read" ON public.generation_requests
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "gen: self insert" ON public.generation_requests
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gen: admin read" ON public.generation_requests
FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "gen: admin write" ON public.generation_requests
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_gen_updated
BEFORE UPDATE ON public.generation_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 4. Storage buckets
-- =========================================================
INSERT INTO storage.buckets (id,name,public) VALUES
  ('receipts','receipts',false),
  ('gen-inputs','gen-inputs',false),
  ('gen-outputs','gen-outputs',true)
ON CONFLICT (id) DO NOTHING;

-- Receipts: user uploads to own folder, admins read all
CREATE POLICY "receipts: user upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "receipts: user read own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "receipts: admin read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='receipts' AND public.has_role(auth.uid(),'admin'));

-- gen-inputs: same pattern
CREATE POLICY "gen-inputs: user upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='gen-inputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "gen-inputs: user read own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='gen-inputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "gen-inputs: admin read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='gen-inputs' AND public.has_role(auth.uid(),'admin'));

-- gen-outputs: public read, admin upload
CREATE POLICY "gen-outputs: public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id='gen-outputs');

CREATE POLICY "gen-outputs: admin upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='gen-outputs' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "gen-outputs: admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='gen-outputs' AND public.has_role(auth.uid(),'admin'));
