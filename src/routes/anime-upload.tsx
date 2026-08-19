import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { addAnimeEpisode } from "@/lib/anime-episodes.functions";
import { toast } from "sonner";
import { Loader2, UploadCloud } from "lucide-react";

export const Route = createFileRoute("/anime-upload")({
  head: () => ({
    meta: [
      { title: "إضافة حلقة — انمي فورج" },
      { name: "description", content: "أضف حلقة أنمي جديدة برابط مشغّل خارجي." },
    ],
  }),
  component: AnimeUploadPage,
});

function AnimeUploadPage() {
  const addFn = useServerFn(addAnimeEpisode);
  const navigate = useNavigate();

  const [animeTitle, setAnimeTitle] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await addFn({
        data: {
          animeTitle,
          episodeNumber: Number(episodeNumber),
          embedUrl,
        },
      });

      toast.success("تمت الإضافة! جاري تحويلك للحلقة");
      await navigate({
        to: "/anime-browse/$slug/watch/$episode",
        params: { slug: result.slug, episode: String(result.episodeNumber) },
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto flex items-center gap-2 px-4 py-4">
          <UploadCloud className="h-5 w-5 text-gold" />
          <span className="text-lg font-black text-gradient-gold">إضافة حلقة جديدة</span>
        </div>
      </header>

      <div className="container mx-auto max-w-lg px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div>
            <label className="mb-1 block text-sm font-bold text-foreground">اسم الأنمي</label>
            <input
              value={animeTitle}
              onChange={(e) => setAnimeTitle(e.target.value)}
              placeholder="مثال: دراغون بول"
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-foreground">رقم الحلقة</label>
            <input
              value={episodeNumber}
              onChange={(e) => setEpisodeNumber(e.target.value)}
              type="number"
              min={1}
              placeholder="مثال: 1"
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-foreground">رابط مشغّل الفيديو الخارجي (iframe)</label>
            <input
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              type="url"
              placeholder="https://..."
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold"
            />
            <p className="mt-1 text-xs text-muted-foreground">حط هنا رابط الـ embed بتاع أي مشغّل خارجي — الموقع مش بيخزّن أي فيديو.</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold py-3 text-base font-black text-gold-foreground shadow-gold disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
            {saving ? "جاري الحفظ..." : "حفظ ونشر"}
          </button>
        </form>
      </div>
    </div>
  );
}

