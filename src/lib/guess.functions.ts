import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type GuessCharacter = {
  id: string; name: string; anime: string | null; image_url: string;
  focus_x: number; focus_y: number; zoom: number; reward: number;
};

export const loadGuessGame = createServerFn({ method: "POST" }).handler(async () => {
  const { requireOldUser, lovableDb } = await import("./wallet.server");
  const db = lovableDb();
  const { data: chars } = await db.from("lv_guess_characters")
    .select("id, name, anime, image_url, focus_x, focus_y, zoom, reward").eq("is_active", true);
  const me = await requireOldUser().catch(() => null);
  let recent: string[] = [];
  if (me) {
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: att } = await db.from("lv_guess_attempts").select("character_id")
      .eq("user_id", me.userId).gt("created_at", since);
    recent = ((att ?? []) as { character_id: string }[]).map((a) => a.character_id);
  }
  return { characters: (chars ?? []) as GuessCharacter[], recent };
});

export const submitGuess = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ characterId: z.string().uuid(), answer: z.string().max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { requireOldUser, ensureWallet, lovableDb } = await import("./wallet.server");
    const me = await requireOldUser().catch(() => null);
    if (!me) return { ok: false, error: "not_authenticated" } as const;
    await ensureWallet(me.userId, me.token);
    const { data: res, error } = await lovableDb().rpc("lv_submit_guess", {
      _uid: me.userId, _character_id: data.characterId, _answer: data.answer,
    });
    if (error) {
      console.error("submitGuess", error);
      return { ok: false, error: "error" } as const;
    }
    return res as { ok: boolean; correct?: boolean; awarded?: number; balance?: number; name?: string; anime?: string | null; error?: string };
  });
