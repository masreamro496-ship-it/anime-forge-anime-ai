import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { uploadUserFile } from "@/lib/storage";
import { ArrowRight, Upload, Video, Sparkles, Coins } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/generate/video")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: VideoGenPage,
});

const VIDEO_COST = 25;
const FREE_WORD_LIMIT = 2000;
const PRO_WORD_LIMIT = 5000;

function VideoGenPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState("");
  const [startImage, setStartImage] = useState<File | null>(null);
  const [endImage, setEndImage] = useState<File | null>(null);
  const [duration, setDuration] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const wordLimit = profile?.isPro ? PRO_WORD_LIMIT : FREE_WORD_LIMIT;
  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const balance = profile?.credits ?? 0;
  const canAfford = balance >= VIDEO_COST;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!startImage || !endImage) return toast.error("الرجاء رفع صورتي البداية والنهاية");
    if (prompt.trim().length < 10) return toast.error("اكتب وصفاً (Prompt) تفصيلياً للمشهد");
    if (wordCount > wordLimit) return toast.error(`تجاوزت الحد المسموح (${wordLimit} كلمة)`);
    if (!canAfford) return toast.error(`رصيدك غير كافٍ. تحتاج ${VIDEO_COST} كريديت`);

    setSubmitting(true);
    try {
      const [startPath, endPath] = await Promise.all([
        uploadUserFile("gen-inputs", user.id, startImage, "start-"),
        uploadUserFile("gen-inputs", user.id, endImage, "end-"),
      ]);

      // Credits are deducted by the admin upon approval (Phase 1 — manual review flow).
      const { error } = await supabase.from("generation_requests").insert({
        user_id: user.id,
        type: "video",
        prompt: prompt.trim(),
        start_image_url: startPath,
        end_image_url: endPath,
        duration_seconds: duration,
        credits_charged: VIDEO_COST,
        status: "pending",
      });
      if (error) throw error;

      toast.success("تم إرسال طلبك! قيد المراجعة اليدوية من الأدمن");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 backdrop-blur-md bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm font-bold">
            <ArrowRight className="h-4 w-4" /> العودة
          </Link>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-gold" />
            <span className="text-base font-black text-gradient-gold">توليد فيديو AI</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
            <Coins className="h-4 w-4 text-gold" />
            <span className="font-black">{balance}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-10">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
            <Sparkles className="mb-2 h-5 w-5 text-gold" />
            ارفع <strong>صورتين</strong> فقط: صورة البداية وصورة النهاية. لا يُسمح برفع فيديوهات مباشرة.
            سيقوم الذكاء الاصطناعي بتوليد الانتقال السلس بينهما.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ImageDrop label="صورة البداية" file={startImage} onChange={setStartImage} />
            <ImageDrop label="صورة النهاية" file={endImage} onChange={setEndImage} />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold">وصف المشهد (Prompt)</label>
              <span className={`text-xs ${wordCount > wordLimit ? "text-destructive" : "text-muted-foreground"}`}>
                {wordCount} / {wordLimit} كلمة {profile?.isPro && "(PRO)"}
              </span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="مثال: شخصية أنمي تقف على جبل عالٍ، الرياح تحرّك شعرها، ثم تطير نحو السماء بسرعة..."
              rows={10}
              className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-3 text-base leading-relaxed"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold">مدة الفيديو</label>
              <span className="text-sm font-black text-gold">{duration} ثانية</span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              step={1}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="mt-2 w-full accent-[color:var(--gold)]"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>1 ث</span><span>15 ث</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-4">
            <div className="text-sm">
              <div className="font-bold">تكلفة الإرسال</div>
              <div className="text-xs text-muted-foreground">يُخصم عند موافقة الأدمن</div>
            </div>
            <div className="flex items-center gap-1 text-2xl font-black text-gradient-gold">
              <Coins className="h-5 w-5 text-gold" />
              {VIDEO_COST}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !canAfford}
            className="w-full rounded-xl bg-gradient-gold py-3 text-base font-black text-gold-foreground shadow-gold disabled:opacity-50"
          >
            {submitting ? "جاري الإرسال..." : canAfford ? "SEND DATA — إرسال الطلب" : "رصيد الكريديت غير كافٍ"}
          </button>
        </form>
      </main>
    </div>
  );
}

function ImageDrop({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-background/40 p-6 hover:border-gold">
      <Upload className="h-6 w-6 text-gold" />
      <span className="text-sm font-bold">{label}</span>
      <span className="text-xs text-muted-foreground">{file?.name ?? "اضغط للرفع (PNG / JPG)"}</span>
      <input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0] ?? null)} className="hidden" />
    </label>
  );
}
