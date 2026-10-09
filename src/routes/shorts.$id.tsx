import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getProject, requestProjectPurchase, reviewProjectPurchase } from "@/lib/projects.functions";
import { ArrowRight, DollarSign, Phone, ShoppingCart, CheckCircle2, Clock, Lock, Play, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/shorts/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل المشروع — انمي فورج" },
      { name: "description", content: "تفاصيل مشروع أنمي معروض للبيع وطريقة الدفع على محفظة البائع." },
      { property: "og:title", content: "تفاصيل المشروع — انمي فورج" },
      { property: "og:description", content: "شوف المشروع واشتريه بالتحويل على محفظة البائع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = useParams({ from: "/shorts/$id" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const getFn = useServerFn(getProject);
  const buyFn = useServerFn(requestProjectPurchase);
  const reviewFn = useServerFn(reviewProjectPurchase);

  const { data, isLoading } = useQuery({
    queryKey: ["project", id, user?.id],
    queryFn: () => getFn({ data: { id } }),
  });

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">جاري التحميل...</div>;
  if (!data) return <div className="p-10 text-center text-muted-foreground">المشروع غير موجود.</div>;
  const { project, isOwner, purchase, requests, walletPhone, videoUrl } = data;
  const mins = Math.floor((project.duration_seconds ?? 0) / 60);
  const secs = (project.duration_seconds ?? 0) % 60;
  const refresh = () => qc.invalidateQueries({ queryKey: ["project", id] });

  const handleBuy = async () => {
    if (!user) return toast.error("سجّل دخولك للشراء");
    try {
      await buyFn({ data: { id } });
      toast.success("ظهر لك رقم البائع. حوّل المبلغ وانتظر موافقته");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const review = async (purchaseId: string, approve: boolean) => {
    try {
      await reviewFn({ data: { purchaseId, approve } });
      toast.success(approve ? "تمت الموافقة ✅" : "تم الرفض");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/shorts" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> السوق</Link>
          <h1 className="text-sm font-black text-gradient-gold">تفاصيل المشروع</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="container mx-auto grid max-w-3xl gap-6 px-4 py-6 md:grid-cols-2">
        <div className="aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-muted">
          {videoUrl ? (
            <video src={videoUrl} controls playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="relative h-full w-full">
              {project.cover_url && <img src={project.cover_url} alt={project.title} className="h-full w-full object-cover" />}
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-center">
                <div>
                  <Lock className="mx-auto h-10 w-10 text-gold" />
                  <p className="mt-2 text-sm font-bold">اشترِ المشروع لمشاهدة الفيديو</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-black">{project.title}</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{project.description}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 font-black text-gold"><DollarSign className="h-3 w-3" />{Number(project.price_usd).toFixed(2)} USD</span>
            <span className="flex items-center gap-1 rounded-full bg-card px-3 py-1"><Wallet className="h-3 w-3" /> {project.wallet_type}</span>
            <span className="flex items-center gap-1 rounded-full bg-card px-3 py-1"><Play className="h-3 w-3" /> {mins}:{String(secs).padStart(2, "0")}</span>
            <span className="rounded-full bg-card px-3 py-1">{project.views_count} مشاهدة</span>
          </div>

          {isOwner && (
            <div className="space-y-2 rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
              <p className="font-black">👑 ده مشروعك — طلبات الشراء:</p>
              {!requests.length && <p className="text-xs text-muted-foreground">مفيش طلبات لسه.</p>}
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2 text-xs">
                  <span dir="ltr" className="truncate">{r.buyer_email ?? "مشتري"}</span>
                  {r.status === "pending" ? (
                    <div className="flex gap-1">
                      <button onClick={() => review(r.id, true)} className="rounded bg-primary px-2 py-1 font-bold text-primary-foreground">وصلت الفلوس</button>
                      <button onClick={() => review(r.id, false)} className="rounded border border-border px-2 py-1 font-bold">رفض</button>
                    </div>
                  ) : (
                    <span className="font-bold">{r.status === "approved" ? "✅ مفعّل" : "❌ مرفوض"}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isOwner && !purchase && (
            <button onClick={handleBuy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-black text-primary-foreground">
              <ShoppingCart className="h-5 w-5" /> شراء بـ {Number(project.price_usd).toFixed(2)}$
            </button>
          )}

          {!isOwner && purchase?.status === "pending" && walletPhone && (
            <div className="space-y-2 rounded-xl border border-gold bg-gold/10 p-4 text-sm">
              <p className="font-black">حوّل المبلغ على {project.wallet_type}:</p>
              <a href={`tel:${walletPhone}`} className="flex items-center justify-center gap-2 rounded-lg bg-background py-3 text-lg font-black text-gold" dir="ltr">
                <Phone className="h-5 w-5" /> {walletPhone}
              </a>
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> بعد التحويل البائع هيوافق والفيديو هيفتح لك.</p>
            </div>
          )}

          {purchase?.status === "approved" && (
            <div className="rounded-xl border border-border bg-card p-3 text-center text-sm">
              <CheckCircle2 className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-1 font-bold">تم التفعيل! استمتع بالمشروع 🎉</p>
            </div>
          )}
          {purchase?.status === "rejected" && (
            <p className="rounded-xl border border-destructive/40 p-3 text-center text-sm text-destructive">البائع رفض الطلب.</p>
          )}
        </div>
      </main>
    </div>
  );
}
