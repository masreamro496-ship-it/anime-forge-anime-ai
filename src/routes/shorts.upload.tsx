import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { uploadUserFile } from "@/lib/storage";
import { ArrowRight, Upload, Video as VideoIcon, Coins, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/shorts/upload")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: UploadPage,
});

const MAX_DURATION = 15;
const MAX_BYTES = 15 * 1024 * 1024; // ~15MB proxy for 480p economical
const PUBLISH_COST = 5;

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
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(v, 0, 0);
      c.toBlob((b) => {
        URL.revokeObjectURL(url);
        b ? resolve(b) : reject(new Error("فشل إنشاء صورة مصغرة"));
      }, "image/jpeg", 0.7);
    };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("فشل قراءة الفيديو")); };
    v.src = url;
  });
}

function UploadPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<{ duration: number; width: number; height: number } | null>(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const balance = profile?.credits ?? 0;
  const canAfford = balance >= PUBLISH_COST;

  const onPick = async (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) return toast.error("حجم الملف أكبر من 15MB — صدّر فيديوك بجودة 480p اقتصادية");
    try {
      const m = await probeVideo(f);
      if (m.duration > MAX_DURATION + 0.5) return toast.error(`المدة المسموحة 15 ثانية فقط (فيديوك ${m.duration.toFixed(1)} ث)`);
      if (m.height > 0 && m.width > m.height) toast("نصيحة: الفيديو أفقي — الشورتس بنسبة 9:16 (عمودي) أفضل", { icon: "ℹ️" });
      setFile(f);
      setMeta(m);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handlePublish = async () => {
    if (!user || !file) return;
    if (!canAfford) return toast.error(`تحتاج ${PUBLISH_COST} كريديت للنشر`);

    setSubmitting(true);
    setProgress(5);
    try {
      // 1) thumbnail
      const thumb = await captureThumbnail(file);
      setProgress(20);

      // 2) upload thumb + video
      const thumbFile = new File([thumb], `thumb-${Date.now()}.jpg`, { type: "image/jpeg" });
      const thumbPath = await uploadUserFile("shorts", user.id, thumbFile, "thumbs/");
      setProgress(40);
      const videoPath = await uploadUserFile("shorts", user.id, file, "videos/");
      setProgress(75);

      // 3) insert short row (scheduled far in the future; publish RPC sets +1h)
      const { data: inserted, error: insErr } = await supabase
        .from("shorts")
        .insert({
          user_id: user.id,
          title: title.trim().slice(0, 100),
          video_path: videoPath,
          thumbnail_path: thumbPath,
          duration_seconds: Math.round(meta?.duration ?? 0),
          status: "processing",
          scheduled_publish_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 50).toISOString(),
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      // 4) call publish_short RPC: deducts 5 credits + sets scheduled_publish_at = now+1h
      const { error: rpcErr } = await (supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> }).rpc("publish_short", { _short_id: inserted.id });
      if (rpcErr) throw rpcErr;

      setProgress(100);
      toast.success("تم النشر! سيظهر فيديوك على المنصة بعد ساعة من الآن");
      navigate({ to: "/shorts" });
    } catch (err) {
      toast.error((err as Error).message);
      setProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 backdrop-blur-md bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/shorts" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> الشورتس</Link>
          <div className="flex items-center gap-2"><VideoIcon className="h-5 w-5 text-gold" /><span className="font-black text-gradient-gold">رفع شورت</span></div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
            <Coins className="h-4 w-4 text-gold" /><span className="font-black">{balance}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-5">
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm leading-relaxed">
          📱 <strong>شورت أنمي بنسبة 9:16</strong> — أقصى مدة <strong>15 ثانية</strong>، جودة <strong>480p اقتصادية</strong> (حد أقصى 15MB). يتم نشره بعد <strong>ساعة كاملة</strong> من الضغط على «نشر».
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-bold">عنوان قصير (اختياري)</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="مثال: لقطة من معركة ناروتو 🔥"
            className="w-full rounded-lg border border-input bg-background px-4 py-2.5"
          />
        </label>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-background/40 p-8 hover:border-gold">
          <Upload className="h-8 w-8 text-gold" />
          <span className="text-sm font-bold">{file?.name ?? "اختر ملف الفيديو (MP4)"}</span>
          {meta && (
            <span className="text-xs text-muted-foreground">
              {meta.width}×{meta.height} • {meta.duration.toFixed(1)} ث • {(file!.size / 1024 / 1024).toFixed(1)}MB
            </span>
          )}
          <input type="file" accept="video/mp4,video/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        </label>

        {progress > 0 && (
          <div>
            <div className="mb-1 flex justify-between text-xs"><span>جاري المعالجة...</span><span className="font-black text-gold">{progress}%</span></div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-gradient-gold transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-4">
          <div className="text-sm"><div className="font-bold">تكلفة النشر</div><div className="text-xs text-muted-foreground">يُخصم فوراً عند الضغط على «نشر»</div></div>
          <div className="flex items-center gap-1 text-2xl font-black text-gradient-gold"><Coins className="h-5 w-5 text-gold" />{PUBLISH_COST}</div>
        </div>

        <button
          onClick={handlePublish}
          disabled={submitting || !file || !canAfford}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold py-3 text-base font-black text-gold-foreground shadow-gold disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
          {submitting ? "جاري الرفع..." : canAfford ? "نشر الشورت" : "رصيد غير كافٍ"}
        </button>
      </main>
    </div>
  );
}
