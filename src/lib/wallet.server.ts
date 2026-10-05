import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";

// قاعدة البيانات القديمة: تُستخدم فقط للتحقق من تسجيل الدخول
const OLD_URL = "https://ximllvsgpfeqmhharjin.supabase.co";
const OLD_KEY = "sb_publishable_gjpclJMqOF6g74NMKVEM9Q_ndgM4rqX";

function keyedFetch(key: string) {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const h = new Headers(init?.headers);
    if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
    h.set("apikey", key);
    return fetch(input, { ...init, headers: h });
  };
}

/** Verifies the old-database session token and returns the user id + token. */
export async function requireOldUser() {
  const auth = getRequestHeader("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("not_authenticated");
  const old = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await old.auth.getUser(token);
  if (error || !data.user) throw new Error("not_authenticated");
  return { userId: data.user.id, token, email: data.user.email ?? null };
}

/** Reads the user's credits from the old database once, to seed the new wallet. */
export async function readOldCredits(token: string, userId: string) {
  try {
    const old = createClient(OLD_URL, OLD_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data } = await old.from("profiles").select("credits").eq("id", userId).maybeSingle();
    return Math.max(0, Math.floor(Number((data as { credits?: number } | null)?.credits ?? 0)));
  } catch {
    return 0;
  }
}

/** Privileged client for the Lovable database. */
export function lovableDb() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: keyedFetch(key) },
  });
}

export async function ensureWallet(userId: string, token: string) {
  const db = lovableDb();
  const { data: existing } = await db.from("lv_wallets").select("balance, welcome_claimed").eq("user_id", userId).maybeSingle();
  if (existing) return existing as { balance: number; welcome_claimed: boolean };
  const initial = await readOldCredits(token, userId);
  await db.rpc("lv_ensure_wallet", { _uid: userId, _initial: initial });
  const { data } = await db.from("lv_wallets").select("balance, welcome_claimed").eq("user_id", userId).single();
  return data as { balance: number; welcome_claimed: boolean };
}
