import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Crown, Sparkles, LogOut, Coins, ShieldCheck, Video, Mic, Receipt, Clock, CheckCircle2, XCircle, Play, DollarSign, Check, Gift, KeyRound, Copy } from "lucide-react";
import { useState, useEffect } from "react";
import { AdminChatBox } from "@/components/AdminChatBox";
import { toast } from "sonner";

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
  const qc = useQueryClient();
  const { data, isLoading } = useProfile();

  // --- تفعيل تلقائي لباقة Pro بعد إتمام الدفع عبر NOWPayments ---
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isSuccess = urlParams.get("payment") === "success";

      if (isSuccess && user) {
        try {
          const { error } = await supabase
            .from("profiles")
            .update({ is_pro: true })
            .eq("id", user.id);

          if (!error) {
            toast.success("🎉 تم تفعيل عمليتك وباقة PRO بنجاح!");
            qc.invalidateQueries({ queryKey: ["profile", user.id] });
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          console.error("خطأ أثناء تفعيل Pro:", err);
        }
      }
    };

    handlePaymentSuccess();
  }, [user, qc]);

  const { data: requests } = useQuery({
    queryKey: ["my-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("generation_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

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
            <span className="text-xl font-black text-gradient-gold">انمي فورج</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-accent">
             العودة لانمي فورج
            </Link>
            {data?.isAdmin && (
              <Link to="/admin" className="flex items-center gap-1 rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-sm font-bold text-gold">
                <ShieldCheck className="h-4 w-4" /> الأدمن
              </Link>
            )}
            <button onClick={handleSignOut} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold hover:bg-accent">
              <LogOut className="h-4 w-4" /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black">
            مرحباً، <span className="text-gradient-gold">{data?.profile?.display_name ?? user?.email?.split("@")[0]}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">لوحة التحكم الخاصة بك</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-muted-foreground"><Coins className="h-5 w-5" /> الكريديت</div>
            <div className="mt-3 text-3xl font-black text-gradient-gold">{isLoading ? "..." : data?.credits.toFixed(0)}</div>
          </div>

          <div className="rounded-2xl border border-green-500/40 bg-green-500/5 p-6 shadow-card">
            <div className="flex items-center gap-2 text-muted-foreground"><DollarSign className="h-5 w-5 text-green-400" /> الأرباح</div>
            <div className="mt-3 text-3xl font-black text-green-400">${(data?.earningsUsd ?? 0).toFixed(2)}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">من المشاريع المباعة</p>
          </div>

          <div className={`rounded-2xl border p-6 ${isPro ? "border-gold bg-card shadow-gold" : "border-border bg-card shadow-card"}`}>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Crown className={`h-5 w-5 ${isPro ? "text-gold" : ""}`} /> الباقة
            </div>
            <div className={`mt-3 text-2xl font-black ${isPro ? "text-gradient-gold" : ""}`}>{isPro ? "PRO" : "مجاني"}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">{isPro ? "2 مشاريع · حتى 30 د · 360p" : "مشروع واحد · 1-10 د · 360p"}</p>
            {!isPro && (
              <Link to="/pro-upgrade" className="mt-3 inline-block rounded-lg bg-gradient-gold px-3 py-1 text-[11px] font-black text-gold-foreground shadow-gold">
                ترقية والاشتراكات
              </Link>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-muted-foreground"><Receipt className="h-5 w-5" /> طلباتك</div>
            <div className="mt-3 text-3xl font-black">{requests?.filter((r) => r.status === "pending" || r.status === "in_review").length ?? 0}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">قيد المراجعة</p>
          </div>
        </div>

        <DailyGiftCard />
        {isPro && <ProCodeCard />}

        <PendingSales />

        {/* Quick actions */}
        <h2 className="mt-10 mb-4 text-xl font-black">أنشئ محتوى الآن</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <ActionCard
            to="/shorts/upload"
            icon={Play}
            title="مشروع جديد للبيع"
            desc={isPro ? "1-30 دقيقة · 360p · مشروعين" : "1-10 دقائق · 360p · مشروع واحد"}
            cost="ادخل سعرك"
          />
          <ActionCard
            to="/generate/video"
            icon={Video}
            title="توليد فيديو AI"
            desc="صورتي البداية والنهاية + وصف"
            cost="25 كريديت"
          />
          <ActionCard
            to="/generate/goku"
            icon={Mic}
            title="استنساخ صوت غوكو"
            desc={isPro ? "اكتب سكريبتك" : "حصري لأعضاء PRO"}
            cost={isPro ? "10 كريديت" : "PRO"}
            locked={!isPro}
          />
        </div>

        {/* Admin contact */}
        <h2 className="mt-10 mb-4 text-xl font-black">تواصل مع الإدارة</h2>
        <AdminChatBox />

        {/* Recent requests */}
        <h2 className="mt-10 mb-4 text-xl font-black">طلباتك الأخيرة</h2>
        <div className="space-y-2">
          {!requests?.length && (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
              لم تقم بإرسال أي طلبات بعد
            </div>
          )}
          {requests?.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <StatusIcon status={r.status} />
                <div>
                  <div className="text-sm font-bold">{r.type === "video" ? "فيديو AI" : "صوت غوكو"}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">{r.prompt}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ar-EG")}</span>
                {r.status === "completed" && r.result_url && (
                  <a href={r.result_url} target="_blank" className="rounded-lg bg-gradient-gold px-3 py-1.5 text-xs font-black text-gold-foreground">
                    تحميل
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, desc, cost, locked }: { to: string; icon: any; title: string; desc: string; cost: string; locked?: boolean }) {
  return (
    <Link to={to} className={`block rounded-2xl border p-6 shadow-card transition-transform hover:scale-[1.02] ${locked ? "border-border bg-card/60 opacity-80" : "border-border bg-card hover:border-gold"}`}>
      <div className="flex items-start justify-between">
        <Icon className="h-8 w-8 text-gold" />
        <span className="rounded-full bg-gold/10 px-3 py-1 text-xs font-bold text-gold">{cost}</span>
      </div>
      <h3 className="mt-4 text-lg font-black">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-5 w-5 text-green-400" />;
  if (status === "rejected") return <XCircle className="h-5 w-5 text-destructive" />;
  return <Clock className="h-5 w-5 text-yellow-400" />;
}

function PendingSales() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const sb = supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: unknown) => { eq: (k: string, v: unknown) => { order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: { message: string } | null }> } } } }; rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };

  const { data: pending } = useQuery({
    queryKey: ["my-pending-sales", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await sb.from("project_purchases").select("id,project_id,buyer_id,price_usd,created_at,status").eq("seller_id", user!.id).eq("status", "pending").order("created_at", { ascending: false });
      if (res.error) throw new Error(res.error.message);
      return (res.data ?? []) as { id: string; project_id: string; buyer_id: string; price_usd: number; created_at: string }[];
    },
  });

  const approve = async (id: string) => {
    const res = await sb.rpc("approve_purchase", { _purchase_id: id });
    if (res.error) return toast.error(res.error.message);
    toast.success("تم تفعيل عملية الشراء وإضافة الأرباح");
    qc.invalidateQueries({ queryKey: ["my-pending-sales", user?.id] });
    qc.invalidateQueries({ queryKey: ["profile", user?.id] });
  };

  if (!pending?.length) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-black">طلبات شراء معلقة لمشاريعك ({pending.length})</h2>
      <div className="space-y-2">
        {pending.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-4">
            <div>
              <div className="text-sm font-bold">مشروع #{p.project_id.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground">من المشتري {p.buyer_id.slice(0, 8)} • {new Date(p.created_at).toLocaleString("ar-EG")}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-black text-green-400">${Number(p.price_usd).toFixed(2)}</span>
              <button onClick={() => approve(p.id)} className="flex items-center gap-1 rounded-lg bg-gradient-gold px-3 py-1.5 text-xs font-black text-gold-foreground">
                <Check className="h-4 w-4" /> موافقة تفعيل
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DailyGiftCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const sb = supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: unknown) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => { maybeSingle: () => Promise<{ data: { claimed_at: string } | null }> } } } } }; rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };

  const { data: last, refetch } = useQuery({
    queryKey: ["last-gift", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await sb.from("daily_gifts").select("claimed_at").eq("user_id", user!.id).order("claimed_at", { ascending: false }).limit(1).maybeSingle();
      return res.data?.claimed_at ?? null;
    },
  });

  const nextAvailable = last ? new Date(new Date(last).getTime() + 24 * 3600 * 1000) : null;
  const canClaim = !nextAvailable || nextAvailable.getTime() <= Date.now();
  const amount = profile?.isPro ? 100 : 25;

  const claim = async () => {
    const res = await sb.rpc("claim_daily_gift");
    if (res.error) return toast.error(res.error.message);
    toast.success(`تم إضافة ${amount} كريديت 🎁`);
    refetch();
    qc.invalidateQueries({ queryKey: ["profile", user?.id] });
  };

  return (
    <section className="mt-8 rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Gift className="h-8 w-8 text-purple-400" />
          <div>
            <div className="text-base font-black">هدية يومية: {amount} كريديت</div>
            <div className="text-xs text-muted-foreground">
              {canClaim ? "متاحة الآن!" : `العودة بعد ${Math.ceil((nextAvailable!.getTime() - Date.now()) / 3600000)} ساعة`}
            </div>
          </div>
        </div>
        <button onClick={claim} disabled={!canClaim} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-black text-white shadow-lg disabled:opacity-50">
          {canClaim ? "استلام" : "غير متاح"}
        </button>
      </div>
    </section>
  );
}

