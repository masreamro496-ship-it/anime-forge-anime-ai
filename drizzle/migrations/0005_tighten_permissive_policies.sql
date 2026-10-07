DROP POLICY IF EXISTS "gd_follows readable" ON public.gd_follows;
CREATE POLICY "gd_follows readable" ON public.gd_follows FOR SELECT TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = designer_id);

DROP POLICY IF EXISTS "gd_feed like update" ON public.gd_feed_posts;
CREATE POLICY "gd_feed like update" ON public.gd_feed_posts FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "likes: public read" ON public.shorts_likes;
CREATE POLICY "likes: public read" ON public.shorts_likes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "comments: public read" ON public.shorts_comments;
CREATE POLICY "comments: public read" ON public.shorts_comments FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "audio: public read" ON public.audio_clips;
CREATE POLICY "audio: public read" ON public.audio_clips FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "anyone can view anime media listings" ON public.anime_media;
CREATE POLICY "anyone can view anime media listings" ON public.anime_media FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "site_locks read all" ON public.site_locks;
CREATE POLICY "site_locks read all" ON public.site_locks FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "wc_matches read all" ON public.wc_matches;
CREATE POLICY "wc_matches read all" ON public.wc_matches FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "authed can read matches" ON public.wc_pvp_matches;
CREATE POLICY "authed can read matches" ON public.wc_pvp_matches FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "servers readable" ON public.media_servers;
CREATE POLICY "servers readable" ON public.media_servers FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "anime_episodes readable" ON public.anime_episodes;
CREATE POLICY "anime_episodes readable" ON public.anime_episodes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "chat-media read anon" ON storage.objects;
DROP POLICY IF EXISTS "chat-media read auth" ON storage.objects;
CREATE POLICY "chat-media read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "shorts: thumbs public read" ON storage.objects;
CREATE POLICY "shorts: thumbs public read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'shorts' AND (storage.foldername(name))[2] = 'thumbs' AND auth.uid()::text = (storage.foldername(name))[1]);