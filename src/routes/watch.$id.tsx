import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AnimeVideoPlayer } from "@/components/AnimeVideoPlayer";
import { getAnimeMediaVideoUrl } from "@/lib/anime-media.functions";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ArrowRight, Coins, Film, Loader2, Lock, Server, Signal, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/watch/$id")({
  head: () => ({
    meta: [
      { title: "غرفة المشاهدة — انمي فورج" },
      { name: "description", content: "شاهد حلقة أو فيلم الأنمي بعد الشراء مع اختيار السيرفر وجودة العرض حتى 480p." },
      { property: "og:title", content: "غرفة المشاهدة — انمي فورج" },
      { property: "og:description", content: "مشغّل احترافي مع 5 سيرفرات واختيار الجودة." },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WatchPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-8 text-center">
      <p className="mb-3 text-sm text-destructive">{error.message}</p>
      <button onClick={reset} className="rounded-xl bg-gradient-gold px-4 py-2 text-sm font-bold text-gold-foreground">إعادة</button>
    </div>
  ),
});

type MediaRow = {
  id: string;
  user_id: string;
  kind: "anime_video" | "anime_movie";
  title: string;
  description: string;
  thumbnail_path: string | null;
  duration_seconds: number;
  price_credits: number;
  purchases_count: number;
  author_name?: string | null;
  author_is_pro?: boolean;
  author_is_moderator?: boolean;
};

const SERVERS = [
  { id: 1, name: "سيرفر 1 — الرئيسي" },
  { id: 2, name: "سيرفر 2 — احتياطي" },
  { id: 3, name: "سيرفر 3 — سريع" },
  { id: 4, name: "سيرفر 4 — مصر" },
  { id: 5, name: "سيرفر 5 — عالمي" },
];
const QUALITIES = [240, 360, 480];

function WatchPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const getUrlFn = useServerFn(getAnimeMediaVideoUrl);
  const [server, setServer] = useState(1);
  const [quality, setQuality] = useState(480);

  const media = useQuery({
    queryKey: ["anime_media", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("anime_media").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("المحتوى غير موجود");
      return data as unknown as MediaRow;
    },
  });

  const author = useQuery({
    queryKey: ["profile", media.data?.user_id],
    enabled: !!media.data?.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, is_pro")
        .eq("id", media.data!.user_id)
        .maybeSingle();
      return data as { display_name: string | null; avatar_url: string | null; is_pro: boolean } | null;
    },
  });

  const videoUrl = useQuery({
    queryKey: ["anime_media_video", id, user?.id, server],
    enabled: !!user,
    queryFn: async () => {
      const r = await getUrlFn({ data: { media_id: id } });
      return r.url;
    },
  });

  // روابط السيرفرات الخارجية (Embed) من قاعدة البيانات
  const servers = useQuery({
    queryKey: ["media_servers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_servers")
        .select("server_no, quality, embed_url")
        .eq("media_id", id);
      if (error) throw error;
      return (data ?? []) as { server_no: number; quality: number; embed_url: string }[];
    },
  });

  const embed = servers.data?.find((s) => s.server_no === server && s.quality === quality)?.embed_url;

  const m = media.data;
  const src = videoUrl.data;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/anime-market" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4 rotate-180" /> السوق
          </Link>
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-gold" />
            <span className="text-lg font-black text-gradient-gold">غرفة المشاهدة</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-6">
        {media.isLoading || !m ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
        ) : (
          <>
            {videoUrl.isFetching && !src ? (
              <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
              </div>
            ) : src ? (
              <AnimeVideoPlayer key={`${server}-${quality}`} src={src} poster={m.thumbnail_path ?? undefined} />
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl bg-black/80 p-6 text-center ring-1 ring-white/10">
                <Lock className="h-10 w-10 text-gold" />
                <p className="font-black text-white">لم تشترِ هذا المحتوى بعد</p>
                <Link
                  to="/anime-market/$id"
                  params={{ id }}
                  className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 font-black text-white"
                >
                  اشترِ بـ {m.price_credits} كريدت
                </Link>
              </div>
            )}

            {/* Servers + quality */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="mb-2 flex items-center gap-2 text-sm font-black text-foreground">
                  <Server className="h-4 w-4 text-gold" /> السيرفرات
                </div>
                <div className="flex flex-wrap gap-2">
                  {SERVERS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setServer(s.id)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition ${server === s.id ? "bg-gradient-gold text-gold-foreground shadow-gold" : "border border-border bg-background text-muted-foreground hover:text-foreground"}`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="mb-2 flex items-center gap-2 text-sm font-black text-foreground">
                  <Signal className="h-4 w-4 text-gold" /> جودة العرض (حتى 480p)
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUALITIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition ${quality === q ? "bg-gradient-gold text-gold-foreground shadow-gold" : "border border-border bg-background text-muted-foreground hover:text-foreground"}`}
                    >
                      {q}p
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Media info */}
            <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-card">
              <h1 className="flex items-center gap-2 text-2xl font-black">
                {m.title}
                {m.author_is_moderator ? <VerifiedBadge variant="gold" size={20} /> : m.author_is_pro ? <VerifiedBadge variant="blue" size={20} /> : null}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {m.kind === "anime_movie" ? "فيلم أنمي" : "فيديو أنمي"} · {m.purchases_count} مبيعة
              </p>
              {m.description && <p className="mt-3 whitespace-pre-line text-sm text-foreground/90">{m.description}</p>}
            </div>

            {/* Author profile */}
            <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-3 text-sm font-black text-muted-foreground">ملف الناشر</div>
              <div className="flex items-center gap-3">
                {author.data?.avatar_url ? (
                  <img src={author.data.avatar_url} alt="صورة الناشر" className="h-14 w-14 rounded-full object-cover ring-2 ring-gold/40" loading="lazy" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <UserIcon className="h-6 w-6" />
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-base font-black">
                    {author.data?.display_name ?? m.author_name ?? "مستخدم"}
                    {m.author_is_moderator ? <VerifiedBadge variant="gold" size={18} /> : (m.author_is_pro || author.data?.is_pro) ? <VerifiedBadge variant="blue" size={18} /> : null}
                  </div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Coins className="h-3.5 w-3.5 text-gold" /> سعر المحتوى {m.price_credits} كريدت
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
