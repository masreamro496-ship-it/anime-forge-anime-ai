
-- 1) Hide vodafone_phone via column-level grants on public.shorts
REVOKE SELECT ON public.shorts FROM anon, authenticated;
GRANT SELECT (
  id, user_id, title, description, video_path, thumbnail_path,
  duration_seconds, status, scheduled_publish_at, published_at,
  views_count, likes_count, comments_count, created_at, updated_at,
  price_usd, kind
) ON public.shorts TO anon, authenticated;
-- service_role keeps full access (admin operations, edge fns)
GRANT ALL ON public.shorts TO service_role;

-- 2) Recreate shorts_public view with security_invoker
DROP VIEW IF EXISTS public.shorts_public;
CREATE VIEW public.shorts_public
WITH (security_invoker = on) AS
  SELECT id, user_id, title, description, thumbnail_path,
         duration_seconds, price_usd, status, published_at,
         views_count, likes_count, comments_count, created_at
  FROM public.shorts
  WHERE status IN ('published'::public.short_status, 'test_queue'::public.short_status);
GRANT SELECT ON public.shorts_public TO anon, authenticated;

-- 3) Restrict notifications inserts to admins only
DROP POLICY IF EXISTS "notif: admin write" ON public.notifications;
CREATE POLICY "notif: admin write" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) Revoke EXECUTE on SECURITY DEFINER functions from anon/public
REVOKE EXECUTE ON FUNCTION public.admin_grant_credits(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_purchase(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_project_video(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_daily_gift() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_free_short(text, text, text, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_project(text, text, text, text, integer, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_pro_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_project_video_path(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.promote_scheduled_shorts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purchase_audio_download(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_purchase(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.spend_chat_credits() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.spend_watermark_credits(text, text, integer) FROM PUBLIC, anon;

-- Re-grant to authenticated where end-users need access
GRANT EXECUTE ON FUNCTION public.admin_grant_credits(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_purchase(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_project_video(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_gift() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_free_short(text, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project(text, text, text, text, integer, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_pro_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_video_path(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_audio_download(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_purchase(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_chat_credits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_watermark_credits(text, text, integer) TO authenticated;

-- 5) Storage bucket listing restrictions
DROP POLICY IF EXISTS "shorts bucket: public read" ON storage.objects;
DROP POLICY IF EXISTS "gen-outputs: public read" ON storage.objects;
