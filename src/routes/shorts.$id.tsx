import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { publicUrl } from "@/lib/storage";
import { ArrowRight, DollarSign, Phone, ShoppingCart, CheckCircle2, Clock, Lock, Play } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/shorts/$id")({ component: ProjectDetail });

type ProjectPub = {
  id: string; user_id: string; title: string; description: string;
  thumbnail_path: string | null; duration_seconds: number | null;
  price_usd: number; views_count: number;
};

type Purchase = { id: string; status: "pending" | "approved" | "rejected"; created_at: string };

function ProjectDetail() {
  const { id } = useParams({ from: "/shorts/$id" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sellerPhone, setSellerPhone] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (k: string, v: unknown) => {
          maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
          eq: (k: string, v: unknown) => { maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }> };
        };
      };
    };
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
    storage: { from: (b: string) => { createSignedUrl: (p: string, e: number) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }> } };
  };

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await sb.from("shorts_public").select("id,user_id,title,description,thumbnail_path,duration_seconds,price_usd,views_count").eq("id", id).maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data as ProjectPub | null;
    },
  });

  const { data: myPurchase } = useQuery({
    queryKey: ["purchase", id, user?.id],
    enabled: !!user && !!project && user!.id !== project!.user_id,
    queryFn: async () => {
      const res = await sb.from("project_purchases").select("id,status,created_at").eq("project_id", id).eq("buyer_id", user!.id).maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data as Purchase | null;
    },
  });

  const isOwner = !!user && !!project && user.id === project.user_id;
  const isApproved = myPurchase?.status === "approved";

  // Load video URL when allowed (Cloudinary URLs are direct; legacy storage paths get a signed URL)
  useEffect(() => {
    if (!user || !project) return;
    if (!isOwner && !isApproved) return;
    (async () => {
      const { data, error } = await sb.rpc("get_project_video_path", { _project_id: project.id });
      if (error || !data) return;
      const path = String(data);
      if (/^https?:\/\//i.test(path)) {
        setVideoUrl(path);
      } else {
        const pathRes = await sb.storage.from("shorts").createSignedUrl(path, 3600);
        if (pathRes.data) setVideoUrl(pathRes.data.signedUrl);
      }
    })();
  }, [user, project, isOwner, isApproved]);


  const handleBuy = async () => {
    if (!user) return toast.error("سجّل دخولك للشراء");
    if (!project) return;
    const res = await sb.rpc("request_purchase", { _project_id: project.id });
    if (res.error) return toast.error(res.error.message);
    setSellerPhone(String(res.data ?? ""));
    qc.invalidateQueries({ queryKey: ["purchase", id, user.id] });
    toast.success("ظهر لك رقم البائع. حوّل المبلغ ثم اضغط «طلب تفعيل»");
  };

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">جاري التحميل...</div>;
  if (!project) return <div className="p-10 text-center text-muted-foreground">المشروع غير موجود.</div>;

  const thumb = project.thumbnail_path ? (/^https?:\/\//i.test(project.thumbnail_path) ? project.thumbnail_path : publicUrl("shorts", project.thumbnail_path)) : undefined;
  const mins = Math.floor((project.duration_seconds ?? 0) / 60);
  const secs = (project.duration_seconds ?? 0) % 60;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/shorts" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> السوق</Link>
          <h1 className="text-sm font-black text-gradient-gold">تفاصيل المشروع</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-6 grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-black aspect-[9/16]">
          {videoUrl ? (
            <video src={videoUrl} controls playsInline className="h-full w-full object-cover" />
          ) : thumb ? (
            <div className="relative h-full w-full">
              <img src={thumb} alt={project.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-center">
                <div className="text-white">
                  <Lock className="mx-auto h-10 w-10 text-gold" />
                  <p className="mt-2 text-sm font-bold">اشترِ المشروع لمشاهدة الفيديو</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-black">{project.title || "مشروع بدون عنوان"}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{project.description}</p>

          <div className="flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 font-black text-gold"><DollarSign className="h-3 w-3" />{Number(project.price_usd).toFixed(2)} USD</span>
            <span className="flex items-center gap-1 rounded-full bg-card px-3 py-1"><Play className="h-3 w-3" /> {mins}:{String(secs).padStart(2, "0")}</span>
            <span className="rounded-full bg-card px-3 py-1">{project.views_count} مشاهدة</span>
          </div>

          {isOwner && (
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
              👑 هذا مشروعك. اذهب للوحة التحكم لإدارة طلبات الشراء.
              <Link to="/dashboard" className="mt-2 block text-center rounded-lg bg-gradient-gold py-2 font-black text-gold-foreground">لوحة التحكم</Link>
            </div>
          )}

          {!isOwner && !myPurchase && (
            <button onClick={handleBuy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold py-3 font-black text-gold-foreground shadow-gold">
              <ShoppingCart className="h-5 w-5" /> شراء بـ {Number(project.price_usd).toFixed(2)}$
            </button>
          )}

          {sellerPhone && myPurchase?.status === "pending" && (
            <div className="rounded-xl border border-gold bg-gold/10 p-4 space-y-2 text-sm">
              <p className="font-black">حوّل المبلغ لرقم فودافون كاش:</p>
              <a href={`tel:${sellerPhone}`} className="flex items-center justify-center gap-2 rounded-lg bg-background py-3 text-lg font-black text-gold">
                <Phone className="h-5 w-5" /> {sellerPhone}
              </a>
              <p className="text-xs text-muted-foreground">بعد التحويل اضغط على «طلب تفعيل» وانتظر موافقة البائع/المشرف.</p>
            </div>
          )}

          {myPurchase?.status === "pending" && !sellerPhone && (
            <button onClick={handleBuy} className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold py-3 font-black text-gold">
              <Clock className="h-5 w-5" /> طلبك معلق — عرض رقم البائع
            </button>
          )}

          {myPurchase?.status === "pending" && sellerPhone && (
            <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-center text-sm">
              <Clock className="mx-auto h-5 w-5 text-yellow-500" />
              <p className="mt-1 font-bold">طلب التفعيل قيد المراجعة</p>
              <p className="text-xs text-muted-foreground">سيتم فتح الفيديو فور موافقة البائع أو المشرف.</p>
            </div>
          )}

          {myPurchase?.status === "approved" && (
            <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-center text-sm">
              <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />
              <p className="mt-1 font-bold">تم التفعيل! استمتع بالمشروع 🎉</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
