import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadUserFile } from "@/lib/storage";
import { toast } from "sonner";
import { ArrowRight, Gift, Loader2, Sparkles, Upload, Ticket } from "lucide-react";

export const Route = createFileRoute("/wheel")({
  head: () => ({
    meta: [
      { title: "عجلة الحظ الأسبوعية — انمي فورج" },
      { name: "description", content: "لفّة واحدة كل أسبوع: اربح 25 أو 50 أو 100 كريدت، وفرصة نادرة لكرت فكة بـ 5 جنيه، أو اشترِ لفّتين بـ 20 جنيه." },
      { property: "og:title", content: "عجلة الحظ الأسبوعية — انمي فورج" },
      { property: "og:description", content: "لفّ العجلة مرة كل أسبوع واربح كريدت أو كرت فكة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WheelPage,
});

const SEGMENTS = [
  { label: "25 كريدت", color: "#7c3aed" },
  { label: "50 كريدت", color: "#0ea5e9" },
  { label: "25 كريدت", color: "#9333ea" },
  { label: "100 كريدت", color: "#f59e0b" },
  { label: "25 كريدت", color: "#7c3aed" },
  { label: "50 كريدت", color: "#0ea5e9" },
  { label: "25 كريدت", color: "#9333ea" },
  { label: "كرت فكة 5ج", color: "#22c55e" },
];

const SEG = 360 / SEGMENTS.length; // 45

type Prize = { spin_id: string; kind: string; amount: number };

function WheelPage() {
  const { user } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [nextAt, setNextAt] = useState<string | null>(null);
  const [extraSpins, setExtraSpins] = useState(0);
  const [phone, setPhone] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // شراء لفّات
  const [opNumber, setOpNumber] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [buying, setBuying] = useState(false);

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
    (supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { spins: number } | null }> } };
      };
    })
      .from("wheel_extra_spins")
      .select("spins")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setExtraSpins(Number(data?.spins ?? 0)));
  }, [user]);

  const spin = async () => {
    if (!user) {
      toast.error("سجّل الدخول أولاً");
      return;
    }
    setSpinning(true);
    setPrize(null);
    setClaimed(false);
    const { data, error } = await supabase.rpc("spin_wheel" as never);
    if (error) {
      setSpinning(false);
      if (error.message.includes("weekly_limit")) {
        toast.error("لفّة واحدة فقط كل أسبوع — أو اشترِ لفّتين بـ 20 جنيه");
      } else {
        toast.error(error.message);
      }
      return;
    }
    const p = data as unknown as Prize & { used_extra?: boolean };
    if (p.used_extra) setExtraSpins((n) => Math.max(0, n - 1));

    // نختار مقطعاً مطابقاً للجائزة فعلياً حتى يقف السهم على القيمة الصحيحة
    const matches = SEGMENTS.map((s, i) => ({ s, i })).filter(({ s }) =>
      p.kind === "cash_card_5" ? s.label.includes("فكة") : s.label.startsWith(String(p.amount)),
    );
    const idx = matches.length ? matches[Math.floor(Math.random() * matches.length)]!.i : 0;
    // مركز المقطع i عند (i*SEG + SEG/2) درجة من الأعلى، والمؤشر في الأعلى (0°)
    const target = 360 * 6 + (360 - (idx * SEG + SEG / 2));
    setAngle(target);

    window.setTimeout(() => {
      setSpinning(false);
      setPrize(p);
      if (!p.used_extra) setNextAt(new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleString("ar-EG"));
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

  const buySpins = async () => {
    if (!user) return toast.error("سجّل الدخول أولاً");
    if (opNumber.trim().length < 4) return toast.error("اكتب رقم العملية الصحيح");
    setBuying(true);
    try {
      let path: string | null = null;
      if (receipt) path = await uploadUserFile("receipts", user.id, receipt, "wheel-");
      const { error } = await (supabase as unknown as {
        from: (t: string) => { insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
      })
        .from("wheel_purchases")
        .insert({ user_id: user.id, op_number: opNumber.trim(), receipt_path: path, amount_egp: 20, spins: 2 });
      if (error) throw new Error(error.message);
      setOpNumber("");
      setReceipt(null);
      toast.success("تم إرسال طلبك للإدارة ✅ سيتم إضافة لفّتين بعد المراجعة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الإرسال");
    } finally {
      setBuying(false);
    }
  };

  const canSpin = !spinning && (extraSpins > 0 || !nextAt);

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
          25 كريدت (50%) · 50 كريدت (30%) · 100 كريدت (10%) · كرت فكة 5 جنيه (1%)
        </p>
        {extraSpins > 0 && (
          <p className="mt-2 text-center text-xs font-black text-emerald-400">لديك {extraSpins} لفّة إضافية 🎟️</p>
        )}

        {/* العجلة */}
        <div className="relative mx-auto mt-8 h-80 w-80 max-w-full">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/30 via-fuchsia-500/20 to-sky-500/30 blur-2xl" />
          <div className="absolute left-1/2 top-[-14px] z-20 -translate-x-1/2 text-4xl drop-shadow-[0_0_10px_rgba(250,204,21,0.9)]">🔻</div>

          <div
            className="relative h-full w-full rounded-full border-[10px] border-amber-400 shadow-[0_0_45px_rgba(245,158,11,0.55)] transition-transform duration-[4000ms] ease-out"
            style={{
              transform: `rotate(${angle}deg)`,
              background: `conic-gradient(${SEGMENTS.map((s, i) => `${s.color} ${i * SEG}deg ${(i + 1) * SEG}deg`).join(",")})`,
            }}
          >
            {SEGMENTS.map((s, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 origin-left whitespace-nowrap text-[12px] font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                // -90deg لأن العنصر يبدأ متجهاً لليمين بينما الـ conic-gradient يبدأ من الأعلى
                style={{ transform: `rotate(${i * SEG + SEG / 2 - 90}deg) translateX(46px)` }}
              >
                {s.label}
              </div>
            ))}
          </div>

          <div className="absolute left-1/2 top-1/2 z-10 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-amber-300 bg-background shadow-inner" />
        </div>

        <button
          onClick={spin}
          disabled={!canSpin}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-gold py-4 text-lg font-black text-gold-foreground shadow-gold disabled:opacity-50"
        >
          {spinning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {spinning ? "جارٍ اللف..." : "لفّ العجلة"}
        </button>

        {nextAt && !spinning && extraSpins === 0 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">اللفّة المجانية القادمة: {nextAt}</p>
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
              <button onClick={claimCard} disabled={claiming} className="rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-50">
                استلام الكرت على فودافون كاش
              </button>
              <button onClick={convertCard} disabled={claiming} className="rounded-xl border border-border bg-card py-3 text-sm font-black disabled:opacity-50">
                تحويله إلى 50 كريدت
              </button>
            </div>
          </div>
        )}

        {/* شراء لفّات إضافية */}
        <div className="mt-8 rounded-2xl border-2 border-amber-400/70 bg-gradient-to-br from-amber-400/15 to-yellow-500/5 p-5">
          <div className="flex items-center gap-2 text-base font-black text-amber-300">
            <Ticket className="h-5 w-5" /> اشترِ لفّتين حظ مقابل 20 جنيه
          </div>
          <p className="mt-2 text-sm leading-7 text-foreground/90">
            قم بتحويل مبلغ <b>20 جنيه</b> على فودافون كاش إلى الرقم: <b className="text-amber-300">01080390782</b>
            <br />
            ثم اكتب <b>رقم العملية</b> وأرفق صورة الإيصال وسيصل الطلب للإدارة مباشرة.
          </p>

          <input
            value={opNumber}
            onChange={(e) => setOpNumber(e.target.value)}
            placeholder="رقم العملية"
            className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
          />

          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-amber-400/60 bg-background/50 px-4 py-3 text-xs font-bold">
            <Upload className="h-4 w-4 text-amber-300" />
            {receipt ? receipt.name : "إرفاق صورة الإيصال أو ملف"}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
            />
          </label>

          <button
            onClick={buySpins}
            disabled={buying}
            className="mt-3 w-full rounded-xl bg-gradient-gold py-3 text-sm font-black text-gold-foreground shadow-gold disabled:opacity-50"
          >
            {buying ? "جارٍ الإرسال..." : "إرسال طلب الشراء للإدارة"}
          </button>
        </div>
      </main>
    </div>
  );
}
