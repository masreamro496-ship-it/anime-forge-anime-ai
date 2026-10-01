-- ============================================================
-- لعبة "تخمين الشخصية" — انمي فورج
-- شغّل هذا الملف كامل في SQL Editor في مشروع Supabase الخاص بك
-- ============================================================

-- 1) جدول شخصيات الأنمي
CREATE TABLE IF NOT EXISTS public.guess_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  anime text,
  -- نسبة التكبير وموضع الجزء الظاهر من الوجه (0-100)
  focus_x int NOT NULL DEFAULT 50,
  focus_y int NOT NULL DEFAULT 35,
  zoom int NOT NULL DEFAULT 300,
  reward int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.guess_characters TO anon, authenticated;
GRANT ALL ON public.guess_characters TO service_role;
ALTER TABLE public.guess_characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "characters are public" ON public.guess_characters;
CREATE POLICY "characters are public"
  ON public.guess_characters FOR SELECT
  USING (is_active);

-- 2) جدول محاولات المستخدمين (محاولة واحدة فقط لكل شخصية)
CREATE TABLE IF NOT EXISTS public.guess_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  character_id uuid NOT NULL REFERENCES public.guess_characters(id) ON DELETE CASCADE,
  answer text,
  is_correct boolean NOT NULL DEFAULT false,
  credits_awarded int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, character_id)
);

GRANT SELECT, INSERT ON public.guess_attempts TO authenticated;
GRANT ALL ON public.guess_attempts TO service_role;
ALTER TABLE public.guess_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own attempts" ON public.guess_attempts;
CREATE POLICY "own attempts"
  ON public.guess_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3) دالة إرسال التخمين: تضيف كريدت واحد عند الإجابة الصحيحة فقط
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

  SELECT * INTO _char FROM public.guess_characters
   WHERE id = _character_id AND is_active;
  IF _char.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'character_not_found');
  END IF;

  IF EXISTS (SELECT 1 FROM public.guess_attempts
              WHERE user_id = _uid AND character_id = _character_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_answered');
  END IF;

  _correct := lower(trim(coalesce(_answer, ''))) = lower(trim(_char.name));
  IF _correct THEN
    _reward := _char.reward;
  END IF;

  INSERT INTO public.guess_attempts (user_id, character_id, answer, is_correct, credits_awarded)
  VALUES (_uid, _character_id, _answer, _correct, _reward);

  IF _reward > 0 THEN
    UPDATE public.profiles
       SET credits = coalesce(credits, 0) + _reward
     WHERE id = _uid
    RETURNING credits INTO _balance;
  ELSE
    SELECT credits INTO _balance FROM public.profiles WHERE id = _uid;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'correct', _correct,
    'awarded', _reward,
    'balance', coalesce(_balance, 0),
    'name', _char.name,
    'anime', _char.anime
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_character_guess(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_character_guess(uuid, text) TO authenticated;

-- 4) شخصيات بداية (عدّل روابط الصور بصور عندك لو حبيت)
INSERT INTO public.guess_characters (name, anime, image_url, focus_x, focus_y, zoom)
SELECT * FROM (VALUES
  ('ناروتو أوزوماكي', 'Naruto', 'https://cdn.myanimelist.net/images/characters/2/284121.jpg', 50, 30, 320),
  ('ساسكي أوتشيها', 'Naruto', 'https://cdn.myanimelist.net/images/characters/9/131317.jpg', 50, 30, 320),
  ('مونكي د. لوفي', 'One Piece', 'https://cdn.myanimelist.net/images/characters/9/310307.jpg', 50, 32, 320),
  ('رورونوا زورو', 'One Piece', 'https://cdn.myanimelist.net/images/characters/3/100534.jpg', 50, 30, 320),
  ('غوكو', 'Dragon Ball', 'https://cdn.myanimelist.net/images/characters/15/72546.jpg', 50, 30, 320),
  ('ليفاي أكرمان', 'Attack on Titan', 'https://cdn.myanimelist.net/images/characters/2/241413.jpg', 50, 28, 320),
  ('إيرين ييغر', 'Attack on Titan', 'https://cdn.myanimelist.net/images/characters/10/216895.jpg', 50, 28, 320),
  ('تانجيرو كامادو', 'Demon Slayer', 'https://cdn.myanimelist.net/images/characters/6/386735.jpg', 50, 30, 320),
  ('نيزوكو كامادو', 'Demon Slayer', 'https://cdn.myanimelist.net/images/characters/2/378254.jpg', 50, 30, 320),
  ('غوجو ساتورو', 'Jujutsu Kaisen', 'https://cdn.myanimelist.net/images/characters/13/423171.jpg', 50, 28, 320),
  ('إدوارد إلريك', 'Fullmetal Alchemist', 'https://cdn.myanimelist.net/images/characters/9/72533.jpg', 50, 30, 320),
  ('المحقق كونان', 'Detective Conan', 'https://cdn.myanimelist.net/images/characters/7/75194.jpg', 50, 30, 320)
) AS v(name, anime, image_url, focus_x, focus_y, zoom)
WHERE NOT EXISTS (SELECT 1 FROM public.guess_characters);
