
-- 1) media servers
CREATE TABLE public.media_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES public.anime_media(id) ON DELETE CASCADE,
  server_no int NOT NULL CHECK (server_no BETWEEN 1 AND 5),
  quality int NOT NULL CHECK (quality IN (240,360,480)),
  embed_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (media_id, server_no, quality)
);
GRANT SELECT ON public.media_servers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.media_servers TO authenticated;
GRANT ALL ON public.media_servers TO service_role;
ALTER TABLE public.media_servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servers readable" ON public.media_servers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner or admin manage servers" ON public.media_servers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.anime_media m WHERE m.id = media_id AND m.user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.anime_media m WHERE m.id = media_id AND m.user_id = auth.uid()));

-- 2) wheel
CREATE TABLE public.wheel_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prize_kind text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wheel_spins TO authenticated;
GRANT ALL ON public.wheel_spins TO service_role;
ALTER TABLE public.wheel_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own spins" ON public.wheel_spins FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE public.wheel_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spin_id uuid NOT NULL REFERENCES public.wheel_spins(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.wheel_claims TO authenticated;
GRANT ALL ON public.wheel_claims TO service_role;
ALTER TABLE public.wheel_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own claims read" ON public.wheel_claims FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "own claims insert" ON public.wheel_claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND phone ~ '^010[0-9]{8}$');
CREATE POLICY "admin update claims" ON public.wheel_claims FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE OR REPLACE FUNCTION public.spin_wheel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _last timestamptz;
  _r numeric;
  _kind text;
  _amount numeric := 0;
  _spin uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT max(created_at) INTO _last FROM public.wheel_spins WHERE user_id = _uid;
  IF _last IS NOT NULL AND _last > now() - interval '7 days' THEN
    RAISE EXCEPTION 'weekly_limit:%', (_last + interval '7 days');
  END IF;

  _r := random() * 100;
  IF _r < 1 THEN
    _kind := 'cash_card_5'; _amount := 0;
  ELSIF _r < 11 THEN
    _kind := 'credits'; _amount := 100;
  ELSIF _r < 41 THEN
    _kind := 'credits'; _amount := 50;
  ELSE
    _kind := 'credits'; _amount := 25;
  END IF;

  INSERT INTO public.wheel_spins (user_id, prize_kind, amount)
  VALUES (_uid, _kind, _amount) RETURNING id INTO _spin;

  IF _kind = 'credits' THEN
    INSERT INTO public.credits (user_id, balance) VALUES (_uid, _amount)
      ON CONFLICT (user_id) DO UPDATE SET balance = public.credits.balance + _amount, updated_at = now();
    INSERT INTO public.credit_transactions (user_id, amount, kind, description)
      VALUES (_uid, _amount, 'gift', 'wheel_prize');
  END IF;

  RETURN jsonb_build_object('spin_id', _spin, 'kind', _kind, 'amount', _amount);
END; $$;
REVOKE EXECUTE ON FUNCTION public.spin_wheel() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.spin_wheel() TO authenticated;

-- convert cash card to 50 credits
CREATE OR REPLACE FUNCTION public.convert_cash_card(_spin_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _kind text; _owner uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT user_id, prize_kind INTO _owner, _kind FROM public.wheel_spins WHERE id = _spin_id FOR UPDATE;
  IF _owner IS NULL OR _owner <> _uid THEN RAISE EXCEPTION 'not found'; END IF;
  IF _kind <> 'cash_card_5' THEN RAISE EXCEPTION 'not a cash card'; END IF;
  IF EXISTS (SELECT 1 FROM public.wheel_claims WHERE spin_id = _spin_id) THEN RAISE EXCEPTION 'already claimed'; END IF;
  UPDATE public.wheel_spins SET prize_kind = 'credits', amount = 50 WHERE id = _spin_id;
  INSERT INTO public.credits (user_id, balance) VALUES (_uid, 50)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.credits.balance + 50, updated_at = now();
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (_uid, 50, 'gift', 'wheel_card_convert');
  RETURN 50;
END; $$;
REVOKE EXECUTE ON FUNCTION public.convert_cash_card(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.convert_cash_card(uuid) TO authenticated;

-- 3) external deduct by user id
CREATE OR REPLACE FUNCTION public.api_deduct_credits_by_user(_user_id uuid, _amount numeric, _source text, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _bal numeric; _new numeric; _email text;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  IF _email IS NULL THEN
    INSERT INTO public.api_credit_logs (user_id, amount, source, reason, success, error)
    VALUES (_user_id, _amount, _source, _reason, false, 'user_not_found');
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  SELECT balance INTO _bal FROM public.credits WHERE user_id = _user_id FOR UPDATE;
  _bal := COALESCE(_bal, 0);
  IF _bal < _amount THEN
    INSERT INTO public.api_credit_logs (user_id, email, amount, source, reason, success, error)
    VALUES (_user_id, _email, _amount, _source, _reason, false, 'insufficient_credits');
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_credits', 'balance', _bal);
  END IF;

  _new := _bal - _amount;
  INSERT INTO public.credits (user_id, balance) VALUES (_user_id, _new)
    ON CONFLICT (user_id) DO UPDATE SET balance = _new;
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (_user_id, -_amount, 'api_spend', COALESCE(_reason,'خصم من موقع خارجي') || ' • ' || _source);
  INSERT INTO public.api_credit_logs (user_id, email, amount, source, reason, success)
    VALUES (_user_id, _email, _amount, _source, _reason, true);

  RETURN jsonb_build_object('ok', true, 'balance', _new, 'deducted', _amount);
END; $$;
REVOKE EXECUTE ON FUNCTION public.api_deduct_credits_by_user(uuid, numeric, text, text) FROM anon, public, authenticated;
