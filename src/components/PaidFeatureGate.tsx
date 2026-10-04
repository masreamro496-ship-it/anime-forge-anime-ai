import { useState, type ReactNode, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getFeatureStatus, startFreeTrial, unlockFeature } from "@/lib/wallet.functions";

export type FeatureKey = "ai_chat" | "keys" | "art4k" | "dubbing" | "draw2d" | "world_cup";

export const FEATURES: Record<FeatureKey, { cost: number; label: string; period: string }> = {
  ai_chat: { cost: 30, label: "شات برمجي", period: "ساعة" },
  keys: { cost: 30, label: "إنشاء مفاتيح", period: "ساعة" },
  art4k: { cost: 30, label: "توليد جودة أنمي صورية خيالية", period: "ساعة" },
  dubbing: { cost: 30, label: "دبلجة الفيديوهات", period: "ساعة" },
  draw2d: { cost: 30, label: "ارسم بسهولة وأنميشن 2D", period: "ساعة" },
  world_cup: { cost: 10, label: "لعبة كأس العالم", period: "شهر كامل" },
};

// الأدوات اللي بتتحسب بالساعة: 30 كريدت لكل ساعة بلا حد أقصى
const HOURLY: FeatureKey[] = ["ai_chat", "keys", "art4k", "dubbing", "draw2d"];
const PER_HOUR = 30;

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return ts;
  }
}

const NO_CREDIT_MSG = "معاكش كريدت يكفي 😅 لازم تجمع الكريدت المطلوب الأول";

export function PaidFeatureGate({
  featureKey,
  href,
  to,
  className,
  style,
  children,
}: {
  featureKey: FeatureKey;
  href?: string;
  to?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const statusFn = useServerFn(getFeatureStatus);
  const unlockFn = useServerFn(unlockFeature);
  const trialFn = useServerFn(startFreeTrial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hours, setHours] = useState(1);
  const [balance, setBalance] = useState(0);
  const [trialUsed, setTrialUsed] = useState(true);
  const hourly = HOURLY.includes(featureKey);
  const meta = FEATURES[featureKey];
  const total = hourly ? PER_HOUR * hours : meta.cost;

  const go = () => {
    if (href) window.open(href, "_blank", "noopener,noreferrer");
    else if (to) navigate({ to: to as "/world-cup" });
  };

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setBusy(true);
    const s = await statusFn({ data: { key: featureKey } }).catch(() => null);
    setBusy(false);
    if (!s || !s.ok) {
      toast.error("حصلت مشكلة، جرّب تاني");
      return;
    }
    if (s.active) {
      go();
      return;
    }
    setBalance(s.balance);
    setTrialUsed(s.trialUsed);
    setHours(1);
    setOpen(true);
  };

  const pay = async () => {
    setBusy(true);
    const res = await unlockFn({ data: { key: featureKey, hours: hourly ? hours : 1 } }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      toast.error(res?.error === "insufficient_credits" ? NO_CREDIT_MSG : "حصلت مشكلة في الدفع، جرّب تاني");
      return;
    }
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success(`تم خصم ${total} كريدت ✅ متاحة حتى ${fmt(res.expires_at)}`);
    setOpen(false);
    go();
  };

  const freeTrial = async () => {
    setBusy(true);
    const res = await trialFn({ data: { key: featureKey } }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      if (res?.error === "trial_used") {
        setTrialUsed(true);
        toast.error("استخدمت التجربة المجانية للأداة دي قبل كده");
      } else toast.error("حصلت مشكلة، جرّب تاني");
      return;
    }
    toast.success(`🎁 التجربة المجانية شغالة لحد ${fmt(res.expires_at)}`);
    setOpen(false);
    go();
  };

  return (
    <>
      <button type="button" onClick={onClick} className={className} style={style} disabled={busy && !open}>
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border-2 border-gold bg-card p-6 text-center shadow-gold"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-gradient-gold">{meta.label}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              رصيدك: <b className="text-gold">{balance} كريدت</b>
            </p>

            {!trialUsed && (
              <button
                type="button"
                onClick={freeTrial}
                disabled={busy}
                className="mt-4 w-full rounded-xl border-2 border-gold bg-gold/15 py-3 text-base font-black text-gold disabled:opacity-60"
              >
                {busy ? "جاري التفعيل..." : "🎁 تجربة مجانية لمدة ساعة فقط"}
              </button>
            )}

            {hourly ? (
              <>
                <p className="mt-3 text-sm leading-7 text-foreground/85">
                  كل ساعة بـ <b className="text-gold">{PER_HOUR} كريدت</b> — اختار عدد الساعات اللي تحبها (بلا حد).
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button type="button" onClick={() => setHours((h) => Math.max(1, h - 1))} className="h-10 w-10 rounded-full border-2 border-gold text-xl font-black text-gold">−</button>
                  <input
                    type="number"
                    min={1}
                    value={hours}
                    onChange={(e) => setHours(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                    className="w-20 rounded-lg border border-border bg-background py-2 text-center text-lg font-black"
                  />
                  <button type="button" onClick={() => setHours((h) => h + 1)} className="h-10 w-10 rounded-full border-2 border-gold text-xl font-black text-gold">+</button>
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {[1, 2, 3, 5, 10, 24].map((h) => (
                    <button key={h} type="button" onClick={() => setHours(h)} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${hours === h ? "border-gold bg-gold/15 text-gold" : "border-border"}`}>
                      {h} س = {h * PER_HOUR}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm font-bold">{hours} ساعة = <b className="text-gold">{total} كريدت</b></p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-7 text-foreground/85">
                لازم تدفع <b className="text-gold">{meta.cost} كريدت</b> عشان تدخل لمدة <b>{meta.period}</b>.
              </p>
            )}

            <button
              onClick={pay}
              disabled={busy}
              className="mt-5 w-full rounded-xl bg-primary py-3 text-base font-black text-primary-foreground disabled:opacity-60"
            >
              {busy ? "جاري الخصم..." : `ادفع ${total} كريدت وادخل`}
            </button>

            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-xl border border-border py-2 text-sm font-bold"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </>
  );
}
