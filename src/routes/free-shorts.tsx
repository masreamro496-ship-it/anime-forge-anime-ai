import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { signCloudinaryUpload } from "@/lib/cloudinary.functions";
import { ArrowRight, Upload, Play, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/free-shorts")({ component: FreeShortsPage });

const MAX_SEC = 30;
const MAX_BYTES = 100 * 1024 * 1024;
const EAGER_240P = "w_426,h_240,c_limit,q_auto:eco,vc_h264";

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

type FreeShort = { id: string; user_id: string; title: string; video_path: string; thumbnail_path: string | null; created_at: string };

function FreeShortsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const signFn = useServerFn(signCloudinaryUpload);

  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const { data: feed, refetch } = useQuery({
    queryKey: ["free-shorts"],
    queryFn: async () => {
      const sb = supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: unknown) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: FreeShort[] | null; error: { message: string } | null }> } } } } };
      const { data, error } = await sb.from("shorts").select("id,user_id,title,video_path,thumbnail_path,created_at").eq("kind", "free_short").order("created_at", { ascending: false }).limit(60);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const onPick = async (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) return toast.error("الحجم أكبر من 100MB");
    try {
      const m = await probeVideo(f);
      if (m.duration > MAX_SEC + 1) return toast.error(`الحد الأقصى ${MAX_SEC} ثانية (فيديوك ${Math.round(m.duration)} ث)`);
      setFile(f); setDuration(m.duration);
    } catch (e) { toast.error((e as Error).message); }
  };

  const handlePublish = async () => {
    if (!user) return navigate({ to: "/login", search: { redirect: "/free-shorts" } });
    if (!file) return toast.error("اختر ملف فيديو");
    setBusy(true); setProgress(2);
    try {
      const params = await signFn({ data: { folder: `free-shorts/${user.id}`, eager: EAGER_240P, resourceType: "video" } });
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
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 90)); };
        xhr.onload = () => { if (xhr.status < 300) resolve(JSON.parse(xhr.responseText)); else reject(new Error("Cloudinary error")); };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(fd);
      });
      setProgress(95);
      const playable = result.eager?.[0]?.secure_url ?? result.secure_url;
      const thumb = result.secure_url.replace("/video/upload/", "/video/upload/so_auto,w_540,h_960,c_fill,q_auto,f_jpg/").replace(/\.(mp4|mov|webm|mkv)$/i, ".jpg");

      const sb = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
      const { error } = await sb.rpc("create_free_short", {
        _title: title.trim().slice(0, 100) || "شورت جديد",
        _description: "",
        _video_path: playable,
        _thumbnail_path: thumb,
        _duration_seconds: Math.round(duration),
      });
      if (error) throw new Error(error.message);
      setProgress(100);
      toast.success("تم نشر شورتك! 🎉 يظهر الآن للجميع");
      setFile(null); setTitle(""); setProgress(0);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
      setProgress(0);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> الرئيسية</Link>
          <h1 className="text-base font-black text-gradient-gold">شورتس القوية</h1>
          <Link to="/profile" className="text-xs font-bold text-gold">Profile</Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-5">
        <section className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 to-transparent p-5">
          <div className="flex items-center gap-2 text-gold">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-xl font-black text-gradient-gold">انشر شورت قوي (30 ثانية)</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">فيديو مجاني قصير عام يظهر لكل زوار الموقع. لا يحتاج كريديت ولا سعر.</p>

          {!user ? (
            <Link to="/login" search={{ redirect: "/free-shorts" }} className="mt-4 block rounded-xl bg-gradient-gold py-3 text-center text-sm font-black text-gold-foreground">
              سجّل للنشر
            </Link>
          ) : (
            <div className="mt-4 space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="عنوان (اختياري)" className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm" />
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gold/40 bg-background/40 p-6">
                <Upload className="h-7 w-7 text-gold" />
                <span className="text-sm font-bold">{file?.name ?? "إرفاق ملف فيديو (≤30 ثانية)"}</span>
                {file && <span className="text-xs text-muted-foreground">{Math.round(duration)}ث · {(file.size / 1024 / 1024).toFixed(1)}MB</span>}
                <input type="file" accept="video/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
              </label>
              {progress > 0 && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-gradient-gold transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
              <button onClick={handlePublish} disabled={busy || !file} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-gold py-3 text-sm font-black text-gold-foreground disabled:opacity-50">
                <Send className="h-4 w-4" />
                {busy ? "جاري النشر..." : "نشر الشورت للجميع"}
              </button>
            </div>
          )}
        </section>

        <h3 className="text-sm font-black text-muted-foreground">أحدث الشورتس</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {feed?.map((s) => (
            <a key={s.id} href={s.video_path} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative aspect-[9/16] bg-black">
                {s.thumbnail_path ? (
                  <img src={s.thumbnail_path} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground"><Play className="h-8 w-8" /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <Play className="absolute bottom-2 right-2 h-5 w-5 text-white" />
              </div>
              <div className="p-2">
                <h4 className="line-clamp-1 text-xs font-bold">{s.title || "شورت"}</h4>
              </div>
            </a>
          ))}
          {feed && feed.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
              لا توجد شورتس بعد. كن أول الناشرين!
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
