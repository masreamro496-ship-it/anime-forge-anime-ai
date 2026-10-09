import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const WALLETS = ["فودافون كاش", "وي باي", "اتصالات كاش", "أورانج كاش", "إنستا باي"] as const;

const PUBLIC_COLS = "id, user_id, title, description, price_usd, wallet_type, cover_url, duration_seconds, views_count, created_at";

export type PublicProject = {
  id: string; user_id: string; title: string; description: string; price_usd: number;
  wallet_type: string; cover_url: string | null; duration_seconds: number; views_count: number; created_at: string;
};

export const listProjects = createServerFn({ method: "GET" }).handler(async () => {
  const { lovableDb } = await import("./wallet.server");
  const { data } = await lovableDb().from("lv_projects").select(PUBLIC_COLS)
    .order("created_at", { ascending: false }).limit(60);
  return (data ?? []) as PublicProject[];
});

export const createProject = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      title: z.string().trim().min(2).max(100),
      description: z.string().trim().min(5).max(1000),
      priceUsd: z.number().positive().max(100000),
      walletType: z.enum(WALLETS),
      walletPhone: z.string().trim().regex(/^01[0125]\d{8}$/),
      videoUrl: z.string().url().max(1000),
      coverUrl: z.string().url().max(1000).nullable().optional(),
      durationSeconds: z.number().int().min(0).max(36000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireOldUser, lovableDb } = await import("./wallet.server");
    const { userId, email } = await requireOldUser().catch(() => {
      throw new Error("سجّل دخولك أولاً");
    });
    const { data: row, error } = await lovableDb().from("lv_projects").insert({
      user_id: userId, author_email: email, title: data.title, description: data.description,
      price_usd: data.priceUsd, wallet_type: data.walletType, wallet_phone: data.walletPhone,
      video_url: data.videoUrl, cover_url: data.coverUrl ?? null, duration_seconds: data.durationSeconds,
    }).select("id").single();
    if (error || !row) {
      console.error("createProject", error);
      throw new Error("تعذّر نشر المشروع، جرّب تاني");
    }
    return { id: (row as { id: string }).id };
  });

/** Project page: public info for everyone; payment number after a buy request; video for owner/approved buyer. */
export const getProject = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireOldUser, lovableDb } = await import("./wallet.server");
    const db = lovableDb();
    const { data: p } = await db.from("lv_projects").select("*").eq("id", data.id).maybeSingle();
    if (!p) return null;
    const full = p as PublicProject & { wallet_phone: string; video_url: string };
    const { wallet_phone, video_url, ...pub } = full;
    const me = await requireOldUser().catch(() => null);
    const isOwner = !!me && me.userId === full.user_id;
    let purchase: { id: string; status: string } | null = null;
    let requests: { id: string; buyer_email: string | null; status: string; created_at: string }[] = [];
    if (me && !isOwner) {
      const { data: pr } = await db.from("lv_project_purchases").select("id, status")
        .eq("project_id", data.id).eq("buyer_id", me.userId).maybeSingle();
      purchase = pr as typeof purchase;
    }
    if (isOwner) {
      const { data: rq } = await db.from("lv_project_purchases").select("id, buyer_email, status, created_at")
        .eq("project_id", data.id).order("created_at", { ascending: false });
      requests = (rq ?? []) as typeof requests;
    }
    if (!isOwner) await db.from("lv_projects").update({ views_count: full.views_count + 1 }).eq("id", data.id);
    return {
      project: pub,
      isOwner,
      purchase,
      requests,
      walletPhone: isOwner || purchase ? wallet_phone : null,
      videoUrl: isOwner || purchase?.status === "approved" ? video_url : null,
    };
  });

export const requestProjectPurchase = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { requireOldUser, lovableDb } = await import("./wallet.server");
    const { userId, email } = await requireOldUser().catch(() => {
      throw new Error("سجّل دخولك للشراء");
    });
    const db = lovableDb();
    const { data: p } = await db.from("lv_projects").select("user_id").eq("id", data.id).maybeSingle();
    if (!p) throw new Error("المشروع غير موجود");
    if ((p as { user_id: string }).user_id === userId) throw new Error("ده مشروعك");
    await db.from("lv_project_purchases")
      .upsert({ project_id: data.id, buyer_id: userId, buyer_email: email }, { onConflict: "project_id,buyer_id", ignoreDuplicates: true });
    return { ok: true };
  });

export const reviewProjectPurchase = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ purchaseId: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { requireOldUser, lovableDb } = await import("./wallet.server");
    const { userId } = await requireOldUser();
    const db = lovableDb();
    const { data: pr } = await db.from("lv_project_purchases").select("project_id").eq("id", data.purchaseId).maybeSingle();
    if (!pr) throw new Error("الطلب غير موجود");
    const { data: p } = await db.from("lv_projects").select("user_id").eq("id", (pr as { project_id: string }).project_id).maybeSingle();
    if ((p as { user_id?: string } | null)?.user_id !== userId) throw new Error("مش مسموح");
    await db.from("lv_project_purchases").update({ status: data.approve ? "approved" : "rejected" }).eq("id", data.purchaseId);
    return { ok: true };
  });
