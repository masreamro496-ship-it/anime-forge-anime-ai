import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { listProjects, type PublicProject } from "@/lib/projects.functions";
import { ArrowRight, Upload, DollarSign, Play, Lock, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/shorts")({
  head: () => ({
    meta: [
      { title: "سوق مشاريع الأنمي — انمي فورج" },
      { name: "description", content: "تصفّح واشترِ مشاريع الأنمي من المستخدمين، أو انشر مشروعك واستلم فلوسك على محفظتك." },
      { property: "og:title", content: "سوق مشاريع الأنمي — انمي فورج" },
      { property: "og:description", content: "انشر مشروعك واستلم على فودافون كاش أو وي أو أي محفظة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectsFeed,
});

function ProjectsFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const listFn = useServerFn(listProjects);

  const openCreate = () => {
    if (!user) {
      toast.error("سجّل دخولك الأول عشان تنشر مشروع");
      navigate({ to: "/login", search: { redirect: "/shorts/upload" } });
      return;
    }
    navigate({ to: "/shorts/upload" });
  };

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", "feed"],
    queryFn: () => listFn(),
  });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <h1 className="text-lg font-black text-gradient-gold">سوق مشاريع الأنمي</h1>
          <button onClick={openCreate} className="flex items-center gap-1 rounded-lg bg-gradient-gold px-3 py-1.5 text-xs font-black text-gold-foreground shadow-gold">
            <Upload className="h-3.5 w-3.5" /> إنشاء مشروع
          </button>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-6">
        <section className="mb-6 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-gradient-gold">إنشاء مشروع جديد</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                اكتب العنوان والوصف والسعر، ارفع الفيديو، واختار محفظتك (فودافون كاش، وي، اتصالات، أورانج، إنستا باي) واكتب رقمها — والمشروع يتنشر فوراً للكل.
              </p>
            </div>
            <button onClick={openCreate} className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-black text-gold-foreground shadow-gold">
              <Plus className="h-4 w-4" /> {user ? "إنشاء مشروع" : "سجّل لإنشاء مشروع"}
            </button>
          </div>
        </section>

        {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">جاري التحميل...</p>}
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

function ProjectCard({ project }: { project: PublicProject }) {
  const mins = Math.floor((project.duration_seconds ?? 0) / 60);
  const secs = (project.duration_seconds ?? 0) % 60;
  return (
    <Link to="/shorts/$id" params={{ id: project.id }} className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-gold">
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-muted">
        {project.cover_url ? (
          <img src={project.cover_url} alt={project.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><Lock className="h-8 w-8" /></div>
        )}
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[11px] font-black text-gold-foreground">
          <DollarSign className="h-3 w-3" />{Number(project.price_usd).toFixed(2)}
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-background/80 px-2 py-0.5 text-[10px] font-bold">
          <Play className="h-3 w-3" /> {mins}:{String(secs).padStart(2, "0")}
        </div>
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-1 text-xs font-black">{project.title}</h3>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{project.description}</p>
        <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-gold"><Wallet className="h-3 w-3" /> {project.wallet_type}</p>
      </div>
    </Link>
  );
}
