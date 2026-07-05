
CREATE TYPE public.anime_media_kind AS ENUM ('anime_video', 'anime_movie');

CREATE TABLE public.anime_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.anime_media_kind NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  video_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration_seconds INT NOT NULL DEFAULT 0,
  price_credits INT NOT NULL,
  purchases_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anime_media TO authenticated;
GRANT SELECT ON public.anime_media TO anon;
GRANT ALL ON public.anime_media TO service_role;

ALTER TABLE public.anime_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can view anime media listings"
  ON public.anime_media FOR SELECT
  USING (true);

CREATE POLICY "owners can insert their own media"
  ON public.anime_media FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owners can update their own media"
  ON public.anime_media FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "owners can delete their own media"
  ON public.anime_media FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_anime_media_updated
  BEFORE UPDATE ON public.anime_media
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.anime_media_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES public.anime_media(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_credits INT NOT NULL,
  seller_credits INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (media_id, buyer_id)
);

GRANT SELECT, INSERT ON public.anime_media_purchases TO authenticated;
GRANT ALL ON public.anime_media_purchases TO service_role;

ALTER TABLE public.anime_media_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer or seller can view their purchases"
  ON public.anime_media_purchases FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Purchase RPC: deduct credits from buyer, give 80% to seller
CREATE OR REPLACE FUNCTION public.purchase_anime_media(_media_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _seller UUID;
  _price INT;
  _seller_share INT;
  _bal NUMERIC;
  _kind public.anime_media_kind;
  _pid UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT user_id, price_credits, kind INTO _seller, _price, _kind
    FROM public.anime_media WHERE id = _media_id;
  IF _seller IS NULL THEN RAISE EXCEPTION 'media not found'; END IF;
  IF _seller = _uid THEN RAISE EXCEPTION 'cannot buy own media'; END IF;

  -- already purchased? return existing
  SELECT id INTO _pid FROM public.anime_media_purchases
    WHERE media_id = _media_id AND buyer_id = _uid;
  IF _pid IS NOT NULL THEN RETURN _pid; END IF;

  SELECT balance INTO _bal FROM public.credits WHERE user_id = _uid FOR UPDATE;
  IF coalesce(_bal, 0) < _price THEN RAISE EXCEPTION 'insufficient credits'; END IF;

  _seller_share := floor(_price * 0.8)::int;

  UPDATE public.credits SET balance = balance - _price, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (_uid, -_price, 'spend', 'anime_media_purchase:' || _media_id);

  INSERT INTO public.credits (user_id, balance) VALUES (_seller, _seller_share)
    ON CONFLICT (user_id) DO UPDATE SET balance = public.credits.balance + _seller_share, updated_at = now();
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (_seller, _seller_share, 'earn', 'anime_media_sale:' || _media_id);

  INSERT INTO public.anime_media_purchases (media_id, buyer_id, seller_id, price_credits, seller_credits)
    VALUES (_media_id, _uid, _seller, _price, _seller_share)
    RETURNING id INTO _pid;

  UPDATE public.anime_media SET purchases_count = purchases_count + 1 WHERE id = _media_id;
  RETURN _pid;
END; $$;

-- Secure video path resolver
CREATE OR REPLACE FUNCTION public.get_anime_media_video_path(_media_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _owner UUID;
  _path TEXT;
  _bought BOOLEAN;
BEGIN
  IF _uid IS NULL THEN RETURN NULL; END IF;
  SELECT user_id, video_path INTO _owner, _path FROM public.anime_media WHERE id = _media_id;
  IF _owner IS NULL THEN RETURN NULL; END IF;
  IF _owner = _uid OR public.has_role(_uid, 'admin') THEN RETURN _path; END IF;
  SELECT EXISTS(SELECT 1 FROM public.anime_media_purchases
    WHERE media_id = _media_id AND buyer_id = _uid) INTO _bought;
  IF _bought THEN RETURN _path; END IF;
  RETURN NULL;
END; $$;
