import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { signCloudinaryUpload } from "@/lib/cloudinary.functions";
import { createAnimeMedia } from "@/lib/anime-media.functions";
import { toast } from "sonner";
import { ArrowRight, Upload, Film, Video as VideoIcon, ImageIcon, Coins, Play, ShoppingCart, Loader2 } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { purchaseAnimeMedia } from "@/lib/anime-media.functions";

export const Route = createFileRoute("/anime-market")({
  head: () => ({
    meta: [
      { title: "سوق الأنمي — نشر وشراء فيديوهات وأفلام أنمي" },
      { name: "description", content: "انشر فيديوهات وأفلام الأنمي الخاصة بك وبيعها بالكريدت، أو اشترِ من إنتاج مبدعين آخرين." },
    ],
  }),
  component: AnimeMarketPage,
});

const VIDEO_EAGER_480 = "w_854,h_480,c_limit,q_auto:good,vc_h264";
const IMAGE_EAGER = "w_720,h_405,c_fill,q_auto:good";
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

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
  created_at: string;
  author_is_pro?: boolean;
  author_is_moderator?: boolean;
};

function probeVideo(file: File): Promise<{ duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { const d = v.duration; URL.revokeObjectURL(url); resolve({ duration: d }); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("ملف فيديو غير صالح")); };
    v.src = url;
  });
}

type CloudSignParams = { cloud_name: string; api_key: string; timestamp: number; signature: string; folder: string; eager: string | null; resource_type: string };

