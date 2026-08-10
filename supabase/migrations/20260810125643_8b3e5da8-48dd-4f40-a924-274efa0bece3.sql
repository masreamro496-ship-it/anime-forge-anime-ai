
CREATE TABLE IF NOT EXISTS public.feature_passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, feature_key)
);
GRANT SELECT ON public.feature_passes TO authenticated;
GRANT ALL ON public.feature_passes TO service_role;
ALTER TABLE public.feature_passes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own passes select" ON public.feature_passes FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.domain_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain_name text not null,
  target_url text not null,
  year_no int not null,
  credits_paid numeric not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.domain_requests TO authenticated;
GRANT ALL ON public.domain_requests TO service_role;
ALTER TABLE public.domain_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own domain requests" ON public.domain_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins view domain requests" ON public.domain_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "admins update domain requests" ON public.domain_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.unlock_feature(_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cost numeric;
  _dur interval;
  _bal numeric;
  _exp timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  CASE _key
    WHEN 'ai_chat'   THEN _cost := 25;  _dur := interval '2 hours';
    WHEN 'keys'      THEN _cost := 5;   _dur := interval '1 day';
    WHEN 'art4k'     THEN _cost := 50;  _dur := interval '5 hours';
    WHEN 'dubbing'   THEN _cost := 25;  _dur := interval '3 hours';
    WHEN 'draw2d'    THEN _cost := 250; _dur := interval '30 days';
    WHEN 'world_cup' THEN _cost := 10;  _dur := interval '30 days';
    ELSE RAISE EXCEPTION 'unknown feature';
  END CASE;

  SELECT expires_at INTO _exp FROM public.feature_passes
    WHERE user_id = _uid AND feature_key = _key;
  IF _exp IS NOT NULL AND _exp > now() THEN
    RETURN jsonb_build_object('ok', true, 'expires_at', _exp, 'charged', 0);
  END IF;

  SELECT balance INTO _bal FROM public.credits WHERE user_id = _uid FOR UPDATE;
  IF coalesce(_bal,0) < _cost THEN RAISE EXCEPTION 'insufficient credits'; END IF;

  UPDATE public.credits SET balance = balance - _cost, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (_uid, -_cost, 'spend', 'feature_access:' || _key);

  _exp := now() + _dur;
  INSERT INTO public.feature_passes (user_id, feature_key, expires_at)
    VALUES (_uid, _key, _exp)
    ON CONFLICT (user_id, feature_key) DO UPDATE SET expires_at = _exp, created_at = now();

  RETURN jsonb_build_object('ok', true, 'expires_at', _exp, 'charged', _cost);
END; $$;

REVOKE EXECUTE ON FUNCTION public.unlock_feature(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_feature(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_domain(_domain text, _url text, _year int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cost numeric;
  _bal numeric;
  _id uuid;
  _admin record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF length(trim(coalesce(_domain,''))) < 3 THEN RAISE EXCEPTION 'domain required'; END IF;
  IF length(trim(coalesce(_url,''))) < 5 THEN RAISE EXCEPTION 'url required'; END IF;
  IF _year = 1 THEN _cost := 1000;
  ELSIF _year = 2 THEN _cost := 1800;
  ELSE RAISE EXCEPTION 'invalid year'; END IF;

  SELECT balance INTO _bal FROM public.credits WHERE user_id = _uid FOR UPDATE;
  IF coalesce(_bal,0) < _cost THEN RAISE EXCEPTION 'insufficient credits'; END IF;

  UPDATE public.credits SET balance = balance - _cost, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (_uid, -_cost, 'spend', 'domain_request:' || trim(_domain));

  INSERT INTO public.domain_requests (user_id, domain_name, target_url, year_no, credits_paid)
    VALUES (_uid, trim(_domain), trim(_url), _year, _cost) RETURNING id INTO _id;

  FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (_admin.user_id, 'طلب دومين مستقل جديد',
      'الدومين: ' || trim(_domain) || ' • الرابط: ' || trim(_url) || ' • السنة: ' || _year::text, '/admin');
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'id', _id, 'charged', _cost);
END; $$;

REVOKE EXECUTE ON FUNCTION public.request_domain(text, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_domain(text, text, int) TO authenticated;
