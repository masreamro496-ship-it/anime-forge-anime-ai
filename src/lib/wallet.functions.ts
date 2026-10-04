import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const KEYS = ["ai_chat", "keys", "art4k", "dubbing", "draw2d", "world_cup"] as const;

function errCode(e: unknown) {
  const m = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
  for (const c of ["insufficient_credits", "trial_used", "already_claimed", "weekly_limit", "invalid_card", "not_authenticated"]) {
    if (m.includes(c)) return c;
  }
  console.error("wallet error", m);
  return "error";
}

export const getWallet = createServerFn({ method: "POST" }).handler(async () => {
  const { requireOldUser, ensureWallet } = await import("./wallet.server");
  try {
    const { userId, token } = await requireOldUser();
    const w = await ensureWallet(userId, token);
    return { ok: true as const, balance: w.balance, welcomeClaimed: w.welcome_claimed };
  } catch (e) {
    return { ok: false as const, error: errCode(e), balance: 0, welcomeClaimed: true };
  }
});

export const getFeatureStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ key: z.enum(KEYS) }).parse(d))
  .handler(async ({ data }) => {
    const { requireOldUser, ensureWallet, lovableDb } = await import("./wallet.server");
    try {
      const { userId, token } = await requireOldUser();
      const w = await ensureWallet(userId, token);
      const db = lovableDb();
      const [pass, trial] = await Promise.all([
        db.from("lv_feature_passes").select("expires_at").eq("user_id", userId).eq("feature_key", data.key).maybeSingle(),
        db.from("lv_free_trials").select("used_at").eq("user_id", userId).eq("feature_key", data.key).maybeSingle(),
      ]);
      const exp = (pass.data as { expires_at?: string } | null)?.expires_at ?? null;
      return {
        ok: true as const,
        balance: w.balance,
        active: !!exp && new Date(exp).getTime() > Date.now(),
        expiresAt: exp,
        trialUsed: !!trial.data,
      };
    } catch (e) {
      return { ok: false as const, error: errCode(e), balance: 0, active: false, expiresAt: null, trialUsed: true };
    }
  });

export const unlockFeature = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ key: z.enum(KEYS), hours: z.number().int().min(1).max(10000) }).parse(d))
  .handler(async ({ data }) => {
    const { requireOldUser, ensureWallet, lovableDb } = await import("./wallet.server");
    try {
      const { userId, token } = await requireOldUser();
      await ensureWallet(userId, token);
      const { data: res, error } = await lovableDb().rpc("lv_unlock", { _uid: userId, _key: data.key, _hours: data.hours });
      if (error) throw error;
      return { ok: true as const, ...(res as { expires_at: string; balance: number }) };
    } catch (e) {
      return { ok: false as const, error: errCode(e) };
    }
  });

export const startFreeTrial = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ key: z.enum(KEYS) }).parse(d))
  .handler(async ({ data }) => {
    const { requireOldUser, ensureWallet, lovableDb } = await import("./wallet.server");
    try {
      const { userId, token } = await requireOldUser();
      await ensureWallet(userId, token);
      const { data: res, error } = await lovableDb().rpc("lv_free_trial", { _uid: userId, _key: data.key });
      if (error) throw error;
      return { ok: true as const, ...(res as { expires_at: string }) };
    } catch (e) {
      return { ok: false as const, error: errCode(e) };
    }
  });

export const claimWelcomeCredits = createServerFn({ method: "POST" }).handler(async () => {
  const { requireOldUser, ensureWallet, lovableDb } = await import("./wallet.server");
  try {
    const { userId, token } = await requireOldUser();
    await ensureWallet(userId, token);
    const { data: res, error } = await lovableDb().rpc("lv_claim_welcome", { _uid: userId });
    if (error) throw error;
    return { ok: true as const, ...(res as { balance: number }) };
  } catch (e) {
    return { ok: false as const, error: errCode(e) };
  }
});

export const getWheelState = createServerFn({ method: "POST" }).handler(async () => {
  const { requireOldUser, lovableDb } = await import("./wallet.server");
  try {
    const { userId } = await requireOldUser();
    const db = lovableDb();
    const [last, extra] = await Promise.all([
      db.from("lv_wheel_spins").select("created_at").eq("user_id", userId).eq("used_extra", false).order("created_at", { ascending: false }).limit(1),
      db.from("lv_wheel_extra").select("spins").eq("user_id", userId).maybeSingle(),
    ]);
    const lastAt = (last.data?.[0] as { created_at?: string } | undefined)?.created_at ?? null;
    return { ok: true as const, lastAt, extraSpins: Number((extra.data as { spins?: number } | null)?.spins ?? 0) };
  } catch (e) {
    return { ok: false as const, error: errCode(e), lastAt: null, extraSpins: 0 };
  }
});

export const spinWheel = createServerFn({ method: "POST" }).handler(async () => {
  const { requireOldUser, ensureWallet, lovableDb } = await import("./wallet.server");
  try {
    const { userId, token } = await requireOldUser();
    await ensureWallet(userId, token);
    const { data: res, error } = await lovableDb().rpc("lv_spin", { _uid: userId });
    if (error) throw error;
    return { ok: true as const, ...(res as { spin_id: string; kind: string; amount: number; used_extra: boolean }) };
  } catch (e) {
    return { ok: false as const, error: errCode(e) };
  }
});

export const wheelCardAction = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ spinId: z.string().uuid(), action: z.enum(["claimed", "converted"]), phone: z.string().max(20).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireOldUser, lovableDb } = await import("./wallet.server");
    try {
      const { userId } = await requireOldUser();
      const { error } = await lovableDb().rpc("lv_card_action", {
        _uid: userId, _spin: data.spinId, _action: data.action, _phone: data.phone ?? null,
      });
      if (error) throw error;
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: errCode(e) };
    }
  });
