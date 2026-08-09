CREATE TABLE IF NOT EXISTS public.wheel_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  op_number text NOT NULL,
  receipt_path text,
  amount_egp numeric NOT NULL DEFAULT 20,
  spins integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.wheel_purchases TO authenticated;
GRANT UPDATE ON public.wheel_purchases TO authenticated;
GRANT ALL ON public.wheel_purchases TO service_role;
ALTER TABLE public.wheel_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own or staff read wheel purchases" ON public.wheel_purchases
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "insert own wheel purchase" ON public.wheel_purchases
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff update wheel purchases" ON public.wheel_purchases
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TRIGGER wheel_purchases_touch BEFORE UPDATE ON public.wheel_purchases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.wheel_extra_spins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  spins integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wheel_extra_spins TO authenticated;
GRANT ALL ON public.wheel_extra_spins TO service_role;
ALTER TABLE public.wheel_extra_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own or staff read extra spins" ON public.wheel_extra_spins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TRIGGER wheel_extra_spins_touch BEFORE UPDATE ON public.wheel_extra_spins
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.approve_wheel_purchase(_id uuid, _approve boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _target uuid; _spins int; _status text;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'admin') OR public.has_role(_uid,'moderator')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT user_id, spins, status INTO _target, _spins, _status
    FROM public.wheel_purchases WHERE id = _id FOR UPDATE;
  IF _target IS NULL THEN RAISE EXCEPTION 'purchase not found'; END IF;
  IF _status <> 'pending' THEN RAISE EXCEPTION 'already processed'; END IF;

  UPDATE public.wheel_purchases
    SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
        reviewed_by = _uid, reviewed_at = now()
    WHERE id = _id;

  IF _approve THEN
    INSERT INTO public.wheel_extra_spins (user_id, spins) VALUES (_target, _spins)
      ON CONFLICT (user_id) DO UPDATE SET spins = public.wheel_extra_spins.spins + _spins, updated_at = now();
    INSERT INTO public.notifications (user_id, title, body, link)
      VALUES (_target, 'تمت الموافقة على شراء لفّات الحظ', 'تم إضافة ' || _spins || ' لفّة لحسابك 🎡', '/wheel');
  END IF;
END; $$;

REVOKE EXECUTE ON FUNCTION public.approve_wheel_purchase(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.approve_wheel_purchase(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.spin_wheel()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _last timestamptz;
  _extra int := 0;
  _used_extra boolean := false;
  _r numeric;
  _kind text;
  _amount numeric := 0;
  _spin uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT max(created_at) INTO _last FROM public.wheel_spins WHERE user_id = _uid;

  IF _last IS NOT NULL AND _last > now() - interval '7 days' THEN
    SELECT spins INTO _extra FROM public.wheel_extra_spins WHERE user_id = _uid FOR UPDATE;
    IF coalesce(_extra,0) > 0 THEN
      UPDATE public.wheel_extra_spins SET spins = spins - 1, updated_at = now() WHERE user_id = _uid;
      _used_extra := true;
    ELSE
      RAISE EXCEPTION 'weekly_limit:%', (_last + interval '7 days');
    END IF;
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

  RETURN jsonb_build_object('spin_id', _spin, 'kind', _kind, 'amount', _amount, 'used_extra', _used_extra);
END; $$;

REVOKE EXECUTE ON FUNCTION public.spin_wheel() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.spin_wheel() TO authenticated;