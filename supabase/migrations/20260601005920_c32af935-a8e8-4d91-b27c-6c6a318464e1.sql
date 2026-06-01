
-- Daily credit gifts tracking
CREATE TABLE IF NOT EXISTS public.daily_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_daily_gifts_user_time ON public.daily_gifts(user_id, claimed_at DESC);

GRANT SELECT ON public.daily_gifts TO authenticated;
GRANT ALL ON public.daily_gifts TO service_role;

ALTER TABLE public.daily_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gifts: self read" ON public.daily_gifts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "gifts: admin read" ON public.daily_gifts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- PRO codes table (for external programming sites with Supabase)
CREATE TABLE IF NOT EXISTS public.pro_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  uses_remaining integer NOT NULL DEFAULT 2
);
CREATE INDEX IF NOT EXISTS idx_pro_codes_user ON public.pro_codes(user_id);

GRANT SELECT ON public.pro_codes TO authenticated;
GRANT ALL ON public.pro_codes TO service_role;

ALTER TABLE public.pro_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pro_codes: self read" ON public.pro_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pro_codes: admin read" ON public.pro_codes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Function: claim daily gift
CREATE OR REPLACE FUNCTION public.claim_daily_gift()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_pro boolean;
  _amount numeric;
  _last timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT MAX(claimed_at) INTO _last FROM public.daily_gifts WHERE user_id = _uid;
  IF _last IS NOT NULL AND _last > now() - interval '24 hours' THEN
    RAISE EXCEPTION 'already claimed: wait until %', (_last + interval '24 hours');
  END IF;

  SELECT coalesce(is_pro,false) INTO _is_pro FROM public.profiles WHERE id = _uid;
  _amount := CASE WHEN _is_pro THEN 100 ELSE 25 END;

  INSERT INTO public.daily_gifts (user_id, amount) VALUES (_uid, _amount);
  INSERT INTO public.credits (user_id, balance) VALUES (_uid, _amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.credits.balance + _amount, updated_at = now();
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (_uid, _amount, 'gift', 'daily_gift');

  RETURN _amount;
END; $$;

-- Function: admin grant credits
CREATE OR REPLACE FUNCTION public.admin_grant_credits(_target_user uuid, _amount numeric, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _amount = 0 THEN RAISE EXCEPTION 'amount required'; END IF;
  INSERT INTO public.credits (user_id, balance) VALUES (_target_user, _amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.credits.balance + _amount, updated_at = now();
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (_target_user, _amount, CASE WHEN _amount > 0 THEN 'admin_grant' ELSE 'admin_deduct' END, coalesce(_note,'admin'));
END; $$;

-- Function: generate PRO code (PRO users only)
CREATE OR REPLACE FUNCTION public.generate_pro_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_pro boolean;
  _code text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT coalesce(is_pro,false) INTO _is_pro FROM public.profiles WHERE id = _uid;
  IF NOT _is_pro THEN RAISE EXCEPTION 'PRO membership required'; END IF;

  _code := 'PRO-' || upper(substring(encode(gen_random_bytes(12),'hex') from 1 for 16));
  INSERT INTO public.pro_codes (user_id, code, expires_at, uses_remaining)
    VALUES (_uid, _code, now() + interval '30 days', 2);
  RETURN _code;
END; $$;
