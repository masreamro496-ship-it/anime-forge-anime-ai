import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { uploadUserFile } from "@/lib/storage";
import { ArrowRight, Upload, Video as VideoIcon, DollarSign, Phone, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/shorts/upload")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: NewProjectPage,
});

const MAX_BYTES = 80 * 1024 * 1024; // ~80MB ceiling for 240p up to 30 min
const REGULAR_MAX_SEC = 2 * 60;
const PRO_MAX_SEC = 30 * 60;

async function probeVideo(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const meta = { duration: v.duration, width: v.videoWidth, height: v.videoHeight };
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("ملف فيديو غير صالح")); };
    v.src = url;
  });
}

async function captureThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    v.onloadeddata = () => { v.currentTime = Math.min(0.5, v.duration / 2); };
    v.onseeked = () => {
      const c = document.createElement("canvas");
      c.width = v.videoWidth; c.height = v.videoHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(v, 0, 0);
      c.toBlob((b) => { URL.revokeObjectURL(url); b ? resolve(b) : reject(new Error("فشل إنشاء صورة مصغرة")); }, "image/jpeg", 0.7);
    };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("فشل قراءة الفيديو")); };
    v.src = url;
  });
}

function NewProjectPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const isPro = !!profile?.isPro;
  const maxSec = isPro ? PRO_MAX_SEC : REGULAR_MAX_SEC;
  const maxLabel = isPro ? "30 دقيقة" : "دقيقتان";
  const maxProjects = isPro ? 2 : 1;

  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<{ duration: number; width: number; height: number } | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceUsd, setPriceUsd] = useState<string>("");
  const [vodafonePhone, setVodafonePhone] = useState("");
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const onPick = async (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) return toast.error("الحجم أكبر من 80MB — صدّر بجودة 240p اقتصادية");
    try {
      const m = await probeVideo(f);
      if (m.duration > maxSec + 1) return toast.error(`المدة المسموحة لك هي ${maxLabel} فقط (فيديوك ${Math.round(m.duration)} ث)`);
      setFile(f); setMeta(m);
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleSubmit = async () => {
    if (!user || !file) return;
    const priceNum = Number(priceUsd);
    if (!priceNum || priceNum <= 0) return toast.error("ادخل سعراً صحيحاً بالدولار");
    if (vodafonePhone.trim().length < 8) return toast.error("ادخل رقم فودافون كاش صحيح");
    if (description.trim().length < 5) return toast.error("اكتب وصفاً مختصراً للمشروع");

    setSubmitting(true);
    setProgress(5);
    try {
      const thumb = await captureThumbnail(file);
      setProgress(20);
      const thumbFile = new File([thumb], `thumb-${Date.now()}.jpg`, { type: "image/jpeg" });
      const thumbPath = await uploadUserFile("shorts", user.id, thumbFile, "thumbs/");
      setProgress(45);
      const videoPath = await uploadUserFile("shorts", user.id, file, "videos/");
      setProgress(80);

      const { error: rpcErr } = await (supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> }).rpc("create_project", {
        _title: title.trim().slice(0, 100),
        _description: description.trim().slice(0, 1000),
        _video_path: videoPath,
        _thumbnail_path: thumbPath,
        _duration_seconds: Math.round(meta?.duration ?? 0),
        _price_usd: priceNum,
        _vodafone_phone: vodafonePhone.trim(),
      });
      if (rpcErr) throw rpcErr;

      setProgress(100);
      toast.success("تم نشر مشروعك! سيظهر فوراً للجميع 🎉");
      navigate({ to: "/shorts" });
    } catch (err) {
      const m = (err as Error).message;
      if (m.includes("project limit reached")) toast.error(`وصلت للحد الأقصى للمشاريع (${maxProjects}). احذف مشروعاً قديماً أو رقّ لـ Pro.`);
      else if (m.includes("video too long")) toast.error(`الفيديو أطول من المسموح (${maxLabel})`);
      else toast.error(m);
      setProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 backdrop-blur-md bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/shorts" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> المشاريع</Link>
          <div className="flex items-center gap-2"><VideoIcon className="h-5 w-5 text-gold" /><span className="font-black text-gradient-gold">مشروع جديد</span></div>
          <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
            {isPro ? "Pro" : "مجاني"} · حد {maxProjects}
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-5">
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm leading-relaxed">
          💰 <strong>منصة مشاريع فودافون كاش</strong> — أنشئ مشروعك، ضع سعراً بالدولار ورقم فودافون كاش. المشتري يحوّل لك ثم يطلب التفعيل وأنت توافق.
          <br />
          <span className="text-xs opacity-80">حدّك الحالي: فيديو حتى <strong>{maxLabel}</strong> · جودة 240p · حتى <strong>{maxProjects}</strong> مشروع.</span>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-bold">عنوان المشروع</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="مثال: قالب مونتاج أنمي احترافي" className="w-full rounded-lg border border-input bg-background px-4 py-2.5" />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold">وصف المشروع</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={4} placeholder="اشرح للمشتري ماذا سيحصل عليه..." className="w-full rounded-lg border border-input bg-background px-4 py-2.5" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">السعر بالدولار</span>
            <div className="relative">
              <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gold" />
              <input type="number" min={1} step={0.01} value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} placeholder="5" className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pr-9 text-right" />
            </div>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold">رقم فودافون كاش</span>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gold" />
              <input value={vodafonePhone} onChange={(e) => setVodafonePhone(e.target.value)} placeholder="010xxxxxxxx" maxLength={20} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 pr-9" />
            </div>
          </label>
        </div>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-background/40 p-8 hover:border-gold">
          <Upload className="h-8 w-8 text-gold" />
          <span className="text-sm font-bold">{file?.name ?? "اختر ملف الفيديو (MP4)"}</span>
          {meta && (
            <span className="text-xs text-muted-foreground">
              {meta.width}×{meta.height} • {Math.round(meta.duration)} ث • {(file!.size / 1024 / 1024).toFixed(1)}MB
            </span>
          )}
          <input type="file" accept="video/mp4,video/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        </label>

        {progress > 0 && (
          <div>
            <div className="mb-1 flex justify-between text-xs"><span>جاري الرفع...</span><span className="font-black text-gold">{progress}%</span></div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-gradient-gold transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting || !file} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold py-3 text-base font-black text-gold-foreground shadow-gold disabled:opacity-50">
          <Send className="h-5 w-5" />
          {submitting ? "جاري النشر..." : "نشر المشروع"}
        </button>
      </main>
    </div>
  );
}
