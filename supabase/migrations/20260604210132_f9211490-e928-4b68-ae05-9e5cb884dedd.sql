
-- Restore full column SELECT for authenticated (admin dashboard etc.)
GRANT SELECT ON public.shorts TO authenticated;
-- Anon stays restricted (no vodafone_phone exposure to the public)
-- (anon already restricted by previous migration's column grant)
