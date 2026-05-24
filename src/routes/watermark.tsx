import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { signCloudinaryUpload } from "@/lib/cloudinary.functions";
import { ArrowRight, Wand2, Upload, Coins, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/watermark")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { redirect: "/watermark" } });
  },
  component: WatermarkPage,
});

const MAX_SEC = 30;
const MAX_BYTES = 100 * 1024 * 1024;
const COST = 15;

// Cloudinary eager transform:
// 1) crop the right 15% off (where watermarks usually sit) + 7% from top & bottom
// 2) blur the right-edge band slightly for visual coverage
const EAGER = "c_crop,w_0.85,h_0.86,x_0,y_0.07,fl_relative/e_blur:800,c_crop,w_0.93,h_1,x_0,y_0,fl_relative";

async function probeVideo(file: File): Promise<{ duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { resolve({ duration: v.duration }); URL.revokeObjectURL(url); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("ملف فيديو غير صالح")); };
    v.src = url;
  });
}

type Job = { id: string; source_url: string; processed_url: string; duration_seconds: number | null; cost: number; created_at: string };

function WatermarkPage() {
  const { user } = useAuth();
  const { data: profile, refetch } = useProfile();
  const qc = useQueryClient();
  const signFn = useServerFn(signCloudinaryUpload);

  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const { data: jobs } = useQuery({
    queryKey: ["wm-jobs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const sb = supabase as unknown as { from: (t: string) => { select: (c: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: Job[] | null; error: { message: string } | null }> } } } };
      const { data, error } = await sb.from("watermark_jobs").select("id,source_url,processed_url,duration_seconds,cost,created_at").order("created_at", { ascending: false }).limit(30);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const onPick = async (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) return toast.error("الحجم أكبر من 100MB");
    try {
      const m = await probeVideo(f);
      if (m.duration > MAX_SEC + 1) return toast.error(`الحد الأقصى ${MAX_SEC} ثانية`);
      setFile(f); setDuration(m.duration);
    } catch (e) { toast.error((e as Error).message); }
  };

  const handle = async () => {
    if (!file || !user) return;
    if ((profile?.credits ?? 0) < COST) return toast.error(`تحتاج ${COST} كريديت — رصيدك ${profile?.credits ?? 0}`);
    setBusy(true); setProgress(2);
    try {
      const params = await signFn({ data: { folder: `watermark/${user.id}`, eager: EAGER, resourceType: "video" } });
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", params.api_key);
      fd.append("timestamp", String(params.timestamp));
      fd.append("signature", params.signature);
      fd.append("folder", params.folder);
      if (params.eager) fd.append("eager", params.eager);

      const result: { secure_url: string; eager?: Array<{ secure_url: string }> } = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${params.cloud_name}/video/upload`);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 85)); };
        xhr.onload = () => { if (xhr.status < 300) resolve(JSON.parse(xhr.responseText)); else reject(new Error("Cloudinary error")); };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(fd);
      });
      setProgress(92);
      const processedUrl = result.eager?.[0]?.secure_url ?? result.secure_url;

      const sb = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
      const { error } = await sb.rpc("spend_watermark_credits", {
        _source_url: result.secure_url,
        _processed_url: processedUrl,
        _duration_seconds: Math.round(duration),
      });
      if (error) throw new Error(error.message);
      setProgress(100);
      toast.success(`تمت المعالجة! خُصم ${COST} كريديت`);
      setFile(null); setProgress(0);
      refetch();
      qc.invalidateQueries({ queryKey: ["wm-jobs"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast.error((e as Error).message);
      setProgress(0);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> الرئيسية</Link>
          <h1 className="text-base font-black" style={{ color: "#a855f7" }}>حذف العلامة المائية</h1>
          <div className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-black" style={{ borderColor: "#a855f750", color: "#a855f7" }}>
            <Coins className="h-3 w-3" /> {profile?.credits ?? 0}
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-6 space-y-4">
        <section className="rounded-2xl border p-5" style={{ borderColor: "#a855f750", background: "linear-gradient(135deg, rgba(168,85,247,0.12), transparent)" }}>
          <div className="flex items-center gap-2" style={{ color: "#a855f7" }}>
            <Wand2 className="h-5 w-5" />
            <h2 className="text-lg font-black">معالجة متقدمة عبر Cloudinary</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">يُقتص إطار الفيديو من أعلى وأسفل (مع الحفاظ على المدة) ويُطبَّق ضباب على الجزء الأيمن. النتيجة <strong>خاصة بك فقط</strong> ولا يراها أحد آخر.</p>
          <div className="mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black" style={{ background: "#a855f7", color: "white" }}>
            التكلفة: {COST} كريديت
          </div>

          <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-background/40 p-6" style={{ borderColor: "#a855f740" }}>
            <Upload className="h-7 w-7" style={{ color: "#a855f7" }} />
            <span className="text-sm font-bold">{file?.name ?? "إرفاق فيديو (≤30 ثانية)"}</span>
            {file && <span className="text-xs text-muted-foreground">{Math.round(duration)}ث · {(file.size / 1024 / 1024).toFixed(1)}MB</span>}
            <input type="file" accept="video/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
          </label>

          {progress > 0 && (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full transition-all" style={{ width: `${progress}%`, background: "#a855f7" }} />
            </div>
          )}

          <button onClick={handle} disabled={busy || !file} className="mt-4 w-full rounded-xl py-3 text-sm font-black text-white disabled:opacity-50" style={{ background: "#a855f7" }}>
            {busy ? "جاري المعالجة..." : `معالجة الفيديو · ${COST} كريديت`}
          </button>
        </section>

        <h3 className="text-sm font-black text-muted-foreground">معالجاتك السابقة</h3>
        <div className="space-y-2">
          {jobs?.map((j) => (
            <div key={j.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
              <div className="min-w-0 text-xs">
                <div className="font-bold">{new Date(j.created_at).toLocaleString("ar-EG")}</div>
                <div className="text-muted-foreground">{j.duration_seconds ?? 0}ث · {j.cost} كريديت</div>
              </div>
              <a href={j.processed_url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-black text-white" style={{ background: "#a855f7" }}>
                <Download className="h-3 w-3" /> تحميل
              </a>
            </div>
          ))}
          {jobs && jobs.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-xs text-muted-foreground">لا توجد معالجات بعد</p>
          )}
        </div>
      </main>
    </div>
  );
}
