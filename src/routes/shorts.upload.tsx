import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { signCloudinaryUpload } from "@/lib/cloudinary.functions";
import { ArrowRight, Upload, Video as VideoIcon, DollarSign, Phone, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/shorts/upload")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: NewProjectPage,
});

// Tier limits
const FREE_MAX_SEC = 10 * 60; // up to 10 minutes
const PRO_MAX_SEC = 30 * 60;  // up to 30 minutes
const MAX_BYTES = 500 * 1024 * 1024; // 500MB hard cap for upload

// Free quality (240p eager transform on Cloudinary)
const FREE_EAGER = "w_426,h_240,c_limit,q_auto:eco,vc_h264";

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

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  duration?: number;
  width?: number;
  height?: number;
  eager?: Array<{ secure_url: string }>;
};

function uploadToCloudinary(
  file: File,
  params: { cloud_name: string; api_key: string; timestamp: number; signature: string; folder: string; eager: string | null; resource_type: string },
  onProgress: (pct: number) => void,
): Promise<CloudinaryUploadResult> {
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
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResult); }
        catch { reject(new Error("Cloudinary returned invalid response")); }
      } else {
        let msg = `Cloudinary upload failed (${xhr.status})`;
        try { const j = JSON.parse(xhr.responseText); msg = j?.error?.message ?? msg; } catch { /* ignore */ }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(fd);
  });
}

function NewProjectPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const signFn = useServerFn(signCloudinaryUpload);

  const isPro = !!profile?.isPro;
  const maxSec = isPro ? PRO_MAX_SEC : FREE_MAX_SEC;
  const maxLabel = isPro ? "30 دقيقة" : "10 دقائق";
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
    if (f.size > MAX_BYTES) return toast.error("الحجم أكبر من 500MB");
    try {
      const m = await probeVideo(f);
      if (m.duration > maxSec + 1) return toast.error(`المدة المسموحة لك هي ${maxLabel} كحد أقصى (فيديوك ${Math.round(m.duration)} ث)`);
      if (m.duration < 1) return toast.error("الفيديو قصير جداً");
      setFile(f); setMeta(m);
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleSubmit = async () => {
    if (!user || !file) return;
    const priceNum = Number(priceUsd);
    if (!priceNum || priceNum <= 0) return toast.error("ادخل سعراً صحيحاً بالدولار");
    if (vodafonePhone.trim().length < 8) return toast.error("ادخل رقم فودافون كاش صحيح");
    if (description.trim().length < 5) return toast.error("اكتب وصفاً مختصراً للمشروع");
    if (title.trim().length < 2) return toast.error("اكتب عنواناً للمشروع");

    setSubmitting(true);
    setProgress(2);
    try {
      // 1) Get signed Cloudinary params (server signs with secret)
      const params = await signFn({
        data: {
          folder: `anime-forge/${user.id}`,
          eager: isPro ? undefined : FREE_EAGER,
          resourceType: "video",
        },
      });
      setProgress(5);

      // 2) Direct upload to Cloudinary
      const result = await uploadToCloudinary(file, params, (p) => setProgress(Math.max(5, p)));
      setProgress(92);

      // For free users prefer the 240p eager URL when available
      const playableUrl = !isPro && result.eager?.[0]?.secure_url ? result.eager[0].secure_url : result.secure_url;
      // Cloudinary thumbnail: derived JPG from the video
      const thumbnailUrl = result.secure_url.replace("/video/upload/", "/video/upload/so_auto,w_540,h_960,c_fill,q_auto,f_jpg/").replace(/\.(mp4|mov|webm|mkv)$/i, ".jpg");

      // 3) Persist project metadata via existing RPC
      const { error: rpcErr } = await (supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> }).rpc("create_project", {
        _title: title.trim().slice(0, 100),
        _description: description.trim().slice(0, 1000),
        _video_path: playableUrl,
        _thumbnail_path: thumbnailUrl,
        _duration_seconds: Math.round(meta?.duration ?? result.duration ?? 0),
        _price_usd: priceNum,
        _vodafone_phone: vodafonePhone.trim(),
      });
      if (rpcErr) throw rpcErr;

      setProgress(100);
      toast.success("تم نشر مشروعك! سيظهر فوراً للجميع 🎉");
      navigate({ to: "/shorts" });
    } catch (err) {
      const m = (err as Error).message ?? "حدث خطأ";
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
          <span className="text-xs opacity-80">
            حدّك الحالي: فيديو حتى <strong>{maxLabel}</strong> · جودة {isPro ? "عالية" : "240p"} (تحويل تلقائي عبر Cloudinary) · حتى <strong>{maxProjects}</strong> مشروع.
          </span>
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
            <div className="mb-1 flex justify-between text-xs"><span>جاري الرفع إلى Cloudinary...</span><span className="font-black text-gold">{progress}%</span></div>
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
