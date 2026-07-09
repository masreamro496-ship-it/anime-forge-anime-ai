
CREATE TABLE public.wc_pvp_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  winner_team TEXT,
  score_a INT NOT NULL DEFAULT 0,
  score_b INT NOT NULL DEFAULT 0,
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.wc_pvp_matches TO authenticated;
GRANT ALL ON public.wc_pvp_matches TO service_role;
ALTER TABLE public.wc_pvp_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authed can read matches" ON public.wc_pvp_matches
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.wc_pay_entry(_room_id TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _cost int := 50; _bal numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT balance INTO _bal FROM public.credits WHERE user_id = _uid FOR UPDATE;
  IF coalesce(_bal,0) < _cost THEN RAISE EXCEPTION 'insufficient credits'; END IF;
  UPDATE public.credits SET balance = balance - _cost, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (_uid, -_cost, 'spend', 'wc_pvp_entry:' || _room_id);
END; $$;

CREATE OR REPLACE FUNCTION public.wc_refund_entry(_room_id TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _amt int := 50;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  -- refund only if we actually charged for this room and haven't refunded yet
  IF NOT EXISTS(SELECT 1 FROM public.credit_transactions
    WHERE user_id = _uid AND description = 'wc_pvp_entry:' || _room_id) THEN RETURN; END IF;
  IF EXISTS(SELECT 1 FROM public.credit_transactions
    WHERE user_id = _uid AND description = 'wc_pvp_refund:' || _room_id) THEN RETURN; END IF;
  INSERT INTO public.credits (user_id, balance) VALUES (_uid, _amt)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.credits.balance + _amt, updated_at = now();
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (_uid, _amt, 'refund', 'wc_pvp_refund:' || _room_id);
END; $$;

CREATE OR REPLACE FUNCTION public.wc_finish_match(
  _room_id TEXT, _winner_team TEXT, _score_a INT, _score_b INT,
  _winners UUID[], _players JSONB
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _w uuid; _reward int := 80;
BEGIN
  -- idempotent per room
  IF EXISTS(SELECT 1 FROM public.wc_pvp_matches WHERE room_id = _room_id) THEN RETURN; END IF;
  INSERT INTO public.wc_pvp_matches(room_id, winner_team, score_a, score_b, players, finished_at)
    VALUES (_room_id, _winner_team, _score_a, _score_b, _players, now());
  IF _winners IS NULL THEN RETURN; END IF;
  FOREACH _w IN ARRAY _winners LOOP
    INSERT INTO public.credits (user_id, balance) VALUES (_w, _reward)
      ON CONFLICT (user_id) DO UPDATE SET balance = public.credits.balance + _reward, updated_at = now();
    INSERT INTO public.credit_transactions(user_id, amount, kind, description)
      VALUES (_w, _reward, 'earn', 'wc_pvp_win:' || _room_id);
  END LOOP;
END; $$;
