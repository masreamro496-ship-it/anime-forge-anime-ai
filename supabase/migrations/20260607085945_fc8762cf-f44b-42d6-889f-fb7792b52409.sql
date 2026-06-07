
ALTER TABLE public.generation_requests
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_task_id text;

CREATE OR REPLACE FUNCTION public.submit_novita_video(
  _prompt text,
  _start_image text,
  _end_image text,
  _duration int,
  _provider_task_id text,
  _status text,
  _admin_notes text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_id uuid;
  _admin record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  INSERT INTO public.generation_requests (
    user_id, type, prompt, start_image_url, end_image_url, duration_seconds,
    credits_charged, status, provider, provider_task_id, admin_notes
  ) VALUES (
    _uid, 'video'::gen_type, left(coalesce(_prompt,''), 4000),
    _start_image, _end_image, coalesce(_duration, 5),
    25, _status::gen_status, 'novita', _provider_task_id, _admin_notes
  ) RETURNING id INTO _new_id;

  IF _status = 'failed' THEN
    FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, body, link)
      VALUES (
        _admin.user_id,
        'فشل طلب فيديو AI',
        coalesce(_admin_notes, 'فشل استدعاء Novita') || ' (طلب ' || _new_id::text || ')',
        '/admin'
      );
    END LOOP;
  END IF;

  RETURN _new_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.submit_novita_video(text,text,text,int,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_novita_video(text,text,text,int,text,text,text) TO authenticated;
