import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { uploadUserFile, publicUrl } from "@/lib/storage";
import { ArrowRight, Send, Image as ImageIcon, Mic, Paperclip, Trash2, MessageCircle, Crown, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/social")({
  head: () => ({
    meta: [
      { title: "التواصل الاجتماعي — محادثة مباشرة مع كل الزوار" },
      { name: "description", content: "دردشة عامة مباشرة لكل زوار الموقع. أرسل صور، صوت، وملفات. الرسائل تُحذف تلقائياً بعد 10 ساعات." },
    ],
  }),
  component: SocialPage,
});

type ChatRow = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  content: string | null;
  media_path: string | null;
  media_type: "image" | "audio" | "file" | null;
  is_admin: boolean;
  is_moderator: boolean;
  created_at: string;
};

function SocialPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [text, setText] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = !!profile?.isAdmin;
  const isModerator = !!profile?.roles?.includes("moderator");
  const canDeleteAny = isAdmin || isModerator;

  // Initial load + realtime
  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("chat_room_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      setMessages((data as ChatRow[]) ?? []);
    };
    load();
    const ch = supabase
      .channel("chat-room-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_room_messages" }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatRow]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_room_messages" }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== (payload.old as { id: string }).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const displayName = profile?.profile?.display_name || user?.email?.split("@")[0] || "زائر";

  const sendMessage = async (opts: { content?: string; mediaPath?: string; mediaType?: "image" | "audio" | "file" }) => {
    if (!user) return toast.error("سجّل دخولك لإرسال الرسائل");
    if (!opts.content?.trim() && !opts.mediaPath) return;
    setSending(true);
    try {
      const { error } = await (supabase as any).from("chat_room_messages").insert({
        user_id: user.id,
        display_name: displayName,
        avatar_url: avatarUrl || profile?.profile?.avatar_url || null,
        content: opts.content?.trim() || null,
        media_path: opts.mediaPath ?? null,
        media_type: opts.mediaType ?? null,
        is_admin: isAdmin,
        is_moderator: isModerator,
      });
      if (error) throw error;
      setText("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const uploadAndSend = async (file: File, type: "image" | "audio" | "file") => {
    if (!user) return toast.error("سجّل دخولك أولاً");
    if (file.size > 20 * 1024 * 1024) return toast.error("الحجم الأقصى 20MB");
    try {
      const path = await uploadUserFile("chat-media", user.id, file, type + "-");
      await sendMessage({ mediaPath: path, mediaType: type, content: text.trim() || undefined });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 4 * 1024 * 1024) return toast.error("صورة الشخصية أقل من 4MB");
    try {
      const path = await uploadUserFile("chat-media", user.id, file, "avatar-");
      setAvatarUrl(publicUrl("chat-media", path));
      toast.success("تم رفع صورتك الشخصية");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const toggleRecord = async () => {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    if (!user) return toast.error("سجّل دخولك أولاً");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const f = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        await uploadAndSend(f, "audio");
        setRecording(false);
      };
      rec.start();
      setRecording(true);
    } catch {
      toast.error("لا يمكن الوصول إلى الميكروفون");
    }
  };

  const deleteMsg = async (m: ChatRow) => {
    if (!user) return;
    if (m.user_id !== user.id && !canDeleteAny) return;
    if (!confirm("حذف هذه الرسالة؟")) return;
    const { error } = await (supabase as any).from("chat_room_messages").delete().eq("id", m.id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/50 bg-background/70 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> الرئيسية</Link>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            <span className="text-base font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">التواصل الاجتماعي</span>
          </div>
          <div className="w-16 text-left text-[10px] text-muted-foreground">تُحذف بعد 10س</div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto container mx-auto max-w-3xl px-3 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">لا توجد رسائل بعد. كن أول من يكتب!</div>
        )}
        {messages.map((m) => {
          const mine = m.user_id === user?.id;
          const mediaUrl = m.media_path ? publicUrl("chat-media", m.media_path) : null;
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <div className="shrink-0">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.display_name} className="h-9 w-9 rounded-full object-cover border border-border" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xs font-black text-white">
                    {m.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={`max-w-[80%] rounded-2xl border px-3 py-2 ${mine ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card border-border"}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-black">{m.display_name}</span>
                  {(m.is_admin || m.is_moderator) && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 px-1.5 py-0.5 text-[9px] font-black text-black shadow">
                      <Crown className="h-2.5 w-2.5" /> VIP {m.is_moderator ? "مشرف" : "أدمن"}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground mr-auto">{new Date(m.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
                  {(mine || canDeleteAny) && (
                    <button onClick={() => deleteMsg(m)} className="text-red-400 hover:text-red-500" title="حذف">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {m.content && <div className="text-sm whitespace-pre-wrap break-words">{m.content}</div>}
                {mediaUrl && m.media_type === "image" && (
                  <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
                    <img src={mediaUrl} alt="attachment" className="mt-2 max-h-64 rounded-lg" loading="lazy" />
                  </a>
                )}
                {mediaUrl && m.media_type === "audio" && (
                  <audio src={mediaUrl} controls className="mt-2 w-full" />
                )}
                {mediaUrl && m.media_type === "file" && (
                  <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-400 underline">
                    <Paperclip className="h-3 w-3" /> تحميل الملف
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-background/70 backdrop-blur-md">
        <div className="container mx-auto max-w-3xl px-3 py-2">
          {!user ? (
            <Link to="/login" className="block w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 text-center text-sm font-black text-white">
              سجّل دخولك للدردشة
            </Link>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300"
                >
                  {avatarUrl ? <img src={avatarUrl} alt="me" className="h-4 w-4 rounded-full object-cover" /> : <ImageIcon className="h-3 w-3" />}
                  إرفاق صورة شخصيتك (اختياري)
                </button>
                <span className="text-[10px] text-muted-foreground">اسمك: <b>{displayName}</b></span>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndSend(f, "image"); e.target.value = ""; }} />
              <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndSend(f, "file"); e.target.value = ""; }} />
              <div className="flex items-end gap-1.5">
                <button onClick={() => imgInputRef.current?.click()} className="rounded-lg border border-border bg-card p-2.5 hover:bg-accent" title="صورة">
                  <ImageIcon className="h-5 w-5 text-emerald-400" />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-border bg-card p-2.5 hover:bg-accent" title="ملف">
                  <Paperclip className="h-5 w-5 text-cyan-400" />
                </button>
                <button
                  onClick={toggleRecord}
                  className={`rounded-lg border p-2.5 ${recording ? "border-red-500 bg-red-500/20 animate-pulse" : "border-border bg-card hover:bg-accent"}`}
                  title="تسجيل صوت"
                >
                  <Mic className={`h-5 w-5 ${recording ? "text-red-400" : "text-yellow-400"}`} />
                </button>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage({ content: text }); } }}
                  rows={1}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <button
                  disabled={sending || !text.trim()}
                  onClick={() => sendMessage({ content: text })}
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 p-2.5 text-white shadow-lg disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
