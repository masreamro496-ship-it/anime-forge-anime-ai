
CREATE TABLE public.chat_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  content TEXT,
  media_path TEXT,
  media_type TEXT CHECK (media_type IN ('image','audio','file')),
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_moderator BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 hours')
);
CREATE INDEX chat_room_messages_created_idx ON public.chat_room_messages (created_at DESC);
CREATE INDEX chat_room_messages_expires_idx ON public.chat_room_messages (expires_at);
GRANT SELECT ON public.chat_room_messages TO anon;
GRANT SELECT, INSERT, DELETE ON public.chat_room_messages TO authenticated;
GRANT ALL ON public.chat_room_messages TO service_role;
ALTER TABLE public.chat_room_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read fresh chat" ON public.chat_room_messages FOR SELECT TO anon, authenticated USING (expires_at > now());
CREATE POLICY "insert own chat" ON public.chat_room_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own or mod chat" ON public.chat_room_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_room_messages;

CREATE OR REPLACE FUNCTION public.purge_expired_chat()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $fn$
  DELETE FROM public.chat_room_messages WHERE expires_at < now();
$fn$;

DO $blk$
BEGIN
  PERFORM cron.schedule('purge-chat-room', '*/15 * * * *', 'SELECT public.purge_expired_chat();');
EXCEPTION WHEN OTHERS THEN NULL;
END $blk$;

CREATE OR REPLACE FUNCTION public.promote_to_moderator(_email TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE _uid UUID := auth.uid(); _target UUID;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT id INTO _target FROM auth.users WHERE email = lower(trim(_email)) LIMIT 1;
  IF _target IS NULL THEN RAISE EXCEPTION 'user not found: %', _email; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_target, 'moderator') ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (_target, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  RETURN _target::TEXT;
END; $fn$;

CREATE OR REPLACE FUNCTION public.demote_moderator(_email TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE _uid UUID := auth.uid(); _target UUID;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT id INTO _target FROM auth.users WHERE email = lower(trim(_email)) LIMIT 1;
  IF _target IS NULL THEN RAISE EXCEPTION 'user not found: %', _email; END IF;
  IF lower(trim(_email)) = 'khalidassdapdop@gmail.com' THEN RAISE EXCEPTION 'cannot demote super admin'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _target AND role IN ('moderator','admin');
  RETURN _target::TEXT;
END; $fn$;

CREATE POLICY "chat-media upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "chat-media read auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-media');
CREATE POLICY "chat-media read anon" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'chat-media');
CREATE POLICY "chat-media delete own or mod" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  ));
