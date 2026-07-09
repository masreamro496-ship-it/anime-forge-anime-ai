import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const wcPayEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { room_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("wc_pay_entry", { _room_id: data.room_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const wcFinishMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    room_id: string;
    winner_team: "A" | "B" | "draw";
    score_a: number;
    score_b: number;
    winners: string[];
    players: unknown;
  }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("wc_finish_match", {
      _room_id: data.room_id,
      _winner_team: data.winner_team,
      _score_a: data.score_a,
      _score_b: data.score_b,
      _winners: data.winners,
      _players: data.players as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