function ProCodeCard() {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const sb = supabase as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: unknown) => { order: (col: string, opts: { ascending: boolean }) => Promise<{ data: { code: string }[] | null }> } } }; rpc: (fn: string) => Promise<{ data: string | null; error: { message: string } | null }> };

  const { data: codes, refetch } = useQuery({
    queryKey: ["pro-codes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await sb.from("pro_codes").select("code").eq("user_id", user!.id).order("created_at", { ascending: false });
      return res.data ?? [];
    },
  });

  const generate = async () => {
    const res = await sb.rpc("generate_pro_code");
    if (res.error) return toast.error(res.error.message);
    setCode(res.data);
    toast.success("تم إنشاء الكود");
    refetch();
  };

  const copy = (c: string) => { navigator.clipboard.writeText(c); toast.success("تم النسخ"); };

  return (
    <section className="mt-4 rounded-2xl border border-gold/40 bg-gold/5 p-5">
      <div className="flex items-center gap-3">
        <KeyRound className="h-7 w-7 text-gold" />
        <div className="flex-1">
          <div className="text-base font-black">كود PRO للمواقع البرمجية</div>
          <p className="text-xs text-muted-foreground">كود رقمي عشوائي (9 أرقام) · يُستخدم في موقعَيْ برمجة مع Supabase · صلاحية 30 يوم.</p>
        </div>
        <button onClick={generate} className="rounded-lg bg-gradient-gold px-4 py-2 text-sm font-black text-gold-foreground shadow-gold">
          استلام الكود
        </button>
      </div>
      {(code || codes?.length) ? (
        <div className="mt-4 space-y-2">
          {(code ? [{ code }, ...(codes ?? []).filter((c) => c.code !== code)] : codes ?? []).slice(0, 5).map((c) => (
            <div key={c.code} className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2">
              <code className="text-xs font-mono">{c.code}</code>
              <button onClick={() => copy(c.code)} className="text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

