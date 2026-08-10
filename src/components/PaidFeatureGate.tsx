import { useState, type ReactNode, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type FeatureKey = "ai_chat" | "keys" | "art4k" | "dubbing" | "draw2d" | "world_cup";

export const FEATURES: Record<FeatureKey, { cost: number; label: string; period: string }> = {
  ai_chat: { cost: 25, label: "شات برمجي", period: "ساعتين فقط" },
  keys: { cost: 5, label: "إنشاء مفاتيح", period: "يوم واحد" },
  art4k: { cost: 50, label: "توليد جودة صورية 4K", period: "5 ساعات" },
  dubbing: { cost: 25, label: "دبلجة الفيديوهات", period: "3 ساعات" },
  draw2d: { cost: 250, label: "ارسم بسهولة وأنميشن 2D", period: "شهر كامل" },
  world_cup: { cost: 10, label: "لعبة كأس العالم", period: "شهر كامل" },
};

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return ts;
  }
}

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
  const meta = FEATURES[featureKey];

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ";
      toast.error(msg.includes("insufficient") ? "رصيد الكريدت غير كافٍ، يرجى الشحن" : msg);
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
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
            <button onClick={() => setOpen(false)} className="mt-2 w-full rounded-xl border border-border py-2 text-sm font-bold">
              إلغاء
            </button>
          </div>
        </div>
      )}
    </>
  );
}
