import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { signCloudinaryUpload } from "@/lib/cloudinary.functions";
import { ArrowRight, Music, Play, Download, Upload, Coins } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/audio")({ component: AudioPage });

type Clip = { id: string; title: string; description: string; audio_url: string; duration_seconds: number | null; download_cost: number; created_at: string };

function AudioPage() {
  const { user } = useAuth();
  const { data: profile, refetch: refetchProfile } = useProfile();
  const qc = useQueryClient();
  const signFn = useServerFn(signCloudinaryUpload);

  const { data: clips, isLoading } = useQuery({
    queryKey: ["audio-clips"],
    queryFn: async () => {
      const sb = supabase as unknown as { from: (t: string) => { select: (c: string) => { order: (col: string, opts: { ascending: boolean }) => Promise<{ data: Clip[] | null; error: { message: string } | null }> } } };
      const { data, error } = await sb.from("audio_clips").select("id,title,description,audio_url,duration_seconds,download_cost,created_at").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const handleDownload = async (clip: Clip) => {
    if (!user) return toast.error("سجّل الدخول أولاً");
    if ((profile?.credits ?? 0) < clip.download_cost) return toast.error(`تحتاج ${clip.download_cost} كريديت — رصيدك ${profile?.credits ?? 0}`);
    const sb = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: string | null; error: { message: string } | null }> };
    const { data, error } = await sb.rpc("purchase_audio_download", { _clip_id: clip.id });
    if (error) return toast.error(error.message);
    toast.success(`تم خصم ${clip.download_cost} كريديت — جاري التحميل`);
    refetchProfile();
    qc.invalidateQueries({ queryKey: ["profile"] });
    if (data) window.open(data, "_blank");
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> الرئيسية</Link>
          <h1 className="text-base font-black text-gradient-gold">مكتبة الصوتيات</h1>
          {user && (
            <div className="flex items-center gap-1 rounded-lg border border-gold/30 bg-gold/5 px-2 py-1 text-xs font-black text-gold">
              <Coins className="h-3 w-3" /> {profile?.credits ?? 0}
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-sm">
          <div className="flex items-center gap-2 text-gold">
            <Music className="h-5 w-5" />
            <h2 className="font-black">صوتيات حصرية من إدارة الموقع</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">استمع مجاناً، التحميل بـ 5 كريديت لكل ملف.</p>
        </div>

        {profile?.isAdmin && <AdminUploadCard onUploaded={() => qc.invalidateQueries({ queryKey: ["audio-clips"] })} signFn={signFn} userId={user!.id} />}

        {isLoading && <p className="text-center text-sm text-muted-foreground">جاري التحميل...</p>}
        {clips && clips.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
            لا توجد ملفات صوتية بعد
          </div>
        )}

        <div className="space-y-2">
          {clips?.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black">{c.title || "ملف صوتي"}</h3>
                  {c.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}
                </div>
                <button onClick={() => handleDownload(c)} className="flex shrink-0 items-center gap-1 rounded-lg bg-gradient-gold px-3 py-1.5 text-xs font-black text-gold-foreground">
                  <Download className="h-3.5 w-3.5" /> تحميل · {c.download_cost}
                </button>
              </div>
              <audio controls src={c.audio_url} className="mt-3 w-full" preload="none">
                <Play className="h-4 w-4" />
              </audio>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function AdminUploadCard({ onUploaded, signFn, userId }: { onUploaded: () => void; signFn: ReturnType<typeof useServerFn<typeof signCloudinaryUpload>>; userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState(5);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const handle = async () => {
    if (!file) return toast.error("اختر ملفاً");
    setBusy(true); setProgress(2);
    try {
      const params = await signFn({ data: { folder: `audio/${userId}`, resourceType: "video" } });
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", params.api_key);
      fd.append("timestamp", String(params.timestamp));
      fd.append("signature", params.signature);
      fd.append("folder", params.folder);

      const result: { secure_url: string; duration?: number } = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${params.cloud_name}/video/upload`);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 90)); };
        xhr.onload = () => { if (xhr.status < 300) resolve(JSON.parse(xhr.responseText)); else reject(new Error("Cloudinary error")); };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(fd);
      });

      const sb = supabase as unknown as { from: (t: string) => { insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }> } };
      const { error } = await sb.from("audio_clips").insert({
        uploader_id: userId,
        title: title.trim().slice(0, 100) || file.name,
        description: description.trim().slice(0, 500),
        audio_url: result.secure_url,
        duration_seconds: Math.round(result.duration ?? 0),
        download_cost: Math.max(1, Math.floor(cost)),
      });
      if (error) throw new Error(error.message);
      toast.success("تم رفع الصوت");
      setFile(null); setTitle(""); setDescription(""); setProgress(0);
      onUploaded();
    } catch (e) { toast.error((e as Error).message); setProgress(0); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-gold/40 bg-gold/5 p-4">
      <div className="flex items-center gap-2 text-xs font-black text-gold">
        <Upload className="h-4 w-4" /> رفع صوت جديد (أدمن فقط)
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <input type="number" min={1} value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-xs">
          <Upload className="h-4 w-4" />
          <span className="truncate">{file?.name ?? "اختر ملف صوتي"}</span>
          <input type="file" accept="audio/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      {progress > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-gold" style={{ width: `${progress}%` }} />
        </div>
      )}
      <button onClick={handle} disabled={busy || !file} className="w-full rounded-lg bg-gradient-gold py-2 text-xs font-black text-gold-foreground disabled:opacity-50">
        {busy ? "جاري الرفع..." : "رفع الصوت"}
      </button>
    </div>
  );
}
