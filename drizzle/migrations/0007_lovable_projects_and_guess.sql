CREATE TABLE public.lv_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  author_email text,
  title text NOT NULL,
  description text NOT NULL,
  price_usd numeric NOT NULL,
  wallet_type text NOT NULL,
  wallet_phone text NOT NULL,
  cover_url text,
  video_url text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lv_projects_created_idx ON public.lv_projects (created_at DESC);
CREATE TABLE public.lv_project_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.lv_projects(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  buyer_email text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, buyer_id)
);
CREATE TABLE public.lv_guess_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  anime text,
  image_url text NOT NULL,
  focus_x integer NOT NULL DEFAULT 50,
  focus_y integer NOT NULL DEFAULT 30,
  zoom integer NOT NULL DEFAULT 320,
  reward integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lv_guess_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  character_id uuid NOT NULL REFERENCES public.lv_guess_characters(id) ON DELETE CASCADE,
  answer text,
  is_correct boolean NOT NULL DEFAULT false,
  credits_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lv_guess_attempts_user_idx ON public.lv_guess_attempts (user_id, character_id, created_at DESC);

GRANT ALL ON public.lv_projects, public.lv_project_purchases, public.lv_guess_characters, public.lv_guess_attempts TO service_role;
ALTER TABLE public.lv_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lv_project_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lv_guess_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lv_guess_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.lv_submit_guess(_uid uuid, _character_id uuid, _answer text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c lv_guess_characters; _correct boolean; _reward integer := 0; _bal integer;
BEGIN
  SELECT * INTO _c FROM lv_guess_characters WHERE id = _character_id AND is_active;
  IF _c.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'character_not_found'); END IF;
  IF EXISTS (SELECT 1 FROM lv_guess_attempts WHERE user_id = _uid AND character_id = _character_id
             AND created_at > now() - interval '5 minutes') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_answered');
  END IF;
  _correct := lower(trim(coalesce(_answer, ''))) = lower(trim(_c.name));
  IF _correct THEN _reward := _c.reward; END IF;
  INSERT INTO lv_guess_attempts (user_id, character_id, answer, is_correct, credits_awarded)
    VALUES (_uid, _character_id, _answer, _correct, _reward);
  IF _reward > 0 THEN
    _bal := lv_adjust(_uid, _reward, 'guess:' || _character_id);
  ELSE
    SELECT balance INTO _bal FROM lv_wallets WHERE user_id = _uid;
  END IF;
  RETURN jsonb_build_object('ok', true, 'correct', _correct, 'awarded', _reward,
    'balance', coalesce(_bal, 0), 'name', _c.name, 'anime', _c.anime);
END $$;
REVOKE ALL ON FUNCTION public.lv_submit_guess(uuid, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lv_submit_guess(uuid, uuid, text) TO service_role;