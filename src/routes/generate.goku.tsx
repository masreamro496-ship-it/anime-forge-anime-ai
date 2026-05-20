import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { ArrowRight, Mic, Coins, Crown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/generate/goku")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: GokuPage,
});

const GOKU_COST = 10;

function GokuPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const [script, setScript] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const balance = profile?.credits ?? 0;
  const isPro = profile?.isPro;
  const wordLimit = isPro ? Infinity : 500;
  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;

  if (!isPro) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-border/50 backdrop-blur-md bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <Link to="/dashboard" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> العودة</Link>
            <span className="text-base font-black text-gradient-gold">صوت غوكو</span>
          </div>
        </header>
        <main className="container mx-auto max-w-xl px-4 py-20 text-center">
          <Crown className="mx-auto h-14 w-14 text-gold" />
          <h1 className="mt-4 text-3xl font-black text-gradient-gold">ميزة حصرية لأعضاء PRO</h1>
          <p className="mt-3 text-muted-foreground">استنساخ صوت غوكو متاح فقط لأعضاء الباقة الذهبية.</p>
          <Link to="/pro-upgrade" className="mt-6 inline-block rounded-xl bg-gradient-gold px-7 py-3 font-black text-gold-foreground shadow-gold">
            ترقية الآن — 50 جنيه
          </Link>
        </main>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (script.trim().length < 5) return toast.error("اكتب السكريبت المراد توليده");
    if (balance < GOKU_COST) return toast.error(`رصيدك غير كافٍ. تحتاج ${GOKU_COST} كريديت`);

    setSubmitting(true);
    try {
      const { error } = await supabase.from("generation_requests").insert({
        user_id: user.id,
        type: "goku_voice",
        prompt: script.trim(),
        credits_charged: GOKU_COST,
        status: "pending",
      });
      if (error) throw error;
      toast.success("تم إرسال السكريبت! قيد المراجعة من الأدمن");
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
          <Link to="/dashboard" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> العودة</Link>
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-gold" />
            <span className="text-base font-black text-gradient-gold">استنساخ صوت غوكو</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
            <Coins className="h-4 w-4 text-gold" /> <span className="font-black">{balance}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-10">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
            اكتب السكريبت الذي تريد توليده بصوت غوكو. سيُراجع الأدمن الطلب ويرفع الملف الصوتي النهائي إلى حسابك.
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold">السكريبت</label>
              <span className="text-xs text-muted-foreground">
                {wordCount} {isPro ? "(بلا حدود — PRO)" : `/ ${wordLimit} كلمة`}
              </span>
            </div>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="مثال: 'كاميهامي هاااا!' أنا غوكو، محارب الـ Saiyan، جئت لأنقذ الأرض..."
              rows={12}
              className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-3 text-base leading-relaxed"
              required
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-4">
            <div className="text-sm font-bold">تكلفة الإرسال</div>
            <div className="flex items-center gap-1 text-2xl font-black text-gradient-gold">
              <Coins className="h-5 w-5 text-gold" /> {GOKU_COST}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || balance < GOKU_COST}
            className="w-full rounded-xl bg-gradient-gold py-3 text-base font-black text-gold-foreground shadow-gold disabled:opacity-50"
          >
            {submitting ? "جاري الإرسال..." : "SEND DATA — إرسال السكريبت"}
          </button>
        </form>
      </main>
    </div>
  );
}