function uploadToCloudinary(file: File, params: CloudSignParams, onProgress: (p: number) => void): Promise<{ secure_url: string }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", params.api_key);
    fd.append("timestamp", String(params.timestamp));
    fd.append("signature", params.signature);
    fd.append("folder", params.folder);
    if (params.eager) fd.append("eager", params.eager);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${params.cloud_name}/${params.resource_type}/upload`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 90)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
      else { let m = `فشل الرفع (${xhr.status})`; try { m = JSON.parse(xhr.responseText)?.error?.message ?? m; } catch { /* ignore */ } reject(new Error(m)); }
    };
    xhr.onerror = () => reject(new Error("خطأ شبكة أثناء الرفع"));
    xhr.send(fd);
  });
}

function fmtDur(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0 ? `${h}س ${m}د` : `${m}:${s.toString().padStart(2, "0")}`;
}

function AnimeMarketPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"browse" | "upload">("browse");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["anime_media_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anime_media")
        .select("id,user_id,kind,title,description,thumbnail_path,duration_seconds,price_credits,purchases_count,created_at,author_is_pro,author_is_moderator")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as MediaRow[];
    },
  });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4 rotate-180" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-gold" />
            <span className="text-lg font-black text-gradient-gold">سوق الأنمي</span>
          </div>
        </div>
        <div className="container mx-auto flex gap-2 px-4 pb-3">
          <button onClick={() => setTab("browse")} className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${tab === "browse" ? "bg-gradient-gold text-gold-foreground shadow-gold" : "border border-border bg-card text-foreground"}`}>
            تصفّح المحتوى
          </button>
          <button onClick={() => setTab("upload")} className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${tab === "upload" ? "bg-gradient-gold text-gold-foreground shadow-gold" : "border border-border bg-card text-foreground"}`}>
            نشر جديد
          </button>
        </div>
      </header>

      {tab === "browse" && (
        <section className="container mx-auto px-4 py-6">
          {isLoading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">جاري التحميل...</p>
          ) : (data?.length ?? 0) === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
              <Film className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">لا يوجد محتوى بعد. كن أول من ينشر!</p>
              <button onClick={() => setTab("upload")} className="mt-4 rounded-xl bg-gradient-gold px-5 py-2 text-sm font-black text-gold-foreground shadow-gold">
                انشر أول فيديو
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data!.map((m) => (
                <div key={m.id} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-gold hover:shadow-gold">
                  <Link to="/anime-market/$id" params={{ id: m.id }} className="block">
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      {m.thumbnail_path ? (
                        <img src={m.thumbnail_path} alt={m.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center"><Film className="h-10 w-10 text-muted-foreground" /></div>
                      )}
                      <span className="absolute right-2 top-2 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white">
                        {m.kind === "anime_movie" ? "فيلم" : "فيديو"}
                      </span>
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {fmtDur(m.duration_seconds)}
                      </span>
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/90 text-gold-foreground shadow-2xl">
                          <Play className="h-5 w-5 fill-current" />
                        </span>
                      </div>
                    </div>
                    <div className="p-3 pb-2">
                      <h3 className="line-clamp-1 flex items-center gap-1 text-sm font-black">
                        {m.title}
                        {m.author_is_moderator && <VerifiedBadge variant="gold" size={15} />}
                        {!m.author_is_moderator && m.author_is_pro && <VerifiedBadge variant="blue" size={15} />}
                      </h3>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-black text-gold">
                          <Coins className="h-3 w-3" /> {m.price_credits} كريدت
                        </span>
                        <span className="text-[10px] text-muted-foreground">{m.purchases_count} مبيعة</span>
                      </div>
                    </div>
                  </Link>
                  <div className="px-3 pb-3">
                    <BuyButton id={m.id} price={m.price_credits} isOwner={user?.id === m.user_id} onBought={() => refetch()} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "upload" && (
        <section className="container mx-auto max-w-2xl px-4 py-6">
          {!user ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm">سجّل دخولك لنشر فيديو</p>
              <Link to="/login" className="mt-3 inline-block rounded-xl bg-gradient-gold px-5 py-2 text-sm font-black text-gold-foreground shadow-gold">تسجيل الدخول</Link>
            </div>
          ) : (
            <UploadForm onDone={() => { setTab("browse"); refetch(); }} />
          )}
        </section>
      )}
    </div>
  );
}

function BuyButton({ id, price, isOwner, onBought }: { id: string; price: number; isOwner: boolean; onBought: () => void }) {
  const navigate = useNavigate();
  const buyFn = useServerFn(purchaseAnimeMedia);
  const [busy, setBusy] = useState(false);

  if (isOwner) {
    return (
      <button
        onClick={() => navigate({ to: "/anime-market/$id", params: { id } })}
        className="w-full rounded-xl border border-border bg-card py-2.5 text-xs font-black text-foreground"
      >
        مشاهدة (محتواك)
      </button>
    );
  }

  const buy = async () => {
    setBusy(true);
    try {
      await buyFn({ data: { media_id: id } });
      toast.success("تم الشراء! جاري فتح المشغل...");
      onBought();
      await navigate({ to: "/anime-market/$id", params: { id } });
    } catch (e) {
      const msg = (e as Error).message;
      if (/auth|401|unauthor/i.test(msg)) { toast.error("سجّل دخولك أولاً"); void navigate({ to: "/login" }); }
      else if (/already|مشترى|purchased/i.test(msg)) { await navigate({ to: "/anime-market/$id", params: { id } }); }
      else toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <button
      onClick={buy}
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 py-3 text-sm font-black text-white shadow-[0_8px_24px_-10px_rgba(34,197,94,0.8)] transition hover:scale-[1.01] disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
      {busy ? "جاري الشراء..." : `شراء بـ ${price} كريدت ومشاهدة`}
    </button>
  );
}

function UploadForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const signFn = useServerFn(signCloudinaryUpload);
  const createFn = useServerFn(createAnimeMedia);

  const [kind, setKind] = useState<"anime_video" | "anime_movie">("anime_video");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [meta, setMeta] = useState<{ duration: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const maxSec = kind === "anime_movie" ? 2 * 60 * 60 : 30 * 60;
  const maxPrice = kind === "anime_movie" ? 200 : 100;
  const maxLabel = kind === "anime_movie" ? "ساعتين" : "30 دقيقة";

  const onPickVideo = async (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) return toast.error("الحد الأقصى 2GB");
    try {
      const m = await probeVideo(f);
      if (m.duration > maxSec + 5) return toast.error(`المدة أطول من ${maxLabel}`);
      setVideo(f); setMeta(m);
    } catch (e) { toast.error((e as Error).message); }
  };

  const submit = async () => {
    if (!video || !meta) return toast.error("ارفع ملف فيديو");
    if (title.trim().length < 2) return toast.error("اكتب عنواناً");
    const priceNum = Number(price);
    if (!priceNum || priceNum < 1) return toast.error("حدّد سعراً");
    if (priceNum > maxPrice) return toast.error(`الحد الأقصى ${maxPrice} كريدت`);

    setSubmitting(true);
    try {
      // upload video
      setProgress(2);
      const vs = await signFn({ data: { folder: "anime_media/videos", eager: VIDEO_EAGER_480, resourceType: "video" } });
      const vres = await uploadToCloudinary(video, vs, setProgress);
      // upload thumbnail (optional)
      let thumbUrl: string | undefined;
      if (thumb) {
        const ts = await signFn({ data: { folder: "anime_media/thumbs", eager: IMAGE_EAGER, resourceType: "image" } });
        const tres = await uploadToCloudinary(thumb, ts, () => { /* noop */ });
        thumbUrl = tres.secure_url;
      }
      setProgress(95);
      const { id } = await createFn({ data: {
        kind, title, description,
        video_url: vres.secure_url,
        thumbnail_url: thumbUrl,
        duration_seconds: meta.duration,
        price_credits: priceNum,
      }});
      setProgress(100);
      toast.success("تم النشر بنجاح 🎉");
      onDone();
      navigate({ to: "/anime-market/$id", params: { id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSubmitting(false); setProgress(0); }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex gap-2">
        <button onClick={() => setKind("anime_video")} className={`flex-1 rounded-xl border-2 p-3 text-sm font-black transition ${kind === "anime_video" ? "border-gold bg-gold/15 text-gold" : "border-border"}`}>
          <VideoIcon className="mx-auto mb-1 h-5 w-5" /> فيديو أنمي (30د, 100 كريدت)
        </button>
        <button onClick={() => setKind("anime_movie")} className={`flex-1 rounded-xl border-2 p-3 text-sm font-black transition ${kind === "anime_movie" ? "border-gold bg-gold/15 text-gold" : "border-border"}`}>
          <Film className="mx-auto mb-1 h-5 w-5" /> فيلم أنمي (ساعتين, 200 كريدت)
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-bold">العنوان</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="عنوان جذاب..." />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-bold">وصف مختصر (اختياري)</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-bold">ملف الفيديو (سيُشغّل بجودة 480p)</span>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-3 py-6 text-sm hover:border-gold">
          <Upload className="h-5 w-5 text-gold" />
          <span>{video ? video.name : "اختر فيديو"}</span>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => onPickVideo(e.target.files?.[0] ?? null)} />
        </label>
        {meta && <p className="mt-1 text-[11px] text-muted-foreground">المدة: {fmtDur(meta.duration)}</p>}
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-bold">صورة الغلاف (اختياري)</span>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-3 py-4 text-sm hover:border-gold">
          <ImageIcon className="h-5 w-5 text-gold" />
          <span>{thumb ? thumb.name : "اختر صورة"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
        </label>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-bold">السعر بالكريدت (الحد الأقصى {maxPrice})</span>
        <div className="relative">
          <Coins className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
          <input type="number" min={1} max={maxPrice} value={price} onChange={(e) => setPrice(e.target.value)} className="w-full rounded-xl border border-border bg-background py-2 pl-3 pr-10 text-sm" placeholder={`مثال: ${Math.round(maxPrice / 2)}`} />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">تحصل على 80% من كل عملية بيع (المنصة 20%)</p>
      </label>

      {submitting && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-gold transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <button onClick={submit} disabled={submitting} className="w-full rounded-2xl bg-gradient-gold py-3 text-base font-black text-gold-foreground shadow-gold disabled:opacity-60">
        {submitting ? `جاري النشر... ${progress}%` : "نشر الآن"}
      </button>
    </div>
  );
}
