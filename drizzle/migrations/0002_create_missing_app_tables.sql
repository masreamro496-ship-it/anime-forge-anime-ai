-- profiles.credits (used by graphic design market)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;

-- ===== anime episodes =====
CREATE TABLE IF NOT EXISTS public.anime_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_title TEXT NOT NULL,
  anime_slug TEXT NOT NULL,
  episode_number INTEGER NOT NULL,
  embed_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (anime_slug, episode_number)
);
GRANT SELECT ON public.anime_episodes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anime_episodes TO authenticated;
GRANT ALL ON public.anime_episodes TO service_role;
ALTER TABLE public.anime_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anime_episodes readable" ON public.anime_episodes FOR SELECT USING (true);
CREATE POLICY "anime_episodes admin write" ON public.anime_episodes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== user AI models (LoRA) =====
CREATE TABLE IF NOT EXISTS public.user_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'training',
  images TEXT[] NOT NULL DEFAULT '{}',
  model_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_models TO authenticated;
GRANT ALL ON public.user_models TO service_role;
ALTER TABLE public.user_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own models" ON public.user_models FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== donations =====
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  donor_name TEXT,
  amount_egp NUMERIC NOT NULL DEFAULT 0,
  op_number TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "donations own insert" ON public.donations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "donations own select" ON public.donations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "donations admin update" ON public.donations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== graphic design =====
CREATE TABLE IF NOT EXISTS public.gd_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'تصميم بدون عنوان',
  canvas_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  width INTEGER NOT NULL DEFAULT 1080,
  height INTEGER NOT NULL DEFAULT 1080,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gd_projects TO authenticated;
GRANT ALL ON public.gd_projects TO service_role;
ALTER TABLE public.gd_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gd_projects own" ON public.gd_projects FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.gd_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.gd_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  listing_type TEXT NOT NULL DEFAULT 'file',
  license TEXT NOT NULL DEFAULT 'personal',
  price_usd NUMERIC NOT NULL DEFAULT 0,
  file_path TEXT,
  preview_image_url TEXT,
  downloads_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gd_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gd_listings TO authenticated;
GRANT ALL ON public.gd_listings TO service_role;
ALTER TABLE public.gd_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gd_listings approved readable" ON public.gd_listings FOR SELECT USING (status = 'approved');
CREATE POLICY "gd_listings owner manage" ON public.gd_listings FOR ALL TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.gd_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.gd_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_usd NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'credit',
  status TEXT NOT NULL DEFAULT 'pending',
  copied_project_id UUID REFERENCES public.gd_projects(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gd_purchases TO authenticated;
GRANT ALL ON public.gd_purchases TO service_role;
ALTER TABLE public.gd_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gd_purchases party select" ON public.gd_purchases FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "gd_purchases buyer insert" ON public.gd_purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "gd_purchases party update" ON public.gd_purchases FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.gd_vodafone_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.gd_purchases(id) ON DELETE CASCADE,
  buyer_phone TEXT NOT NULL,
  amount_egp NUMERIC NOT NULL DEFAULT 0,
  buyer_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending_seller_or_admin',
  approved_by UUID,
  approved_by_role TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gd_vodafone_payments TO authenticated;
GRANT ALL ON public.gd_vodafone_payments TO service_role;
ALTER TABLE public.gd_vodafone_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gd_vf select" ON public.gd_vodafone_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gd_purchases p WHERE p.id = purchase_id AND (p.buyer_id = auth.uid() OR p.seller_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "gd_vf insert" ON public.gd_vodafone_payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.gd_purchases p WHERE p.id = purchase_id AND p.buyer_id = auth.uid()));
CREATE POLICY "gd_vf update" ON public.gd_vodafone_payments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gd_purchases p WHERE p.id = purchase_id AND p.seller_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.gd_purchases p WHERE p.id = purchase_id AND p.seller_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.gd_feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gd_feed_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gd_feed_posts TO authenticated;
GRANT ALL ON public.gd_feed_posts TO service_role;
ALTER TABLE public.gd_feed_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gd_feed readable" ON public.gd_feed_posts FOR SELECT USING (true);
CREATE POLICY "gd_feed owner insert" ON public.gd_feed_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "gd_feed like update" ON public.gd_feed_posts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "gd_feed owner delete" ON public.gd_feed_posts FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.gd_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  designer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, designer_id)
);
GRANT SELECT ON public.gd_follows TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gd_follows TO authenticated;
GRANT ALL ON public.gd_follows TO service_role;
ALTER TABLE public.gd_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gd_follows readable" ON public.gd_follows FOR SELECT USING (true);
CREATE POLICY "gd_follows own insert" ON public.gd_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "gd_follows own delete" ON public.gd_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- ===== RPCs =====
CREATE OR REPLACE FUNCTION public.gd_publish_listing(
  p_owner_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_listing_type TEXT,
  p_project_id UUID,
  p_file_path TEXT,
  p_preview_image_url TEXT,
  p_license TEXT,
  p_price_usd NUMERIC,
  p_publish_cost_credits INTEGER
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits INTEGER;
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_owner_id THEN
    RAISE EXCEPTION 'غير مسموح';
  END IF;

  SELECT credits INTO v_credits FROM public.profiles WHERE id = p_owner_id FOR UPDATE;
  IF v_credits IS NULL OR v_credits < p_publish_cost_credits THEN
    RAISE EXCEPTION 'رصيد الكريدت غير كافٍ';
  END IF;

  UPDATE public.profiles SET credits = credits - p_publish_cost_credits WHERE id = p_owner_id;

  INSERT INTO public.gd_listings (owner_id, project_id, title, description, listing_type, license, price_usd, file_path, preview_image_url, status)
  VALUES (p_owner_id, p_project_id, p_title, p_description, p_listing_type, p_license, p_price_usd, p_file_path, p_preview_image_url, 'pending')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.gd_publish_listing(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.gd_copy_template_to_buyer(p_purchase_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase public.gd_purchases;
  v_listing public.gd_listings;
  v_new_id UUID;
BEGIN
  SELECT * INTO v_purchase FROM public.gd_purchases WHERE id = p_purchase_id;
  IF v_purchase.id IS NULL OR v_purchase.buyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'غير مسموح';
  END IF;

  SELECT * INTO v_listing FROM public.gd_listings WHERE id = v_purchase.listing_id;
  IF v_listing.project_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.gd_projects (owner_id, title, canvas_json, width, height, thumbnail_url)
  SELECT v_purchase.buyer_id, title, canvas_json, width, height, thumbnail_url
  FROM public.gd_projects WHERE id = v_listing.project_id
  RETURNING id INTO v_new_id;

  UPDATE public.gd_purchases SET copied_project_id = v_new_id WHERE id = p_purchase_id;
  UPDATE public.gd_listings SET downloads_count = downloads_count + 1 WHERE id = v_listing.id;

  RETURN v_new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.gd_copy_template_to_buyer(UUID) TO authenticated;