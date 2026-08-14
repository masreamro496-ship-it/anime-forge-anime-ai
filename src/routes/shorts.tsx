import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { publicUrl } from "@/lib/storage";
import { ArrowRight, Upload, DollarSign, Play, Lock, X, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreateModal = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      toast.error("يرجى تسجيل الدخول أولاً لإمكانية إنشاء مشروع");
      navigate({ to: "/login", search: { redirect: "/shorts" } });
      return;
    }
    setIsOpen(true);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("يرجى إدخال اسم المشروع");
      return;
    }

    if (!user) {
      toast.error("يرجى تسجيل الدخول أولاً");
      return;
    }

    setIsSubmitting(true);

    try {
      let thumbnailPath: string | null = null;

      // Upload file to Supabase storage if selected
      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("shorts")
          .upload(fileName, file, { upsert: true });

        if (uploadError) {
          throw new Error("فشل رفع الملف: " + uploadError.message);
        }

        thumbnailPath = uploadData.path;
      }

      // Insert new project record in Supabase database
      const { error: insertError } = await (supabase as any).from("shorts").insert([
        {
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          price_usd: parseFloat(price) || 0,
          thumbnail_path: thumbnailPath,
          kind: "project",
          duration_seconds: 0,
        },
      ]);

      if (insertError) {
        throw new Error("فشل نشر المشروع: " + insertError.message);
      }

      toast.success("تم نشر المشروع بنجاح!");

      // Reset form fields
      setTitle("");
      setDescription("");
      setPrice("");
      setFile(null);
      setIsOpen(false);

      // Refresh feed instantly for all users
      queryClient.invalidateQueries({ queryKey: ["projects", "feed"] });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "حدث خطأ أثناء نشر المشروع");
    } finally {
      setIsSubmitting(false);
    }
  };

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", "feed"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (k: string, v: unknown) => {
              order: (
                col: string,
                opts: { ascending: boolean }
              ) => {
                limit: (
                  n: number
                ) => Promise<{ data: Project[] | null; error: { message: string } | null }>;
              };
            };
          };
        };
      };
      // Fetch only paid projects
      const { data, error } = await sb
        .from("shorts")
        .select("id,user_id,title,description,thumbnail_path,duration_seconds,price_usd,views_count")
        .eq("kind", "project")
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold hover:text-gold transition-colors">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <h1 className="text-lg font-black text-gradient-gold">سوق مشاريع الأنمي</h1>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1 rounded-lg bg-gradient-gold px-3 py-1.5 text-xs font-black text-gold-foreground shadow-gold hover:opacity-90 transition-opacity"
          >
            <Upload className="h-3.5 w-3.5" /> {user ? "إنشاء مشروع" : "دخول"}
          </button>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-6">
        {/* Project Creation Banner */}
        <section className="mb-6 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5 sm:p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-gradient-gold sm:text-xl">إنشاء مشروع جديد</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                ارفع فيديو مشروعك، اكتب عنوان ووصف، وحدّد سعرك بالدولار. الدفع عبر فودافون كاش على الرقم <strong>01080390782</strong>.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-black text-gold-foreground shadow-gold hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" /> {user ? "إنشاء مشروع" : "سجّل لإنشاء مشروع"}
            </button>
          </div>
        </section>

        {/* Projects / Shorts feed */}
        <h3 className="mb-3 text-sm font-black text-muted-foreground">فيديوهات الشورتس / المشاريع</h3>
        {isLoading && <p className="text-center text-sm text-muted-foreground py-10">جاري التحميل...</p>}
        {!isLoading && !projects?.length && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
            لا توجد مشاريع بعد. كن أول من ينشر مشروعاً للبيع! 💰
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {projects?.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </main>

      {/* Modal / Dialog for Project Creation */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-gold/30 bg-card p-6 shadow-2xl">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute left-4 top-4 text-muted-foreground hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-4 text-xl font-black text-gradient-gold">إنشاء مشروع جديد</h2>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">اسم المشروع</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="أدخل اسم المشروع..."
                  className="w-full rounded-xl border border-border bg-background/50 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">الوصف</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="أدخل وصفاً توضيحياً للمشروع..."
                  className="w-full resize-none rounded-xl border border-border bg-background/50 px-3.5 py-2.5 text-sm focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">السعر (بالدولار USD)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-border bg-background/50 py-2.5 pl-3 pr-8 text-sm focus:border-gold focus:outline-none"
                  />
                  <DollarSign className="absolute right-2.5 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">ملف المشروع / الغلاف</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-gold file:px-3 file:py-1 file:text-xs file:font-bold file:text-gold-foreground hover:file:opacity-90"
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-gold py-2.5 text-sm font-black text-gold-foreground shadow-gold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> جاري النشر...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> نشر
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-border bg-secondary/50 px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-white transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const thumb = project.thumbnail_path
    ? /^https?:\/\//i.test(project.thumbnail_path)
      ? project.thumbnail_path
      : publicUrl("shorts", project.thumbnail_path)
    : undefined;
  const mins = Math.floor((project.duration_seconds ?? 0) / 60);
  const secs = (project.duration_seconds ?? 0) % 60;

  return (
    <Link
      to="/shorts/$id"
      params={{ id: project.id }}
      className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-gold"
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-black">
        {thumb ? (
          <img
            src={thumb}
            alt={project.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Lock className="h-8 w-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[11px] font-black text-gold-foreground">
          <DollarSign className="h-3 w-3" />
          {Number(project.price_usd).toFixed(2)}
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
