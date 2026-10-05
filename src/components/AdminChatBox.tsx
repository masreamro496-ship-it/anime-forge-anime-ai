import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { listMyAdminMessages, sendAdminMessage } from "@/lib/ranks.functions";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

export function AdminChatBox() {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const listFn = useServerFn(listMyAdminMessages);
  const sendFn = useServerFn(sendAdminMessage);

  const { data: messages, refetch } = useQuery({
    queryKey: ["admin-messages", "mine", user?.id],
    enabled: !!user,
    queryFn: () => listFn(),
  });

  const send = async () => {
    if (!user) return toast.error("سجّل دخولك أولاً");
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const res = await sendFn({ data: { body: text } }).catch(() => null);
    setSending(false);
    if (!res?.ok) return toast.error("تعذّر إرسال الرسالة، جرّب تاني");
    setBody("");
    toast.success("تم إرسال رسالتك للإدارة ✅");
    refetch();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-gold" />
        <h3 className="text-base font-black">تواصل مع الإدارة</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">اكتب أي رسالة أو شكوى وستصل للأدمن مباشرة.</p>
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="رسالتك للإدارة..."
          className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <button onClick={send} disabled={sending || !body.trim()} className="self-end rounded-lg bg-gradient-gold px-4 py-2 text-gold-foreground shadow-gold disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </div>

      {!!messages?.length && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground">رسائلك السابقة:</p>
          {messages.map((m) => (
            <div key={m.id} className="rounded-lg border border-border bg-background/50 p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className={`font-bold ${m.is_read ? "text-green-400" : "text-yellow-400"}`}>
                  {m.is_read ? "✓ قُرئت" : "⏳ بانتظار القراءة"}
                </span>
                <span className="text-muted-foreground">{new Date(m.created_at).toLocaleString("ar-EG")}</span>
              </div>
              <p className="mt-1 line-clamp-2">{m.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
