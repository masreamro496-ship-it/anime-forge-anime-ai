import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

function slugify(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

// قائمة كل الأنميات المضافة (متجمّعة بالاسم) مع عدد الحلقات
export const listAnimeTitles = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabase
    .from("anime_episodes")
    .select("anime_title, anime_slug")
    .order("anime_title", { ascending: true });

  if (error) throw new Error("تعذر تحميل قائمة الأنميات");

  const map = new Map<string, { title: string; slug: string; episodesCount: number }>();
  for (const row of data ?? []) {
    const existing = map.get(row.anime_slug);
    if (existing) existing.episodesCount += 1;
    else map.set(row.anime_slug, { title: row.anime_title, slug: row.anime_slug, episodesCount: 1 });
  }
  return Array.from(map.values());
});

// كل حلقات أنمي معيّن
export const getAnimeEpisodesBySlug = createServerFn({ method: "GET" })
  .validator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabase
      .from("anime_episodes")
      .select("id, anime_title, episode_number")
      .eq("anime_slug", data.slug)
      .order("episode_number", { ascending: true });

    if (error) throw new Error("تعذر تحميل الحلقات");
    if (!rows || rows.length === 0) throw new Error("الأنمي غير موجود");

    return {
      title: rows[0].anime_title,
      episodes: rows.map((r) => ({ id: r.id as string, number: r.episode_number as number })),
    };
  });

// رابط مشاهدة (iframe) حلقة معيّنة
export const getEpisodeEmbed = createServerFn({ method: "GET" })
  .validator((d: { slug: string; episodeNumber: number }) => d)
  .handler(async ({ data }) => {
    const { data: row, error } = await supabase
      .from("anime_episodes")
      .select("anime_title, episode_number, embed_url")
      .eq("anime_slug", data.slug)
      .eq("episode_number", data.episodeNumber)
      .maybeSingle();

    if (error) throw new Error("تعذر تحميل الحلقة");
    if (!row) throw new Error("الحلقة غير موجودة");
    return row as { anime_title: string; episode_number: number; embed_url: string };
  });

// إضافة حلقة جديدة (من صفحة الرفع) — تظهر فورًا على الموقع
export const addAnimeEpisode = createServerFn({ method: "POST" })
  .validator((d: { animeTitle: string; episodeNumber: number; embedUrl: string }) => d)
  .handler(async ({ data }) => {
    const title = data.animeTitle.trim();
    const url = data.embedUrl.trim();

    if (!title) throw new Error("اكتب اسم الأنمي");
    if (!url.startsWith("http")) throw new Error("رابط الـ iframe غير صالح");
    if (!Number.isFinite(data.episodeNumber) || data.episodeNumber < 1) throw new Error("رقم حلقة غير صالح");

    const slug = slugify(title);
    if (!slug) throw new Error("اسم الأنمي غير صالح");

    const { error } = await supabase.from("anime_episodes").insert({
      anime_title: title,
      anime_slug: slug,
      episode_number: data.episodeNumber,
      embed_url: url,
    });

    if (error) {
      if (error.code === "23505") throw new Error("الحلقة دي مضافة قبل كده لنفس الأنمي");
      throw new Error("تعذر حفظ الحلقة");
    }

    return { slug, episodeNumber: data.episodeNumber };
  });

