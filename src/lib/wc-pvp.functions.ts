import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

// إعداد الاتصال المباشر بقاعدة البيانات المستقلة
const SUPABASE_URL = "https://ximllvsgpfeqmhharjin.supabase.co";
const SUPABASE_KEY = "sb_publishable_gjpclJMqOF6g74NMKVEM9Q_ndgM4rqX";

export const wcPayEntry = createServerFn({ method: "POST" })
  .inputValidator((d: { room_id: string }) => d)
  .handler(async ({ data, request }) => {
    const authHeader = request.headers.get("authorization");
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: {
        headers: authHeader ? { authorization: authHeader } : {},
      },
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { error } = await supabase.rpc("wc_pay_entry", { _room_id: data.room_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const wcFinishMatch = createServerFn({ method: "POST" })
  .inputValidator((d: {
    room_id: string;
    winner_team: "A" | "B" | "draw";
    score_a: number;
    score_b: number;
    winners: string[];
    players: unknown;
  }) => d)
  .handler(async ({ data, request }) => {
    const authHeader = request.headers.get("authorization");
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: {
        headers: authHeader ? { authorization: authHeader } : {},
      },
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { error } = await supabase.rpc("wc_finish_match", {
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
