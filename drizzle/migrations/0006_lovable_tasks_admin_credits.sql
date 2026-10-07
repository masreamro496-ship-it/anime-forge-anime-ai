CREATE TABLE public.lv_task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  task_id text NOT NULL,
  task_title text NOT NULL,
  reward integer NOT NULL,
  proof_link text,
  proof_path text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lv_task_submissions_user_idx ON public.lv_task_submissions (user_id, created_at DESC);
GRANT ALL ON public.lv_task_submissions TO service_role;
ALTER TABLE public.lv_task_submissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.lv_adjust(_uid uuid, _amount integer, _reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b integer;
BEGIN
  INSERT INTO lv_wallets (user_id, balance) VALUES (_uid, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE lv_wallets SET balance = greatest(balance + _amount, 0), updated_at = now()
   WHERE user_id = _uid RETURNING balance INTO _b;
  INSERT INTO lv_transactions (user_id, amount, reason) VALUES (_uid, _amount, coalesce(_reason, 'admin'));
  RETURN _b;
END $$;

CREATE OR REPLACE FUNCTION public.lv_review_task(_id uuid, _approve boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t lv_task_submissions;
BEGIN
  SELECT * INTO _t FROM lv_task_submissions WHERE id = _id FOR UPDATE;
  IF _t.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _t.status <> 'pending' THEN RAISE EXCEPTION 'already_reviewed'; END IF;
  UPDATE lv_task_submissions SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, reviewed_at = now() WHERE id = _id;
  IF _approve THEN PERFORM lv_adjust(_t.user_id, _t.reward, 'task:' || _t.task_id); END IF;
  RETURN jsonb_build_object('ok', true, 'reward', CASE WHEN _approve THEN _t.reward ELSE 0 END);
END $$;

REVOKE ALL ON FUNCTION public.lv_adjust(uuid, integer, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.lv_review_task(uuid, boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lv_adjust(uuid, integer, text), public.lv_review_task(uuid, boolean) TO service_role;