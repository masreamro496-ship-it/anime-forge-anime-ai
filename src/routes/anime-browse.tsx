import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAnimeTitles } from "@/lib/anime-episodes.functions";
import { Loader2, PlusCircle, Tv } from "lucide-react";

export const Route = createFileRoute("/anime-browse")({
  head: () => ({
    meta: [
      { title: "تصفح الأنمي — انمي فورج" },
      { name: "description", content: "تصفح كل الأنميات والحلقات المضافة." },
    ],
  }),
  component: AnimeBrowsePage,
});

function AnimeBrowsePage() {
  const listFn = useServerFn(listAnimeTitles);
  const list = useQuery({ queryKey: ["anime_titles"], queryFn: () => listFn() });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Tv className="h-5 w-5 text-gold" />
            <span className="text-lg font-black text-gradient-gold">تصفح الأنمي</span>
          </div>
          <Link
            to="/anime-upload"
            className="flex items-center gap-2 rounded-2xl bg-gradient-gold px-4 py-2 text-sm font-black text-gold-foreground shadow-gold"
          >
            <PlusCircle className="h-4 w-4" /> إضافة حلقة
          </Link>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-6">
        {list.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : list.data && list.data.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {list.data.map((a) => (
              <Link
                key={a.slug}
                to="/anime-browse/$slug"
                params={{ slug: a.slug }}
                className="rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-1 hover:shadow-gold"
              >
                <p className="line-clamp-2 text-sm font-bold text-foreground">{a.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.episodesCount} حلقة</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">لا يوجد أنمي مضاف بعد.</p>
            <Link to="/anime-upload" className="mt-3 inline-block text-sm font-black text-gold">
              كن أول من يضيف حلقة →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

