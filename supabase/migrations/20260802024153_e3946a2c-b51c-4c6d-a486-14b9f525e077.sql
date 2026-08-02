-- 1) TASK SUBMISSIONS ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  task_id text NOT NULL,
  task_title text NOT NULL,
  proof_link text,
  proof_path text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  credits_awarded numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_submissions TO authenticated;
GRANT ALL ON public.task_submissions TO service_role;

ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_submissions insert own"
  ON public.task_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "task_submissions select own"
  ON public.task_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "task_submissions admin select"
  ON public.task_submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "task_submissions admin update"
  ON public.task_submissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "task_submissions admin delete"
  ON public.task_submissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER task_submissions_set_updated_at
  BEFORE UPDATE ON public.task_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) STORAGE POLICIES FOR task-proofs ------------------------------------
CREATE POLICY "task-proofs upload own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "task-proofs read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "task-proofs read staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-proofs'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  );

CREATE POLICY "task-proofs delete own or admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-proofs'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
  );

-- 3) GRANT CREDITS BY EMAIL ---------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_grant_credits(_email text, _amount numeric, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _bal numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'غير مصرح لك بهذه العملية';
  END IF;

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'لا يوجد مستخدم بهذا البريد: %', _email;
  END IF;

  INSERT INTO public.credits (user_id, balance)
  VALUES (_uid, GREATEST(_amount, 0))
  ON CONFLICT (user_id) DO UPDATE SET balance = GREATEST(public.credits.balance + _amount, 0)
  RETURNING balance INTO _bal;

  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
  VALUES (_uid, _amount, CASE WHEN _amount >= 0 THEN 'admin_grant' ELSE 'admin_deduct' END,
          COALESCE(_note, 'من لوحة الأدمن'));

  RETURN jsonb_build_object('ok', true, 'user_id', _uid, 'balance', _bal);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_grant_credits(text, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_credits(text, numeric, text) TO authenticated;

-- 4) BOT GREETING --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_bot_greeting()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last timestamptz;
  _msgs text[] := ARRAY[
    'أهلاً بيكم يا أبطال 👋 خليكم محترمين ومتعاونين، وممنوع السب أو القذف أو الصور غير اللائقة.',
    'أهلاً بيكم 🌟 استمتعوا بالدردشة والتزموا بقوانين الموقع.',
    'أهلاً بيكم 🤖 لو محتاج مساعدة كلّم الأدمن أو المشرف مباشرة.'
  ];
BEGIN
  SELECT max(created_at) INTO _last
  FROM public.chat_room_messages
  WHERE display_name = 'إدارة البوتات';

  IF _last IS NOT NULL AND _last > now() - interval '2 hours' THEN
    RETURN false;
  END IF;

  INSERT INTO public.chat_room_messages
    (user_id, display_name, content, is_admin)
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'إدارة البوتات',
    _msgs[1 + floor(random() * array_length(_msgs, 1))::int],
    true
  );
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.post_bot_greeting() FROM public;
GRANT EXECUTE ON FUNCTION public.post_bot_greeting() TO anon, authenticated, service_role;

-- 5) EXTERNAL API CREDIT DEDUCTION --------------------------------------
CREATE TABLE IF NOT EXISTS public.api_credit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  amount numeric NOT NULL,
  source text NOT NULL,
  reason text,
  success boolean NOT NULL DEFAULT true,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.api_credit_logs TO authenticated;
GRANT ALL ON public.api_credit_logs TO service_role;

ALTER TABLE public.api_credit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_credit_logs admin read"
  ON public.api_credit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE OR REPLACE FUNCTION public.api_deduct_credits(
  _email text,
  _amount numeric,
  _source text,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _bal numeric;
  _new numeric;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _uid IS NULL THEN
    INSERT INTO public.api_credit_logs (email, amount, source, reason, success, error)
    VALUES (_email, _amount, _source, _reason, false, 'user_not_found');
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  SELECT balance INTO _bal FROM public.credits WHERE user_id = _uid FOR UPDATE;
  _bal := COALESCE(_bal, 0);

  IF _bal < _amount THEN
    INSERT INTO public.api_credit_logs (user_id, email, amount, source, reason, success, error)
    VALUES (_uid, _email, _amount, _source, _reason, false, 'insufficient_credits');
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credits', 'balance', _bal);
  END IF;

  _new := _bal - _amount;

  INSERT INTO public.credits (user_id, balance)
  VALUES (_uid, _new)
  ON CONFLICT (user_id) DO UPDATE SET balance = _new;

  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
  VALUES (_uid, -_amount, 'api_spend', COALESCE(_reason, 'خصم من موقع خارجي') || ' • ' || _source);

  INSERT INTO public.api_credit_logs (user_id, email, amount, source, reason, success)
  VALUES (_uid, _email, _amount, _source, _reason, true);

  RETURN jsonb_build_object('ok', true, 'balance', _new, 'deducted', _amount);
END;
$$;

REVOKE ALL ON FUNCTION public.api_deduct_credits(text, numeric, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_deduct_credits(text, numeric, text, text) TO service_role;