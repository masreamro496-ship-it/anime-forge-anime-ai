import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { publicUrl } from "@/lib/storage";
import { ArrowRight, Upload, DollarSign, Play, Lock } from "lucide-react";

export const Route = createFileRoute("/shorts")({ component: ProjectsFeed });

type Project = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  thumbnail_path: string | null;
  duration_seconds: number | null;
  price_usd: number;
  views_count: number;
};

function ProjectsFeed() {
  const { user } = useAuth();
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", "feed"],
    queryFn: async () => {
      const sb = supabase as unknown as { from: (t: string) => { select: (c: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: Project[] | null; error: { message: string } | null }> } } } };
      const { data, error } = await sb.from("shorts_public").select("id,user_id,title,description,thumbnail_path,duration_seconds,price_usd,views_count").order("created_at", { ascending: false }).limit(60);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> الرئيسية</Link>
          <h1 className="text-lg font-black text-gradient-gold">سوق مشاريع الأنمي</h1>
          {user ? (
            <Link to="/shorts/upload" className="flex items-center gap-1 rounded-lg bg-gradient-gold px-3 py-1.5 text-xs font-black text-gold-foreground shadow-gold">
              <Upload className="h-3.5 w-3.5" /> إنشاء مشروع
            </Link>
          ) : (
            <Link to="/login" className="rounded-lg border border-gold/50 px-3 py-1.5 text-xs font-bold text-gold">دخول</Link>
          )}
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-6">
        {isLoading && <p className="text-center text-sm text-muted-foreground py-10">جاري التحميل...</p>}
        {!isLoading && !projects?.length && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
            لا توجد مشاريع بعد. كن أول من ينشر مشروعاً للبيع! 💰
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {projects?.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      </main>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const thumb = project.thumbnail_path ? publicUrl("shorts", project.thumbnail_path) : undefined;
  const mins = Math.floor((project.duration_seconds ?? 0) / 60);
  const secs = (project.duration_seconds ?? 0) % 60;
  return (
    <Link to="/shorts/$id" params={{ id: project.id }} className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-gold">
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-black">
        {thumb ? (
          <img src={thumb} alt={project.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><Lock className="h-8 w-8" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[11px] font-black text-gold-foreground">
          <DollarSign className="h-3 w-3" />{Number(project.price_usd).toFixed(2)}
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
          <Play className="h-3 w-3" /> {mins}:{String(secs).padStart(2, "0")}
        </div>
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-1 text-xs font-black">{project.title || "مشروع بدون عنوان"}</h3>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{project.description}</p>
      </div>
    </Link>
  );
}
