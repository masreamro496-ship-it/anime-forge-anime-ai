-- ============================================================
-- 1) الأدوات بالساعة: 30 كريدت لكل ساعة (ساعة=30، ساعتين=60، 3 ساعات=90 ... بلا حد)
-- ============================================================
CREATE OR REPLACE FUNCTION public.unlock_feature_hours(_key text, _hours int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cost numeric;
  _bal numeric;
  _exp timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _key NOT IN ('ai_chat','keys','art4k','dubbing','draw2d') THEN
    RAISE EXCEPTION 'unknown feature';
  END IF;
  IF _hours IS NULL OR _hours < 1 THEN RAISE EXCEPTION 'invalid hours'; END IF;

  _cost := 30 * _hours;

  SELECT balance INTO _bal FROM public.credits WHERE user_id = _uid FOR UPDATE;
  IF coalesce(_bal,0) < _cost THEN RAISE EXCEPTION 'insufficient credits'; END IF;

  UPDATE public.credits SET balance = balance - _cost, updated_at = now() WHERE user_id = _uid;
  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (_uid, -_cost, 'spend', 'feature_hours:' || _key || ':' || _hours);

  -- لو عنده وقت متبقي، الساعات الجديدة تتضاف عليه
  SELECT expires_at INTO _exp FROM public.feature_passes WHERE user_id = _uid AND feature_key = _key;
  _exp := greatest(coalesce(_exp, now()), now()) + make_interval(hours => _hours);

  INSERT INTO public.feature_passes (user_id, feature_key, expires_at)
    VALUES (_uid, _key, _exp)
    ON CONFLICT (user_id, feature_key) DO UPDATE SET expires_at = _exp, created_at = now();

  RETURN jsonb_build_object('ok', true, 'expires_at', _exp, 'charged', _cost);
END; $$;

REVOKE ALL ON FUNCTION public.unlock_feature_hours(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.unlock_feature_hours(text, int) TO authenticated;

-- ============================================================
-- 2) تخمين الشخصية: الشخصيات ترجع تاني كل 5 دقايق
-- ============================================================
ALTER TABLE public.guess_attempts DROP CONSTRAINT IF EXISTS guess_attempts_user_id_character_id_key;
CREATE INDEX IF NOT EXISTS guess_attempts_user_char_time ON public.guess_attempts (user_id, character_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.submit_character_guess(_character_id uuid, _answer text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _char public.guess_characters;
  _correct boolean;
  _reward int := 0;
  _balance int;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _char FROM public.guess_characters WHERE id = _character_id AND is_active;
  IF _char.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'character_not_found');
  END IF;

  IF EXISTS (SELECT 1 FROM public.guess_attempts
              WHERE user_id = _uid AND character_id = _character_id
                AND created_at > now() - interval '5 minutes') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_answered');
  END IF;

  _correct := lower(trim(coalesce(_answer, ''))) = lower(trim(_char.name));
  IF _correct THEN _reward := _char.reward; END IF;

  INSERT INTO public.guess_attempts (user_id, character_id, answer, is_correct, credits_awarded)
  VALUES (_uid, _character_id, _answer, _correct, _reward);

  IF _reward > 0 THEN
    UPDATE public.profiles SET credits = coalesce(credits, 0) + _reward
     WHERE id = _uid RETURNING credits INTO _balance;
  ELSE
    SELECT credits INTO _balance FROM public.profiles WHERE id = _uid;
  END IF;

  RETURN jsonb_build_object('ok', true, 'correct', _correct, 'awarded', _reward,
    'balance', coalesce(_balance, 0), 'name', _char.name, 'anime', _char.anime);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_character_guess(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_character_guess(uuid, text) TO authenticated;
