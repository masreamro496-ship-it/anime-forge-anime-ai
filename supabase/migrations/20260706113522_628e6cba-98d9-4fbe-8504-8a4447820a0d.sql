
-- ============= Site locks =============
CREATE TABLE public.site_locks (
  slug TEXT PRIMARY KEY,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  message TEXT,
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_locks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_locks TO authenticated;
GRANT ALL ON public.site_locks TO service_role;

ALTER TABLE public.site_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_locks read all" ON public.site_locks FOR SELECT USING (true);
CREATE POLICY "site_locks admin write" ON public.site_locks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed known slugs
INSERT INTO public.site_locks (slug, is_locked) VALUES
  ('anime-market', false),
  ('shorts', false),
  ('pro-upgrade', false),
  ('chat', false),
  ('audio', false),
  ('watermark', false),
  ('generate-video', false),
  ('generate-goku', false),
  ('world-cup', false),
  ('free-shorts', false)
ON CONFLICT (slug) DO NOTHING;

-- ============= World Cup matches =============
CREATE TABLE public.wc_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  match_time TIMESTAMPTZ,
  reward_credits INT NOT NULL DEFAULT 10,
  result_a INT,
  result_b INT,
  status TEXT NOT NULL DEFAULT 'open', -- open | finished
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

GRANT SELECT ON public.wc_matches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.wc_matches TO authenticated;
GRANT ALL ON public.wc_matches TO service_role;

ALTER TABLE public.wc_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wc_matches read all" ON public.wc_matches FOR SELECT USING (true);
CREATE POLICY "wc_matches admin write" ON public.wc_matches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============= Predictions =============
CREATE TABLE public.wc_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.wc_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guess_a INT NOT NULL,
  guess_b INT NOT NULL,
  awarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);

GRANT SELECT, INSERT ON public.wc_predictions TO authenticated;
GRANT ALL ON public.wc_predictions TO service_role;

ALTER TABLE public.wc_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wc_pred own read" ON public.wc_predictions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "wc_pred own insert" ON public.wc_predictions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Set match result (admin) and award correct guessers
CREATE OR REPLACE FUNCTION public.admin_set_wc_result(_match_id UUID, _result_a INT, _result_b INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _reward INT;
  _winner_count INT := 0;
  _p RECORD;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid,'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT reward_credits INTO _reward FROM public.wc_matches WHERE id = _match_id FOR UPDATE;
  IF _reward IS NULL THEN RAISE EXCEPTION 'match not found'; END IF;

  UPDATE public.wc_matches
    SET result_a = _result_a, result_b = _result_b,
        status = 'finished', finished_at = now()
    WHERE id = _match_id;

  FOR _p IN
    SELECT * FROM public.wc_predictions
    WHERE match_id = _match_id AND awarded = false
      AND guess_a = _result_a AND guess_b = _result_b
  LOOP
    INSERT INTO public.credits (user_id, balance) VALUES (_p.user_id, _reward)
      ON CONFLICT (user_id) DO UPDATE
      SET balance = public.credits.balance + _reward, updated_at = now();
    INSERT INTO public.credit_transactions (user_id, amount, kind, description)
      VALUES (_p.user_id, _reward, 'gift', 'wc_prediction:' || _match_id);
    UPDATE public.wc_predictions SET awarded = true WHERE id = _p.id;
    _winner_count := _winner_count + 1;
  END LOOP;

  RETURN _winner_count;
END $$;
