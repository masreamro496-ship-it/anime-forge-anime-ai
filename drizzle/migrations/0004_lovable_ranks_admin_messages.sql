CREATE TABLE public.lv_ranks (
  user_id uuid PRIMARY KEY,
  email text,
  is_pro boolean NOT NULL DEFAULT false,
  pro_expires_at timestamptz,
  is_admin boolean NOT NULL DEFAULT false,
  is_moderator boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.lv_admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  kind text NOT NULL DEFAULT 'message',
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lv_admin_messages_user_idx ON public.lv_admin_messages (user_id, created_at DESC);
GRANT ALL ON public.lv_ranks, public.lv_admin_messages TO service_role;
ALTER TABLE public.lv_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lv_admin_messages ENABLE ROW LEVEL SECURITY;