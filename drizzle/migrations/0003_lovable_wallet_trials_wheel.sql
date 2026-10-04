CREATE TABLE public.lv_wallets (
  user_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0,
  welcome_claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lv_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lv_feature_passes (
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, feature_key)
);
CREATE TABLE public.lv_free_trials (
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature_key)
);
CREATE TABLE public.lv_wheel_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prize_kind text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  used_extra boolean NOT NULL DEFAULT false,
  card_status text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lv_wheel_extra (
  user_id uuid PRIMARY KEY,
  spins integer NOT NULL DEFAULT 0
);

GRANT ALL ON public.lv_wallets, public.lv_transactions, public.lv_feature_passes, public.lv_free_trials, public.lv_wheel_spins, public.lv_wheel_extra TO service_role;
ALTER TABLE public.lv_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lv_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lv_feature_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lv_free_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lv_wheel_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lv_wheel_extra ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.lv_ensure_wallet(_uid uuid, _initial integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b integer;
BEGIN
  INSERT INTO lv_wallets (user_id, balance) VALUES (_uid, greatest(coalesce(_initial,0),0))
  ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO _b FROM lv_wallets WHERE user_id = _uid;
  RETURN _b;
END $$;

CREATE OR REPLACE FUNCTION public.lv_unlock(_uid uuid, _key text, _hours integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cost integer; _bal integer; _exp timestamptz; _dur interval;
BEGIN
  IF _key IN ('ai_chat','keys','art4k','dubbing','draw2d') THEN
    IF _hours IS NULL OR _hours < 1 THEN RAISE EXCEPTION 'invalid_hours'; END IF;
    _cost := 30 * _hours; _dur := make_interval(hours => _hours);
  ELSIF _key = 'world_cup' THEN
    _cost := 10; _dur := interval '30 days';
  ELSE RAISE EXCEPTION 'unknown_feature'; END IF;

  SELECT balance INTO _bal FROM lv_wallets WHERE user_id = _uid FOR UPDATE;
  IF coalesce(_bal,0) < _cost THEN RAISE EXCEPTION 'insufficient_credits'; END IF;
  UPDATE lv_wallets SET balance = balance - _cost, updated_at = now() WHERE user_id = _uid;
  INSERT INTO lv_transactions (user_id, amount, reason) VALUES (_uid, -_cost, 'unlock:' || _key);

  SELECT expires_at INTO _exp FROM lv_feature_passes WHERE user_id = _uid AND feature_key = _key;
  _exp := greatest(coalesce(_exp, now()), now()) + _dur;
  INSERT INTO lv_feature_passes VALUES (_uid, _key, _exp)
  ON CONFLICT (user_id, feature_key) DO UPDATE SET expires_at = _exp;
  RETURN jsonb_build_object('expires_at', _exp, 'charged', _cost, 'balance', _bal - _cost);
END $$;

CREATE OR REPLACE FUNCTION public.lv_free_trial(_uid uuid, _key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _exp timestamptz;
BEGIN
  IF _key NOT IN ('ai_chat','keys','art4k','dubbing','draw2d','world_cup') THEN RAISE EXCEPTION 'unknown_feature'; END IF;
  INSERT INTO lv_free_trials (user_id, feature_key) VALUES (_uid, _key)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RAISE EXCEPTION 'trial_used'; END IF;
  SELECT expires_at INTO _exp FROM lv_feature_passes WHERE user_id = _uid AND feature_key = _key;
  _exp := greatest(coalesce(_exp, now()), now()) + interval '1 hour';
  INSERT INTO lv_feature_passes VALUES (_uid, _key, _exp)
  ON CONFLICT (user_id, feature_key) DO UPDATE SET expires_at = _exp;
  RETURN jsonb_build_object('expires_at', _exp);
END $$;

CREATE OR REPLACE FUNCTION public.lv_claim_welcome(_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b integer;
BEGIN
  UPDATE lv_wallets SET balance = balance + 25, welcome_claimed = true, updated_at = now()
   WHERE user_id = _uid AND NOT welcome_claimed RETURNING balance INTO _b;
  IF _b IS NULL THEN RAISE EXCEPTION 'already_claimed'; END IF;
  INSERT INTO lv_transactions (user_id, amount, reason) VALUES (_uid, 25, 'welcome_bonus');
  RETURN jsonb_build_object('balance', _b);
END $$;

CREATE OR REPLACE FUNCTION public.lv_spin(_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r double precision := random(); _kind text := 'credits'; _amt integer; _extra boolean := false; _id uuid;
BEGIN
  PERFORM 1 FROM lv_wallets WHERE user_id = _uid FOR UPDATE;
  IF EXISTS (SELECT 1 FROM lv_wheel_spins WHERE user_id = _uid AND NOT used_extra AND created_at > now() - interval '7 days') THEN
    UPDATE lv_wheel_extra SET spins = spins - 1 WHERE user_id = _uid AND spins > 0;
    IF NOT FOUND THEN RAISE EXCEPTION 'weekly_limit'; END IF;
    _extra := true;
  END IF;
  IF _r < 0.02 THEN _kind := 'cash_card_5'; _amt := 0;
  ELSIF _r < 0.12 THEN _amt := 100;
  ELSIF _r < 0.40 THEN _amt := 50;
  ELSE _amt := 25; END IF;
  INSERT INTO lv_wheel_spins (user_id, prize_kind, amount, used_extra) VALUES (_uid, _kind, _amt, _extra) RETURNING id INTO _id;
  IF _amt > 0 THEN
    UPDATE lv_wallets SET balance = balance + _amt, updated_at = now() WHERE user_id = _uid;
    INSERT INTO lv_transactions (user_id, amount, reason) VALUES (_uid, _amt, 'wheel');
  END IF;
  RETURN jsonb_build_object('spin_id', _id, 'kind', _kind, 'amount', _amt, 'used_extra', _extra);
END $$;

CREATE OR REPLACE FUNCTION public.lv_card_action(_uid uuid, _spin uuid, _action text, _phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE lv_wheel_spins SET card_status = _action, phone = _phone
   WHERE id = _spin AND user_id = _uid AND prize_kind = 'cash_card_5' AND card_status IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_card'; END IF;
  IF _action = 'converted' THEN
    UPDATE lv_wallets SET balance = balance + 50, updated_at = now() WHERE user_id = _uid;
    INSERT INTO lv_transactions (user_id, amount, reason) VALUES (_uid, 50, 'wheel_card_convert');
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.lv_ensure_wallet(uuid, integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.lv_unlock(uuid, text, integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.lv_free_trial(uuid, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.lv_claim_welcome(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.lv_spin(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.lv_card_action(uuid, uuid, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lv_ensure_wallet(uuid, integer), public.lv_unlock(uuid, text, integer), public.lv_free_trial(uuid, text), public.lv_claim_welcome(uuid), public.lv_spin(uuid), public.lv_card_action(uuid, uuid, text, text) TO service_role;