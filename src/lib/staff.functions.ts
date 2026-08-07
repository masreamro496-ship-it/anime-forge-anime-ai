import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const submitStaffApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    kind: "admin" | "developer";
    full_name: string;
    age?: number | null;
    phone?: string | null;
    skills?: string | null;
    info: string;
    requested_credits?: number | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.full_name.trim().length < 2) throw new Error("اكتب اسمك");
    if (data.info.trim().length < 10) throw new Error("اكتب معلوماتك بالتفصيل");

    const { error } = await supabase.from("staff_applications").insert({
      user_id: userId,
      kind: data.kind,
      full_name: data.full_name.trim().slice(0, 120),
      age: data.age ?? null,
      phone: (data.phone ?? "").slice(0, 30) || null,
      skills: (data.skills ?? "").slice(0, 500) || null,
      info: data.info.trim().slice(0, 4000),
      requested_credits: data.requested_credits ?? null,
    });
    if (error) throw new Error(error.message);

    // Notify all admins/moderators
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: staff } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "moderator"]);
      const ids = [...new Set(((staff ?? []) as { user_id: string }[]).map((r) => r.user_id))];
      const title = data.kind === "admin" ? "طلب تقديم إدارة جديد" : "طلب تقديم مطوّر جديد";
      const body = `${data.full_name.trim()} — ${data.info.trim().slice(0, 200)}`;
      if (ids.length) {
        await supabaseAdmin.from("notifications").insert(
          ids.map((id) => ({ user_id: id, title, body, link: "/admin" })),
        );
        await supabaseAdmin.from("admin_messages").insert(
          ids.map((id) => ({ user_id: id, body: `${title}: ${body}` })),
        );
      }
    } catch {
      // notification failure must not block the application
    }

    return { ok: true };
  });
