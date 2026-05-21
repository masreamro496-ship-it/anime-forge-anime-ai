import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { publicUrl } from "@/lib/storage";
import { Heart, MessageCircle, Share2, Upload, ArrowRight, Clock, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/shorts")({
  component: ShortsFeed,
});

type Short = {
  id: string;
  user_id: string;
  title: string;
  video_path: string;
  thumbnail_path: string | null;
  status: string;
  published_at: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
};

function ShortsFeed() {
  const { user } = useAuth();
  const { data: shorts, isLoading } = useQuery({
    queryKey: ["shorts", "feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shorts")
        .select("id,user_id,title,video_path,thumbnail_path,status,published_at,views_count,likes_count,comments_count")
        .in("status", ["test_queue", "published"])
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Short[];
    },
  });

  const { data: myProcessing } = useQuery({
    queryKey: ["shorts", "mine-processing", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("shorts")
        .select("id,title,thumbnail_path,scheduled_publish_at,status")
        .eq("user_id", user!.id)
        .eq("status", "processing")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> الرئيسية</Link>
          <h1 className="text-lg font-black text-gradient-gold">شورتس الأنمي</h1>
          {user ? (
            <Link to="/shorts/upload" className="flex items-center gap-1 rounded-lg bg-gradient-gold px-3 py-1.5 text-xs font-black text-gold-foreground shadow-gold">
              <Upload className="h-3.5 w-3.5" /> رفع
            </Link>
          ) : (
            <Link to="/login" className="rounded-lg border border-gold/50 px-3 py-1.5 text-xs font-bold text-gold">دخول</Link>
          )}
        </div>
      </header>

      {/* Processing queue strip */}
      {!!myProcessing?.length && (
        <div className="container mx-auto px-4 pt-4">
          <h2 className="mb-2 text-sm font-bold text-muted-foreground">قيد المعالجة (سينزل بعد ساعة)</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {myProcessing.map((p) => <ProcessingCard key={p.id} short={p as Short & { scheduled_publish_at: string }} />)}
          </div>
        </div>
      )}

      {/* Feed */}
      <main className="container mx-auto max-w-md px-2 py-4 space-y-6">
        {isLoading && <p className="text-center text-sm text-muted-foreground">جاري التحميل...</p>}
        {!isLoading && !shorts?.length && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
            لا توجد شورتس بعد. كن أول من ينشر! 🎬
          </div>
        )}
        {shorts?.map((s) => <ShortCard key={s.id} short={s} />)}
      </main>
    </div>
  );
}

