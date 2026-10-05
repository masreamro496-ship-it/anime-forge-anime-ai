import { createClient } from "@supabase/supabase-js";
import { lovableDb } from "./wallet.server";

const OLD_URL = "https://ximllvsgpfeqmhharjin.supabase.co";
const OLD_KEY = "sb_publishable_gjpclJMqOF6g74NMKVEM9Q_ndgM4rqX";

export type Rank = { isPro: boolean; isAdmin: boolean; isModerator: boolean; proExpiresAt: string | null };

/** Merges ranks from the old database into the Lovable ranks table and returns the result. */
export async function syncRank(userId: string, token: string, email: string | null): Promise<Rank> {
  const db = lovableDb();
  let oldPro = false, oldAdmin = false, oldMod = false;
  try {
    const old = createClient(OLD_URL, OLD_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const [p, r] = await Promise.all([
      old.from("profiles").select("is_pro").eq("id", userId).maybeSingle(),
      old.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const roles = ((r.data ?? []) as { role: string }[]).map((x) => x.role);
    oldPro = !!(p.data as { is_pro?: boolean } | null)?.is_pro || roles.includes("pro");
    oldAdmin = roles.includes("admin");
    oldMod = roles.includes("moderator");
  } catch { /* old database unreachable: keep Lovable ranks */ }

  const { data: cur } = await db.from("lv_ranks").select("*").eq("user_id", userId).maybeSingle();
  const c = cur as { is_pro: boolean; is_admin: boolean; is_moderator: boolean; pro_expires_at: string | null } | null;
  const next = {
    user_id: userId,
    email,
    is_pro: (c?.is_pro ?? false) || oldPro,
    is_admin: (c?.is_admin ?? false) || oldAdmin,
    is_moderator: (c?.is_moderator ?? false) || oldMod,
    pro_expires_at: c?.pro_expires_at ?? null,
    updated_at: new Date().toISOString(),
  };
  await db.from("lv_ranks").upsert(next);
  const proActive = next.is_pro && (!next.pro_expires_at || new Date(next.pro_expires_at).getTime() > Date.now());
  return { isPro: proActive || next.is_admin, isAdmin: next.is_admin, isModerator: next.is_moderator, proExpiresAt: next.pro_expires_at };
}

export async function requireStaff() {
  const { requireOldUser } = await import("./wallet.server");
  const { userId, token, email } = await requireOldUser();
  const rank = await syncRank(userId, token, email);
  if (!rank.isAdmin && !rank.isModerator) throw new Error("forbidden");
  return { userId };
}
