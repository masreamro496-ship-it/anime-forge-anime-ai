// قم بنسخ هذا الكود بالكامل واستبدال ملف SocialPage.tsx القديم
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { uploadUserFile, signedUrl } from "@/lib/storage";
import botAvatar from "@/assets/bot-admin-avatar.jpg";
import { ArrowRight, Send, Image as ImageIcon, Mic, Paperclip, Trash2, MessageCircle, Bot } from "lucide-react";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/VerifiedBadge";

// تعريف النوع ليتطابق مع قاعدة البيانات
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
  is_pro: boolean;
  created_at: string;
};

const BOT_NAME = "إدارة البوتات";

export const Route = createFileRoute("/social")({
  component: SocialPage,
});

function SocialPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // التأكد من الصلاحيات
  const isAdmin = !!profile?.isAdmin;
  const isModerator = !!profile?.roles?.includes("moderator");
  const canDeleteAny = isAdmin || isModerator;

  // جلب الرسائل
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("chat_room_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("Error fetching:", error);
        return;
      }
      setMessages(data as ChatRow[]);
    };

    fetchMessages();

    // اشتراك الوقت الفعلي (Realtime)
    const channel = supabase
      .channel("public:chat_room_messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_room_messages" }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatRow]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_room_messages" }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== (payload.old as { id: string }).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const sendMessage = async (content: string, mediaPath: string | null = null, mediaType: "image" | "audio" | "file" | null = null) => {
    if (!user) return toast.error("يجب تسجيل الدخول");
    
    setSending(true);
    const { error } = await supabase.from("chat_room_messages").insert({
      user_id: user.id,
      display_name: profile?.profile?.display_name || user.email?.split("@")[0] || "زائر",
      avatar_url: profile?.profile?.avatar_url || null,
      content: content.trim() || null,
      media_path: mediaPath,
      media_type: mediaType,
      is_admin: isAdmin,
      is_moderator: isModerator,
      is_pro: !!profile?.isPro,
    });

    if (error) {
      console.error("Insert Error:", error);
      toast.error("حدث خطأ أثناء الإرسال");
    } else {
      setText("");
    }
    setSending(false);
  };

  return (
    // ... (باقي كود الـ UI الخاص بك يبقى كما هو)
    // تأكد فقط من ربط أزرار الإرسال بدالة sendMessage أعلاه
    <div className="p-4">
       {/* UI Code */}
    </div>
  );
}