function ProcessingCard({ short }: { short: Short & { scheduled_publish_at: string } }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(short.scheduled_publish_at).getTime() - Date.now()));
  useEffect(() => {
    const t = setInterval(() => setRemaining(Math.max(0, new Date(short.scheduled_publish_at).getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, [short.scheduled_publish_at]);
  const total = 60 * 60 * 1000;
  const pct = Math.min(100, Math.max(0, Math.round(((total - remaining) / total) * 100)));
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="shrink-0 w-32 overflow-hidden rounded-xl border border-border bg-card">
      {short.thumbnail_path && <img src={publicUrl("shorts", short.thumbnail_path)} className="aspect-[9/16] w-full object-cover opacity-60" alt="" />}
      <div className="p-2">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" /> {mins}:{secs.toString().padStart(2, "0")}</div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-gold" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-[10px] font-bold text-gold">{pct}%</div>
      </div>
    </div>
  );
}

function ShortCard({ short }: { short: Short }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(short.likes_count);
  const [viewed, setViewed] = useState(false);

  const videoSrc = publicUrl("shorts", short.video_path);
  const thumbSrc = short.thumbnail_path ? publicUrl("shorts", short.thumbnail_path) : undefined;
  const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/shorts/${short.id}`;

  // Check initial like state
  useEffect(() => {
    if (!user) return;
    supabase.from("shorts_likes").select("user_id").eq("short_id", short.id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [user, short.id]);

  // Auto-play on viewport intersection
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          el.play().catch(() => {});
          if (user && !viewed) {
            setViewed(true);
            supabase.from("shorts_views").insert({ short_id: short.id, viewer_id: user.id }).then(() => {});
          }
        } else {
          el.pause();
        }
      });
    }, { threshold: [0.6] });
    obs.observe(el);
    return () => obs.disconnect();
  }, [user, short.id, viewed]);

  const toggleLike = async () => {
    if (!user) return toast.error("سجّل دخولك للتفاعل");
    if (liked) {
      setLiked(false); setLikeCount((c) => c - 1);
      await supabase.from("shorts_likes").delete().eq("short_id", short.id).eq("user_id", user.id);
    } else {
      setLiked(true); setLikeCount((c) => c + 1);
      await supabase.from("shorts_likes").insert({ short_id: short.id, user_id: user.id });
    }
  };

  const share = async () => {
    const text = `شاهد هذا الشورت على Anime Forge:\n${shareLink}\n\nالمنصة: ${window.location.origin}`;
    if (navigator.share) {
      try { await navigator.share({ title: short.title || "شورت أنمي", text, url: shareLink }); return; } catch {}
    }
    await navigator.clipboard.writeText(text);
    toast.success("تم نسخ رابط الفيديو ورابط الموقع");
  };

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="relative aspect-[9/16] w-full bg-black">
        <video
          ref={videoRef}
          src={videoSrc}
          poster={thumbSrc}
          className="h-full w-full object-cover"
          loop
          playsInline
          muted
          controls
        />
        {short.status === "test_queue" && (
          <span className="absolute right-2 top-2 rounded-full bg-yellow-500/90 px-2 py-0.5 text-[10px] font-black text-black">طابور اختبار</span>
        )}
      </div>

      <div className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0 flex-1">
          {short.title && <h3 className="truncate text-sm font-black">{short.title}</h3>}
          <div className="mt-1 text-[11px] text-muted-foreground">{short.views_count} مشاهدة</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleLike} className={`flex flex-col items-center gap-0.5 text-xs ${liked ? "text-red-500" : "text-muted-foreground"}`}>
            <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
            <span className="font-bold">{likeCount}</span>
          </button>
          <button onClick={() => setShowComments((v) => !v)} className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground">
            <MessageCircle className="h-5 w-5" />
            <span className="font-bold">{short.comments_count}</span>
          </button>
          <button onClick={share} className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground">
            <Share2 className="h-5 w-5" />
            <span className="font-bold">مشاركة</span>
          </button>
        </div>
      </div>

      {showComments && <CommentsPanel shortId={short.id} onCountChange={() => qc.invalidateQueries({ queryKey: ["shorts", "feed"] })} />}
    </article>
  );
}

function CommentsPanel({ shortId, onCountChange }: { shortId: string; onCountChange: () => void }) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const { data: comments, refetch } = useQuery({
    queryKey: ["shorts", "comments", shortId],
    queryFn: async () => {
      const { data } = await supabase.from("shorts_comments").select("id,body,user_id,created_at").eq("short_id", shortId).order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const send = async () => {
    if (!user) return toast.error("سجّل دخولك للتعليق");
    const text = body.trim();
    if (!text) return;
    const { error } = await supabase.from("shorts_comments").insert({ short_id: shortId, user_id: user.id, body: text });
    if (error) return toast.error(error.message);
    setBody("");
    refetch();
    onCountChange();
  };

  return (
    <div className="border-t border-border bg-background/40 p-3 space-y-2">
      <div className="flex gap-2">
        <input value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} placeholder="اكتب تعليقاً..." className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <button onClick={send} className="rounded-lg bg-gradient-gold px-3 text-gold-foreground"><Send className="h-4 w-4" /></button>
      </div>
      <div className="max-h-60 space-y-1.5 overflow-y-auto">
        {!comments?.length && <p className="text-center text-xs text-muted-foreground py-2">لا تعليقات بعد</p>}
        {comments?.map((c) => (
          <div key={c.id} className="rounded-lg bg-card px-3 py-2 text-xs">
            <p className="text-foreground">{c.body}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString("ar-EG")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
