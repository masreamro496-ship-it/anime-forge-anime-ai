import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getMyRank = createServerFn({ method: "POST" }).handler(async () => {
  const { requireOldUser } = await import("./wallet.server");
  const { syncRank } = await import("./ranks.server");
  try {
    const { userId, token, email } = await requireOldUser();
    return { ok: true as const, ...(await syncRank(userId, token, email)) };
  } catch {
    return { ok: false as const, isPro: false, isAdmin: false, isModerator: false, proExpiresAt: null };
  }
});

export const sendAdminMessage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ body: z.string().trim().min(1).max(2000) }).parse(d))
  .handler(async ({ data }) => {
    const { requireOldUser, lovableDb } = await import("./wallet.server");
    try {
      const { userId, email } = await requireOldUser();
      const { error } = await lovableDb().from("lv_admin_messages").insert({ user_id: userId, email, body: data.body });
      if (error) throw error;
      return { ok: true as const };
    } catch (e) {
      console.error("sendAdminMessage", e);
      return { ok: false as const };
    }
  });

export const listMyAdminMessages = createServerFn({ method: "POST" }).handler(async () => {
  const { requireOldUser, lovableDb } = await import("./wallet.server");
  try {
    const { userId } = await requireOldUser();
    const { data } = await lovableDb().from("lv_admin_messages")
      .select("id, body, is_read, created_at").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(10);
    return (data ?? []) as { id: string; body: string; is_read: boolean; created_at: string }[];
  } catch {
    return [];
  }
});

export const submitStaffApplication = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      kind: z.enum(["admin", "developer"]),
      full_name: z.string().trim().min(2).max(120),
      age: z.number().int().min(1).max(120).nullable().optional(),
      phone: z.string().max(30).nullable().optional(),
      skills: z.string().max(500).nullable().optional(),
      info: z.string().trim().min(10).max(4000),
      requested_credits: z.number().int().min(0).max(1000000).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireOldUser, lovableDb } = await import("./wallet.server");
    const { userId, email } = await requireOldUser().catch(() => {
      throw new Error("سجّل دخولك أولاً");
    });
    const title = data.kind === "admin" ? "طلب تقديم إدارة" : "طلب تقديم مطوّر";
    const body = [
      `${title}`,
      `الاسم: ${data.full_name}`,
      data.age ? `العمر: ${data.age}` : null,
      data.phone ? `الهاتف: ${data.phone}` : null,
      data.skills ? `المهارات: ${data.skills}` : null,
      data.requested_credits ? `الكريدت المطلوب: ${data.requested_credits}` : null,
      `المعلومات: ${data.info}`,
    ].filter(Boolean).join("\n");
    const { error } = await lovableDb().from("lv_admin_messages")
      .insert({ user_id: userId, email, kind: `apply_${data.kind}`, body });
    if (error) {
      console.error("submitStaffApplication", error);
      throw new Error("تعذّر إرسال الطلب، جرّب تاني");
    }
    return { ok: true };
  });

export const adminListMessages = createServerFn({ method: "POST" }).handler(async () => {
  const { requireStaff } = await import("./ranks.server");
  const { lovableDb } = await import("./wallet.server");
  await requireStaff();
  const { data } = await lovableDb().from("lv_admin_messages").select("*")
    .order("created_at", { ascending: false }).limit(200);
  return (data ?? []) as { id: string; user_id: string; email: string | null; kind: string; body: string; is_read: boolean; created_at: string }[];
});

export const adminMarkMessageRead = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireStaff } = await import("./ranks.server");
    const { lovableDb } = await import("./wallet.server");
    await requireStaff();
    await lovableDb().from("lv_admin_messages").update({ is_read: true }).eq("id", data.id);
    return { ok: true };
  });

export const adminSetPro = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userId: z.string().uuid(), days: z.number().int().min(0).max(3650).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { requireStaff } = await import("./ranks.server");
    const { lovableDb } = await import("./wallet.server");
    await requireStaff();
    const exp = data.days ? new Date(Date.now() + data.days * 86400000).toISOString() : null;
    const { error } = await lovableDb().from("lv_ranks")
      .upsert({ user_id: data.userId, is_pro: true, pro_expires_at: exp, updated_at: new Date().toISOString() });
    if (error) throw new Error("تعذّر تفعيل PRO");
    return { ok: true };
  });
