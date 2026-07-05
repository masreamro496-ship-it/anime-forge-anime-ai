import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AnimeVideoPlayer } from "@/components/AnimeVideoPlayer";
import { purchaseAnimeMedia, getAnimeMediaVideoUrl } from "@/lib/anime-media.functions";
import { toast } from "sonner";
import { ArrowRight, Coins, Film, Loader2, Lock, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/anime-market/$id")({
  head: () => ({
    meta: [
      { title: "مشاهدة — سوق الأنمي" },
      { name: "description", content: "شاهد فيديو أو فيلم الأنمي بعد الشراء بالكريدت." },
    ],
  }),
  component: DetailPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-8 text-center">
      <p className="mb-3 text-sm text-destructive">{error.message}</p>
      <button onClick={reset} className="rounded-xl bg-gradient-gold px-4 py-2 text-sm font-bold text-gold-foreground">إعادة</button>
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">غير موجود</div>,
});

type MediaDetail = {
  id: string;
  user_id: string;
  kind: "anime_video" | "anime_movie";
  title: string;
  description: string;
  thumbnail_path: string | null;
  duration_seconds: number;
  price_credits: number;
  purchases_count: number;
};

function DetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const router = useRouter();
  const buyFn = useServerFn(purchaseAnimeMedia);
  const getUrlFn = useServerFn(getAnimeMediaVideoUrl);
  const [buying, setBuying] = useState(false);

  const media = useQuery({
    queryKey: ["anime_media", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("anime_media").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("not found");
      return data as unknown as MediaDetail;
    },
  });

  const videoUrl = useQuery({
    queryKey: ["anime_media_video", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const r = await getUrlFn({ data: { media_id: id } });
      return r.url;
    },
  });

  const m = media.data;
  const isOwner = user && m && user.id === m.user_id;
  const hasAccess = !!videoUrl.data;

  const handleBuy = async () => {
    if (!user) { toast.error("سجّل دخولك أولاً"); return; }
    setBuying(true);
    try {
      await buyFn({ data: { media_id: id } });
      toast.success("تم الشراء! يمكنك المشاهدة الآن");
      await videoUrl.refetch();
      await media.refetch();
      router.invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBuying(false); }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/anime-market" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4 rotate-180" /> السوق
          </Link>
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-gold" />
            <span className="text-lg font-black text-gradient-gold">مشاهدة</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-6">
        {media.isLoading || !m ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
        ) : (
          <>
            {hasAccess && videoUrl.data ? (
              <AnimeVideoPlayer src={videoUrl.data} poster={m.thumbnail_path ?? undefined} />
            ) : (
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
                {m.thumbnail_path && <img src={m.thumbnail_path} alt={m.title} className="absolute inset-0 h-full w-full object-cover opacity-40" />}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/50 p-6 text-center">
                  <Lock className="h-12 w-12 text-gold" />
                  <p className="text-lg font-black text-white">مقفل — اشترِ للمشاهدة</p>
                  {user ? (
                    <button onClick={handleBuy} disabled={buying} className="flex items-center gap-2 rounded-2xl bg-gradient-gold px-6 py-3 text-base font-black text-gold-foreground shadow-gold disabled:opacity-60">
                      {buying ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
                      اشترِ بـ {m.price_credits} كريدت
                    </button>
                  ) : (
                    <Link to="/login" className="rounded-2xl bg-gradient-gold px-6 py-3 text-base font-black text-gold-foreground shadow-gold">سجّل دخولك للشراء</Link>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-black">{m.title}</h1>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.kind === "anime_movie" ? "فيلم أنمي" : "فيديو أنمي"} · {m.purchases_count} مبيعة
                  </p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-sm font-black text-gold">
                  <Coins className="h-4 w-4" /> {m.price_credits} كريدت
                </span>
              </div>
              {m.description && <p className="mt-3 whitespace-pre-line text-sm text-foreground/90">{m.description}</p>}
              {isOwner && <p className="mt-3 rounded-xl bg-primary/10 p-2 text-center text-xs text-primary">هذا المحتوى ملكك</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
