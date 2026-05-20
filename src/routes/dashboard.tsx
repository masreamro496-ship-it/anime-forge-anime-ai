import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Crown, Sparkles, LogOut, Coins, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: Dashboard,
});

function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useProfile();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const isPro = data?.isPro;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 backdrop-blur-md bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-gold" />
            <span className="text-xl font-black text-gradient-gold">شاهد أنمي الآن</span>
          </Link>
          <button onClick={handleSignOut} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold hover:bg-accent">
            <LogOut className="h-4 w-4" /> خروج
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black">
            مرحباً، <span className="text-gradient-gold">{data?.profile?.display_name ?? user?.email?.split("@")[0]}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">لوحة التحكم الخاصة بك</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Credits */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-muted-foreground"><Coins className="h-5 w-5" /> رصيد الكريديت</div>
            <div className="mt-3 text-4xl font-black text-gradient-gold">
              {isLoading ? "..." : data?.credits.toFixed(0)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">كريديت متبقي</p>
          </div>

          {/* PRO Status */}
          <div className={`rounded-2xl border p-6 ${isPro ? "border-gold bg-card shadow-gold ring-gold" : "border-border bg-card shadow-card"}`}>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Crown className={`h-5 w-5 ${isPro ? "text-gold" : ""}`} /> الباقة
            </div>
            <div className={`mt-3 text-2xl font-black ${isPro ? "text-gradient-gold" : ""}`}>
              {isPro ? "PRO الذهبية" : "مجاني"}
            </div>
            {isPro ? (
              <p className="mt-2 text-xs text-gold">تخفيضات خاصة على الصوت والفيديو مفعّلة</p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">قريباً: ترقية إلى PRO بـ 50 جنيه</p>
            )}
          </div>

          {/* Admin badge */}
          {data?.isAdmin && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-5 w-5 text-gold" /> الصلاحيات</div>
              <div className="mt-3 text-2xl font-black text-gold">مدير عام</div>
              <p className="mt-2 text-xs text-muted-foreground">لوحة الأدمن ستظهر في المرحلة الرابعة</p>
            </div>
          )}
        </div>

        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-gold" />
          <h2 className="mt-4 text-xl font-black">قريباً</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            نموذج توليد الفيديو (صورتين + 3 صوتيات + اختيار الجودة)، صفحة الدفع، ولوحة الأدمن — ستضاف في المراحل التالية.
          </p>
        </div>
      </main>
    </div>
  );
}
