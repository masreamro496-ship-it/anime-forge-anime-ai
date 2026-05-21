import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { publicUrl } from "@/lib/storage";
import { ArrowRight, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/shorts/$id")({
  component: ShortDetail,
});

function ShortDetail() {
  const { id } = Route.useParams();
  const { data: short, isLoading } = useQuery({
    queryKey: ["short", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shorts").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const share = async () => {
    const link = window.location.href;
    const text = `شاهد هذا الشورت على Anime Forge:\n${link}\n\nالمنصة: ${window.location.origin}`;
    if (navigator.share) {
      try { await navigator.share({ title: short?.title || "شورت", text, url: link }); return; } catch {}
    }
    await navigator.clipboard.writeText(text);
    toast.success("تم نسخ الرابط");
  };

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/shorts" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> الشورتس</Link>
          <button onClick={share} className="flex items-center gap-1 rounded-lg bg-gradient-gold px-3 py-1.5 text-xs font-black text-gold-foreground"><Share2 className="h-3.5 w-3.5" /> مشاركة</button>
        </div>
      </header>
      <main className="container mx-auto max-w-md px-3 py-6">
        {isLoading && <p className="text-center text-muted-foreground">جاري التحميل...</p>}
        {!isLoading && !short && <p className="text-center text-muted-foreground">الفيديو غير متاح</p>}
        {short && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <video
              src={publicUrl("shorts", short.video_path)}
              poster={short.thumbnail_path ? publicUrl("shorts", short.thumbnail_path) : undefined}
              className="aspect-[9/16] w-full bg-black object-cover"
              controls autoPlay loop playsInline
            />
            <div className="p-4">
              {short.title && <h1 className="text-lg font-black">{short.title}</h1>}
              <p className="mt-1 text-xs text-muted-foreground">{short.views_count} مشاهدة • {short.likes_count} إعجاب</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
