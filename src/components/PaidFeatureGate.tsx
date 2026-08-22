import { useState, type ReactNode, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/use-auth";

// إعداد الاتصال المباشر بقاعدة البيانات المستقلة
const SUPABASE_URL = "https://ximllvsgpfeqmhharjin.supabase.co";
const SUPABASE_KEY = "sb_publishable_gjpclJMqOF6g74NMKVEM9Q_ndgM4rqX";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export type FeatureKey = "ai_chat" | "keys" | "art4k" | "dubbing" | "draw2d" | "world_cup";

export const FEATURES: Record<FeatureKey, { cost: number; label: string; period: string }> = {
  ai_chat: { cost: 25, label: "شات برمجي", period: "ساعتين فقط" },
  keys: { cost: 5, label: "إنشاء مفاتيح", period: "يوم واحد" },
  art4k: { cost: 50, label: "توليد جودة صورية 4K", period: "5 ساعات" },
  dubbing: { cost: 25, label: "دبلجة الفيديوهات", period: "3 ساعات" },
  draw2d: { cost: 250, label: "ارسم بسهولة وأنميشن 2D", period: "شهر كامل" },
  world_cup: { cost: 10, label: "لعبة كأس العالم", period: "شهر كامل" },
};

// كود الخصم الترويجي — مرة واحدة فقط لكل مستخدم لكل ميزة
const PROMO_CODE = "animeforge600vist";
const PROMO_PRICES: Partial<Record<FeatureKey, number>> = {
  art4k: 10,
  draw2d: 25,
};

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return ts;
  }
}

// رسالة موحدة لعدم كفاية الرصيد — بدل أي رسالة خطأ عامة
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
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPromoBox, setShowPromoBox] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoUsed, setPromoUsed] = useState(false);
  const meta = FEATURES[featureKey];
  const promoPrice = PROMO_PRICES[featureKey];

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

    const { data } = await supabase
      .from("feature_passes")
      .select("expires_at")
      .eq("user_id", user.id)
      .eq("feature_key", featureKey)
      .maybeSingle();

    if (data?.expires_at && new Date(data.expires_at).getTime() > Date.now()) {
      go();
      return;
    }

    // لو الميزة دي عندها كود خصم، اتأكد هل المستخدم استخدمه قبل كده
    if (promoPrice) {
      const { data: redemption } = await supabase
        .from("promo_redemptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("feature_key", featureKey)
        .maybeSingle();
      setPromoUsed(!!redemption);
    }

    setPromoCode("");
    setShowPromoBox(false);
    setOpen(true);
  };

  const pay = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("unlock_feature", { _key: featureKey });
      if (error) throw error;
      const res = data as { expires_at?: string };
      toast.success(
        `تم الدفع ✅ التجربة متاحة حتى ${res.expires_at ? fmt(res.expires_at) : meta.period}`,
      );
      setOpen(false);
      go();
    } catch {
      // أي مشكلة في الدفع تتفسر للمستخدم كـ "الرصيد مش كافي" بدل رسالة خطأ عامة
      toast.error(NO_CREDIT_MSG);
    } finally {
      setBusy(false);
    }
  };

  const redeemPromo = async () => {
    if (!promoPrice) return;
    const code = promoCode.trim();
    if (!code) {
      toast.error("اكتب الكود الأول");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("redeem_promo_and_unlock", {
        _key: featureKey,
        _code: code,
      });
      if (error) throw error;
      const res = data as { expires_at?: string };
      toast.success(
        `تم تفعيل الخصم 🎉 دفعت ${promoPrice} كريدت بس! متاحة حتى ${res.expires_at ? fmt(res.expires_at) : meta.period}`,
      );
      setPromoUsed(true);
      setOpen(false);
      go();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("invalid_code") || msg.includes("code_not_applicable")) {
        toast.error("الكود غلط أو مش شغال هنا");
      } else if (msg.includes("code_already_used")) {
        toast.error("استخدمت الكود ده قبل كده، الخصم بيتفعّل مرة واحدة بس");
        setPromoUsed(true);
      } else {
        toast.error(NO_CREDIT_MSG);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={onClick} className={className} style={style}>
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
            <p className="mt-3 text-sm leading-7 text-foreground/85">
              لازم تدفع <b className="text-gold">{meta.cost} كريدت</b> عشان تدخل وتجرّبه لمدة{" "}
              <b>{meta.period}</b> فقط. وبعد انتهاء المدة لازم تدفع مرة أخرى.
            </p>

            <button
              onClick={pay}
              disabled={busy}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-3 text-base font-black text-white disabled:opacity-60"
            >
              {busy ? "جاري الخصم..." : `ادفع ${meta.cost} كريدت وادخل`}
            </button>

            {promoPrice && !promoUsed && (
              <div className="mt-4 border-t border-border pt-4">
                {!showPromoBox ? (
                  <button
                    type="button"
                    onClick={() => setShowPromoBox(true)}
                    className="text-xs font-bold text-gold underline"
                  >
                    🎁 عندك كود خصم؟
                  </button>
                ) : (
                  <div className="space-y-2 text-right">
                    <p className="text-[11px] leading-5 text-muted-foreground">
                      هتلاقي كود الخصم على تيك توك بتاعنا:{" "}
                      <b className="text-gold">animeforgeweb</b>
                    </p>
                    <input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="اكتب الكود هنا"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
                    />
                    <button
                      type="button"
                      onClick={redeemPromo}
                      disabled={busy}
                      className="w-full rounded-lg border border-gold bg-gold/10 py-2 text-sm font-black text-gold disabled:opacity-60"
                    >
                      {busy ? "جاري التفعيل..." : `فعّل الكود وادفع ${promoPrice} كريدت بس`}
                    </button>
                  </div>
                )}
              </div>
            )}

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
