import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TASK_REWARDS } from "./task-rewards";

export const submitTask = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      taskId: z.string().refine((k) => k in TASK_REWARDS),
      proofLink: z.string().max(1000).optional(),
      proofPath: z.string().max(500).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireOldUser, lovableDb } = await import("./wallet.server");
    const { userId, email } = await requireOldUser().catch(() => {
      throw new Error("سجّل دخولك أولاً");
    });
    const t = TASK_REWARDS[data.taskId]!;
    const { error } = await lovableDb().from("lv_task_submissions").insert({
      user_id: userId, email, task_id: data.taskId, task_title: t.title, reward: t.reward,
      proof_link: data.proofLink ?? null, proof_path: data.proofPath ?? null,
    });
    if (error) {
      console.error("submitTask", error);
      throw new Error("تعذّر حفظ الإثبات، جرّب تاني");
    }
    return { ok: true, reward: t.reward };
  });

export const adminListTasks = createServerFn({ method: "POST" }).handler(async () => {
  const { requireStaff } = await import("./ranks.server");
  const { lovableDb } = await import("./wallet.server");
  await requireStaff();
  const { data } = await lovableDb().from("lv_task_submissions").select("*")
    .order("created_at", { ascending: false }).limit(300);
  return (data ?? []) as {
    id: string; user_id: string; email: string | null; task_id: string; task_title: string;
    reward: number; proof_link: string | null; proof_path: string | null; status: string; created_at: string;
  }[];
});

export const adminReviewTask = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { requireStaff } = await import("./ranks.server");
    const { lovableDb } = await import("./wallet.server");
    await requireStaff();
    const { data: res, error } = await lovableDb().rpc("lv_review_task", { _id: data.id, _approve: data.approve });
    if (error) throw new Error(error.message.includes("already_reviewed") ? "الطلب ده اتراجع قبل كده" : "تعذّر تحديث الطلب");
    return res as { ok: boolean; reward: number };
  });

/** Admin: add (positive) or remove (negative) credits by email or user id. */
export const adminAdjustCredits = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      email: z.string().email().optional(),
      userId: z.string().uuid().optional(),
      amount: z.number().int().min(-1000000).max(1000000).refine((n) => n !== 0),
      note: z.string().max(200).optional(),
    }).refine((v) => v.email || v.userId).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireStaff } = await import("./ranks.server");
    const { lovableDb } = await import("./wallet.server");
    await requireStaff();
    const db = lovableDb();
    let uid = data.userId ?? null;
    if (!uid && data.email) {
      const { data: r } = await db.from("lv_ranks").select("user_id").ilike("email", data.email.trim()).maybeSingle();
      uid = (r as { user_id?: string } | null)?.user_id ?? null;
    }
    if (!uid) throw new Error("مش لاقي الحساب ده — لازم صاحبه يسجّل دخول للموقع مرة واحدة على الأقل");
    const { data: bal, error } = await db.rpc("lv_adjust", { _uid: uid, _amount: data.amount, _reason: data.note || "admin" });
    if (error) throw new Error("تعذّر تعديل الكريدت");
    return { ok: true, balance: bal as number };
  });
