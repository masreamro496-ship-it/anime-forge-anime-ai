
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_user_created ON public.chat_messages(user_id, created_at);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat: self read" ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "chat: self insert" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat: self delete" ON public.chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "chat: admin read" ON public.chat_messages FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.spend_chat_credits()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _cost int := 5; _bal numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT balance INTO _bal FROM public.credits WHERE user_id = _uid FOR UPDATE;
  IF coalesce(_bal,0) < _cost THEN RAISE EXCEPTION 'insufficient credits'; END IF;
  UPDATE public.credits SET balance = balance - _cost, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (_uid, -_cost, 'spend', 'chat_message');
END; $$;
