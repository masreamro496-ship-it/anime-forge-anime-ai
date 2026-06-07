
-- 1) Restrict vodafone_phone column from being read by anon/authenticated.
REVOKE SELECT (vodafone_phone) ON public.shorts FROM anon;
REVOKE SELECT (vodafone_phone) ON public.shorts FROM authenticated;
-- service_role keeps full access; request_purchase() (SECURITY DEFINER) returns it to approved buyers.

-- 2) Storage policies for shorts bucket: owner / admin / approved buyer can read video objects.
DROP POLICY IF EXISTS "shorts storage: owner read" ON storage.objects;
DROP POLICY IF EXISTS "shorts storage: admin read" ON storage.objects;
DROP POLICY IF EXISTS "shorts storage: buyer read" ON storage.objects;

CREATE POLICY "shorts storage: owner read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'shorts'
    AND EXISTS (
      SELECT 1 FROM public.shorts s
      WHERE s.video_path = storage.objects.name
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "shorts storage: admin read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'shorts'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "shorts storage: buyer read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'shorts'
    AND EXISTS (
      SELECT 1
      FROM public.shorts s
      JOIN public.project_purchases p ON p.project_id = s.id
      WHERE s.video_path = storage.objects.name
        AND p.buyer_id = auth.uid()
        AND p.status = 'approved'::public.purchase_status
    )
  );
