import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowRight, Gift, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/wheel")({
  head: () => ({
    meta: [
      { title: "عجلة الحظ الأسبوعية — انمي فورج" },
      { name: "description", content: "لفّة واحدة كل أسبوع: اربح 25 أو 50 أو 100 كريدت، وفرصة نادرة لكرت فكة بـ 5 جنيه." },
      { property: "og:title", content: "عجلة الحظ الأسبوعية — انمي فورج" },
      { property: "og:description", content: "لفّ العجلة مرة كل أسبوع واربح كريدت أو كرت فكة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WheelPage,
});

const SEGMENTS = [
  { label: "25 كريدت", color: "#a855f7" },
  { label: "50 كريدت", color: "#06b6d4" },
  { label: "25 كريدت", color: "#8b5cf6" },
  { label: "100 كريدت", color: "#eab308" },
  { label: "25 كريدت", color: "#a855f7" },
  { label: "50 كريدت", color: "#06b6d4" },
  { label: "25 كريدت", color: "#8b5cf6" },
  { label: "كرت فكة 5ج", color: "#22c55e" },
];

type Prize = { spin_id: string; kind: string; amount: number };

function WheelPage() {
  const { user } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [nextAt, setNextAt] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("wheel_spins")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const last = data?.[0]?.created_at as string | undefined;
        if (!last) return;
        const next = new Date(new Date(last).getTime() + 7 * 24 * 3600 * 1000);
        if (next > new Date()) setNextAt(next.toLocaleString("ar-EG"));
      });
  }, [user]);

  const spin = async () => {
    if (!user) {
      toast.error("سجّل الدخول أولاً");
      return;
    }
    setSpinning(true);
    setPrize(null);
    const { data, error } = await supabase.rpc("spin_wheel" as never);
    if (error) {
      setSpinning(false);
      if (error.message.includes("weekly_limit")) {
        toast.error("لفّة واحدة فقط كل أسبوع — حاول لاحقاً");
      } else {
        toast.error(error.message);
      }
      return;
    }
    const p = data as unknown as Prize;
    const idx =
      p.kind === "cash_card_5" ? 7 : p.amount === 100 ? 3 : p.amount === 50 ? 1 : 0;
    const target = 360 * 6 + (360 - idx * 45 - 22.5);
    setAngle(target);
    window.setTimeout(() => {
      setSpinning(false);
      setPrize(p);
      setNextAt(new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleString("ar-EG"));
      toast.success(p.kind === "cash_card_5" ? "🎉 ربحت كرت فكة بـ 5 جنيه!" : `🎉 ربحت ${p.amount} كريدت!`);
    }, 4200);
  };

  const claimCard = async () => {
    if (!prize) return;
    if (!/^010\d{8}$/.test(phone)) {
      toast.error("رقم فودافون كاش لازم يبدأ بـ 010 ويكون 11 رقم");
      return;
    }
    setClaiming(true);
    const { error } = await supabase.from("wheel_claims").insert({
      spin_id: prize.spin_id,
      user_id: user!.id,
      phone,
    } as never);
    setClaiming(false);
    if (error) return toast.error(error.message);
    setClaimed(true);
    toast.success("تم إرسال طلب الكرت للإدارة ✅");
  };

  const convertCard = async () => {
    if (!prize) return;
    setClaiming(true);
    const { error } = await supabase.rpc("convert_cash_card" as never, { _spin_id: prize.spin_id } as never);
    setClaiming(false);
    if (error) return toast.error(error.message);
    setClaimed(true);
    toast.success("تم تحويل الكرت إلى 50 كريدت ✅");
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4 rotate-180" /> الرئيسية
          </Link>
          <span className="text-lg font-black text-gradient-gold">عجلة الحظ</span>
        </div>
      </header>

      <main className="container mx-auto max-w-lg px-4 py-8">
        <h1 className="text-center text-2xl font-black text-gradient-gold">عجلة الحظ الأسبوعية 🎡</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          لفّة واحدة كل أسبوع فقط · 25 كريدت (50%) · 50 كريدت (30%) · 100 كريدت (10%) · كرت فكة 5 جنيه (1%)
        </p>

        <div className="relative mx-auto mt-8 h-72 w-72">
          <div className="absolute left-1/2 top-[-10px] z-10 -translate-x-1/2 text-3xl">🔻</div>
          <div
            className="h-full w-full rounded-full border-8 border-gold shadow-2xl transition-transform duration-[4000ms] ease-out"
            style={{
              transform: `rotate(${angle}deg)`,
              background: `conic-gradient(${SEGMENTS.map((s, i) => `${s.color} ${i * 45}deg ${(i + 1) * 45}deg`).join(",")})`,
            }}
          >
            {SEGMENTS.map((s, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 origin-left text-[11px] font-black text-white drop-shadow"
                style={{ transform: `rotate(${i * 45 + 22.5}deg) translateX(38px)` }}
              >
                {s.label}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={spin}
          disabled={spinning || (!!nextAt && !prize)}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold py-4 text-lg font-black text-gold-foreground shadow-gold disabled:opacity-50"
        >
          {spinning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {spinning ? "جارٍ اللف..." : "لفّ العجلة"}
        </button>

        {nextAt && !spinning && (
          <p className="mt-3 text-center text-xs text-muted-foreground">اللفّة القادمة متاحة: {nextAt}</p>
        )}

        {prize?.kind === "cash_card_5" && !claimed && (
          <div className="mt-6 rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/10 p-5">
            <div className="flex items-center gap-2 font-black text-emerald-400">
              <Gift className="h-5 w-5" /> ربحت كرت فكة بـ 5 جنيه!
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              اكتب رقم محفظة فودافون كاش (يبدأ بـ 010) لاستلام الكرت، أو حوّله إلى 50 كريدت فوراً.
            </p>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              inputMode="numeric"
              placeholder="01012345678"
              className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                onClick={claimCard}
                disabled={claiming}
                className="rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                استلام الكرت على فودافون كاش
              </button>
              <button
                onClick={convertCard}
                disabled={claiming}
                className="rounded-xl border border-border bg-card py-3 text-sm font-black disabled:opacity-50"
              >
                تحويله إلى 50 كريدت
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
