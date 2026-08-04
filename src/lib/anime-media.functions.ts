import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createAnimeMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    kind: "anime_video" | "anime_movie";
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url?: string;
    duration_seconds: number;
    price_credits: number;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const maxSec = data.kind === "anime_movie" ? 2 * 60 * 60 : 30 * 60;
    const maxPrice = data.kind === "anime_movie" ? 200 : 100;
    if (data.title.trim().length < 2) throw new Error("العنوان مطلوب");
    if (data.duration_seconds > maxSec + 5) throw new Error("مدة الفيديو أطول من المسموح");
    if (data.price_credits < 1) throw new Error("السعر يجب أن يكون كريدت واحد على الأقل");
    if (data.price_credits > maxPrice) throw new Error(`الحد الأقصى ${maxPrice} كريدت`);

    const [{ data: prof }, { data: rolesRows }] = await Promise.all([
      supabase.from("profiles").select("is_pro,display_name").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const roles = ((rolesRows ?? []) as { role: string }[]).map((r) => r.role);
    const p = prof as { is_pro?: boolean; display_name?: string | null } | null;

    const { data: row, error } = await supabase.from("anime_media").insert({
      author_is_pro: !!p?.is_pro || roles.includes("pro"),
      author_is_moderator: roles.includes("admin") || roles.includes("moderator"),
      author_name: p?.display_name ?? null,
      user_id: userId,
      kind: data.kind,
      title: data.title.trim().slice(0, 120),
      description: (data.description ?? "").slice(0, 1000),
      video_path: data.video_url,
      thumbnail_path: data.thumbnail_url ?? null,
      duration_seconds: Math.round(data.duration_seconds),
      price_credits: Math.round(data.price_credits),
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

export const purchaseAnimeMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { media_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: pid, error } = await supabase.rpc("purchase_anime_media", { _media_id: data.media_id });
    if (error) throw new Error(error.message);
    return { purchase_id: pid as unknown as string };
  });

export const getAnimeMediaVideoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { media_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: path, error } = await supabase.rpc("get_anime_media_video_path", { _media_id: data.media_id });
    if (error) throw new Error(error.message);
    return { url: (path as string | null) ?? null };
  });
