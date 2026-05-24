import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, User, DollarSign, Coins, Crown, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/profile")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login", search: { redirect: "/profile" } });
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { data, isLoading } = useProfile();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <h1 className="text-base font-black text-gradient-gold">الملف الشخصي</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-4">
        {isLoading && <p className="text-center text-sm text-muted-foreground">جاري التحميل...</p>}
        {data && (
          <>
            <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
              {data.profile?.avatar_url ? (
                <img src={data.profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold">
                  <User className="h-8 w-8 text-gold-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-lg font-black">{data.profile?.display_name ?? "مستخدم"}</h2>
                  {data.isPro && (
                    <span className="flex items-center gap-1 rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 text-[10px] font-black text-gold">
                      <Crown className="h-3 w-3" /> PRO
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <DollarSign className="h-4 w-4 text-gold" /> إجمالي الأرباح
                </div>
                <div className="mt-2 text-3xl font-black text-gradient-gold">
                  ${data.earningsUsd.toFixed(2)}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">من مبيعات مشاريع فودافون كاش الناجحة</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <Coins className="h-4 w-4 text-gold" /> الكريديت
                </div>
                <div className="mt-2 text-3xl font-black">{data.credits}</div>
                <p className="mt-1 text-[10px] text-muted-foreground">رصيدك للأدوات والصوتيات</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link to="/dashboard" className="rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-bold">
                لوحة التحكم
              </Link>
              <Link to="/shorts" className="rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-bold">
                مشاريعي
              </Link>
              {data.isAdmin && (
                <Link to="/admin" className="rounded-xl bg-gradient-gold px-4 py-3 text-center text-sm font-black text-gold-foreground sm:col-span-2">
                  لوحة الأدمن
                </Link>
              )}
            </div>

            <button onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </button>
          </>
        )}
      </main>
    </div>
  );
}
