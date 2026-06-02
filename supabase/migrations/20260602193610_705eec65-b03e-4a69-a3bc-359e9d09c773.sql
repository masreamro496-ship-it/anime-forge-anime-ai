CREATE OR REPLACE FUNCTION public.generate_pro_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _is_pro boolean;
  _code text;
  _exists boolean;
  _try int := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT coalesce(is_pro,false) INTO _is_pro FROM public.profiles WHERE id = _uid;
  IF NOT _is_pro THEN RAISE EXCEPTION 'PRO membership required'; END IF;

  LOOP
    _try := _try + 1;
    -- 9-digit numeric code, first digit 1-9
    _code := (floor(random()*9)+1)::int::text;
    FOR i IN 1..8 LOOP
      _code := _code || floor(random()*10)::int::text;
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.pro_codes WHERE code = _code) INTO _exists;
    EXIT WHEN NOT _exists OR _try > 10;
  END LOOP;

  INSERT INTO public.pro_codes (user_id, code, expires_at, uses_remaining)
    VALUES (_uid, _code, now() + interval '30 days', 2);
  RETURN _code;
END; $function$;

CREATE UNIQUE INDEX IF NOT EXISTS pro_codes_code_unique ON public.pro_codes(code);