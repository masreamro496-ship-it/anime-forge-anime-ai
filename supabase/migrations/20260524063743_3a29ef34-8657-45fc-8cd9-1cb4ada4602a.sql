-- 1. Add kind to shorts
ALTER TABLE public.shorts ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'project';

-- 2. Free 30s shorts RPC
CREATE OR REPLACE FUNCTION public.create_free_short(
  _title text, _description text, _video_path text,
  _thumbnail_path text, _duration_seconds integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _new_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF coalesce(_duration_seconds,0) > 30 THEN RAISE EXCEPTION 'free short max 30 seconds'; END IF;
  IF length(coalesce(_video_path,'')) < 1 THEN RAISE EXCEPTION 'video_path required'; END IF;
  INSERT INTO public.shorts (
    user_id, title, description, video_path, thumbnail_path,
    duration_seconds, status, scheduled_publish_at, published_at,
    price_usd, vodafone_phone, kind
  ) VALUES (
    _uid, left(coalesce(_title,''),100), left(coalesce(_description,''),500),
    _video_path, _thumbnail_path, coalesce(_duration_seconds,0),
    'published'::public.short_status, now(), now(),
    0, '', 'free_short'
  ) RETURNING id INTO _new_id;
  RETURN _new_id;
END; $$;

-- 3. Audio clips (admin uploads)
CREATE TABLE IF NOT EXISTS public.audio_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  audio_url text NOT NULL,
  duration_seconds integer,
  download_cost integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audio_clips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audio: public read" ON public.audio_clips;
CREATE POLICY "audio: public read" ON public.audio_clips FOR SELECT USING (true);
DROP POLICY IF EXISTS "audio: admin write" ON public.audio_clips;
CREATE POLICY "audio: admin write" ON public.audio_clips FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 4. Audio downloads ledger
CREATE TABLE IF NOT EXISTS public.audio_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clip_id uuid NOT NULL REFERENCES public.audio_clips(id) ON DELETE CASCADE,
  cost integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audio_downloads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audio_dl: self read" ON public.audio_downloads;
CREATE POLICY "audio_dl: self read" ON public.audio_downloads FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "audio_dl: admin read" ON public.audio_downloads;
CREATE POLICY "audio_dl: admin read" ON public.audio_downloads FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 5. Buy audio download (5 credits)
CREATE OR REPLACE FUNCTION public.purchase_audio_download(_clip_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _cost int; _url text; _bal numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT download_cost, audio_url INTO _cost, _url FROM public.audio_clips WHERE id = _clip_id;
  IF _url IS NULL THEN RAISE EXCEPTION 'audio not found'; END IF;
  SELECT balance INTO _bal FROM public.credits WHERE user_id = _uid FOR UPDATE;
  IF coalesce(_bal,0) < _cost THEN RAISE EXCEPTION 'insufficient credits'; END IF;
  UPDATE public.credits SET balance = balance - _cost, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (_uid, -_cost, 'spend', 'audio_download:' || _clip_id);
  INSERT INTO public.audio_downloads (user_id, clip_id, cost) VALUES (_uid, _clip_id, _cost);
  RETURN _url;
END; $$;

-- 6. Watermark jobs (PRIVATE to user — no admin policy)
CREATE TABLE IF NOT EXISTS public.watermark_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_url text NOT NULL,
  processed_url text NOT NULL,
  duration_seconds integer,
  cost integer NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.watermark_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wm: self read" ON public.watermark_jobs;
CREATE POLICY "wm: self read" ON public.watermark_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wm: self insert" ON public.watermark_jobs;
CREATE POLICY "wm: self insert" ON public.watermark_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 7. Spend watermark credits (15)
CREATE OR REPLACE FUNCTION public.spend_watermark_credits(
  _source_url text, _processed_url text, _duration_seconds integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _cost int := 15; _bal numeric; _new_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF coalesce(_duration_seconds,0) > 30 THEN RAISE EXCEPTION 'max 30 seconds'; END IF;
  SELECT balance INTO _bal FROM public.credits WHERE user_id = _uid FOR UPDATE;
  IF coalesce(_bal,0) < _cost THEN RAISE EXCEPTION 'insufficient credits'; END IF;
  UPDATE public.credits SET balance = balance - _cost, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (_uid, -_cost, 'spend', 'watermark_removal');
  INSERT INTO public.watermark_jobs (user_id, source_url, processed_url, duration_seconds, cost)
    VALUES (_uid, _source_url, _processed_url, _duration_seconds, _cost)
    RETURNING id INTO _new_id;
  RETURN _new_id;
END; $$;

-- 8. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif: self read" ON public.notifications;
CREATE POLICY "notif: self read" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif: self update" ON public.notifications;
CREATE POLICY "notif: self update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif: admin write" ON public.notifications;
CREATE POLICY "notif: admin write" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR auth.uid() = user_id);