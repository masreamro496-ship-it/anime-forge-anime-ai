import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { sendChatMessage, loadChatHistory, clearChatHistory } from "@/lib/chat.functions";
import { ArrowRight, Send, Image as ImageIcon, RotateCcw, Coins, Rocket, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { redirect: "/chat" } });
  },
  component: ChatPage,
});

type Msg = { id?: string; role: "user" | "assistant"; content: string };

function ChatPage() {
  const { user } = useAuth();
  const { data: profile, refetch: refetchProfile } = useProfile();
  const sendFn = useServerFn(sendChatMessage);
  const loadFn = useServerFn(loadChatHistory);
  const clearFn = useServerFn(clearChatHistory);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [lastFailedPayload, setLastFailedPayload] = useState<{ message: string; imageDataUrl?: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadFn().then((r) => {
      setMessages((r.messages ?? []).map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content })));
    }).catch(() => {});
  }, [user, loadFn]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const balance = profile?.credits ?? 0;
  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const overLimit = wordCount > 1000;

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
      toast.error("عذراً، هذا الموقع مخصص للصور والأكواد فقط.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("صيغة غير مدعومة");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("الصورة كبيرة جداً (الحد 4MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const doSend = async (payload: { message: string; imageDataUrl?: string }) => {
    setSending(true);
    setLastFailedPayload(null);
    const optimisticUser: Msg = { role: "user", content: payload.message };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const res = await sendFn({ data: { ...payload, history } });
      if (!res.ok) {
        toast.error(res.error);
        setLastFailedPayload(payload);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      setInput("");
      setImage(null);
      refetchProfile();
    } catch (err) {
      toast.error((err as Error).message);
      setLastFailedPayload(payload);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (overLimit) return toast.error("يرجى تقسيم النص لمعالجة أدق.");
    if (balance < 5) return toast.error("رصيد الكريدت غير كافٍ. يرجى الشحن.");
    doSend({ message: input.trim(), imageDataUrl: image ?? undefined });
  };

  const handleRetry = () => {
    if (lastFailedPayload) doSend(lastFailedPayload);
  };

  const handleReset = async () => {
    if (!confirm("هل تريد مسح المحادثة كلها؟")) return;
    await clearFn();
    setMessages([]);
    setLastFailedPayload(null);
    toast.success("تم إعادة التهيئة");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/50 backdrop-blur-md bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm font-bold">
            <ArrowRight className="h-4 w-4" /> العودة
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            <span className="text-base font-black text-gradient-gold">Omni-Brain</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold hover:bg-accent"
              title="System Reset"
            >
              <RotateCcw className="h-3.5 w-3.5 inline" /> إعادة تهيئة
            </button>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
              <Coins className="h-4 w-4 text-gold" /> <span className="font-black">{balance}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 grid gap-4 lg:grid-cols-2">
        {/* LEFT — Chat */}
        <section className="flex flex-col rounded-2xl border border-border bg-card shadow-card min-h-[60vh] lg:min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-10">
                ابدأ محادثتك مع Omni-Brain · 5 كريديت/رسالة · حد 1000 كلمة
              </div>
            )}
            {messages.map((m, i) => (
              <div key={m.id ?? i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                  m.role === "user"
                    ? "bg-gradient-gold text-gold-foreground font-bold"
                    : "bg-background/60 border border-border"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="text-xs text-muted-foreground">… جاري التفكير</div>
            )}
            {lastFailedPayload && !sending && (
              <button onClick={handleRetry} className="mx-auto block rounded-lg bg-destructive/10 border border-destructive px-4 py-2 text-sm font-bold text-destructive">
                إعادة المحاولة
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-border p-3 space-y-2">
            {image && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background/40 p-2">
                <img src={image} alt="معاينة" className="h-12 w-12 rounded object-cover" />
                <span className="flex-1 text-xs text-muted-foreground truncate">صورة مرفقة (للتحليل البرمجي فقط)</span>
                <button type="button" onClick={() => setImage(null)} className="text-xs text-destructive font-bold">إزالة</button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <label className="cursor-pointer rounded-lg border border-border bg-background/40 p-2 hover:bg-accent">
                <ImageIcon className="h-5 w-5 text-gold" />
                <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب طلبك البرمجي..."
                rows={2}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
              />
              <button
                type="submit"
                disabled={sending || !input.trim() || overLimit || balance < 5}
                className="rounded-lg bg-gradient-gold p-2.5 text-gold-foreground shadow-gold disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className={overLimit ? "text-destructive font-bold" : "text-muted-foreground"}>
                {wordCount} / 1000 كلمة
              </span>
              <span className="text-muted-foreground">5 كريديت/إرسال</span>
            </div>
          </form>
        </section>

        {/* RIGHT — Live Preview / Last reply */}
        <section className="flex flex-col rounded-2xl border border-border bg-card shadow-card min-h-[40vh] lg:min-h-0">
          <div className="border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-black">Live Preview</span>
            <button
              type="button"
              onClick={() => toast.info("النشر متاح من زر Publish في أعلى يمين Lovable")}
              className="relative rounded-lg bg-purple-600 px-4 py-2 text-xs font-black text-white shadow-lg hover:bg-purple-700"
            >
              <Rocket className="h-3.5 w-3.5 inline ml-1" />
              نشر مواقع او تطبيقات
              <span className="absolute -top-2 -right-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                New
              </span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {messages.filter((m) => m.role === "assistant").slice(-1).map((m, i) => (
              <pre key={i} className="text-xs whitespace-pre-wrap break-words font-mono leading-relaxed">
                {m.content}
              </pre>
            ))}
            {messages.filter((m) => m.role === "assistant").length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-10">
                ستظهر آخر استجابة هنا للمعاينة
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
