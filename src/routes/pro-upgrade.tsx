import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadUserFile } from "@/lib/storage";
import { SiteLockGate } from "@/components/SiteLockGate";
import { Crown, Upload, ArrowRight, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pro-upgrade")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: () => (
    <SiteLockGate slug="pro-upgrade">
      <ProUpgradePage />
    </SiteLockGate>
  ),
});

const VODAFONE_NUMBER = "01080390782";

type Plan = {
  id: "pro" | "coins_100" | "coins_500" | "coins_1000";
  label: string;
  amountEGP: number;
  perk: string;
};

const PLANS: Plan[] = [
  { id: "pro", label: "ترقية PRO ذهبية", amountEGP: 50, perk: "PRO + 50 كريدت هدية" },
  { id: "coins_100", label: "شراء 100 كريدت", amountEGP: 25, perk: "+100 كريدت" },
  { id: "coins_500", label: "شراء 500 كريدت", amountEGP: 100, perk: "+500 كريدت" },
  { id: "coins_1000", label: "شراء 1000 كريدت", amountEGP: 180, perk: "+1000 كريدت (وفّر 20%)" },
];

function ProUpgradePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Plan>(PLANS[0]);
  const [opNumber, setOpNumber] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(VODAFONE_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (opNumber.trim().length < 4) return toast.error("أدخل رقم العملية بشكل صحيح");
    if (!receipt) return toast.error("الرجاء رفع صورة الإيصال");
    if (receipt.size > 5 * 1024 * 1024) return toast.error("حجم الصورة يجب أن لا يتجاوز 5MB");

    setSubmitting(true);
    try {
      const path = await uploadUserFile("receipts", user.id, receipt, "receipt-");
      const { error } = await supabase.from("pending_payments").insert({
        user_id: user.id,
        op_number: `${selected.id}:${opNumber.trim()}`,
        receipt_url: path,
        amount: selected.amountEGP,
      });
      if (error) throw error;
      toast.success("تم إرسال طلبك! سيراجعه الأدمن يدوياً قريباً");
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
          <Link to="/dashboard" className="flex items-center gap-2 text-sm font-bold">
            <ArrowRight className="h-4 w-4" /> العودة للوحة
          </Link>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-gold" />
            <span className="text-base font-black text-gradient-gold">الترقية والاشتراكات</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border-2 border-gold bg-card p-6 shadow-gold sm:p-8">
          <div className="text-center">
            <Crown className="mx-auto h-12 w-12 text-gold" />
            <h1 className="mt-3 text-3xl font-black text-gradient-gold">اختر باقتك</h1>
            <p className="mt-2 text-sm text-muted-foreground">دفع عبر فودافون كاش · تفعيل يدوي من الأدمن خلال 24 ساعة</p>
          </div>

          {/* Plans */}
          <div className="mt-6 grid gap-3">
            {PLANS.map((p) => {
              const active = selected.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p)}
                  className={`flex items-center justify-between rounded-xl border-2 p-4 text-right transition-all ${
                    active ? "border-gold bg-gold/10 shadow-gold" : "border-border bg-background hover:border-gold/50"
                  }`}
                >
                  <div>
                    <div className={`text-base font-black ${active ? "text-gold" : ""}`}>{p.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{p.perk}</div>
                  </div>
                  <div className={`text-2xl font-black ${active ? "text-gold" : "text-foreground"}`}>
                    {p.amountEGP} <span className="text-xs font-bold">ج.م</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Vodafone number */}
          <div className="mt-6 rounded-xl border border-gold/40 bg-gold/5 p-5">
            <div className="text-sm font-bold text-gold">حوّل مبلغ {selected.amountEGP} جنيه فودافون كاش إلى:</div>
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-background p-3">
              <code dir="ltr" className="flex-1 font-mono text-xl font-black text-gradient-gold">{VODAFONE_NUMBER}</code>
              <button type="button" onClick={handleCopy} className="rounded-md border border-border bg-card p-2 hover:bg-accent">
                {copied ? <CheckCircle2 className="h-4 w-4 text-gold" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">بعد التحويل، احصل على رقم العملية من رسالة التأكيد وارفع صورة الإيصال هنا.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-bold">رقم العملية</label>
              <input
                value={opNumber}
                onChange={(e) => setOpNumber(e.target.value)}
                placeholder="مثال: 1234567890"
                className="mt-1 w-full rounded-lg border border-input bg-background px-4 py-3 text-base"
                required
              />
            </div>

            <div>
              <label className="text-sm font-bold">صورة الإيصال</label>
              <label className="mt-1 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-background/40 p-6 hover:border-gold">
                <Upload className="h-6 w-6 text-gold" />
                <span className="text-sm">{receipt?.name ?? "اضغط لرفع صورة الإيصال (PNG / JPG)"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                  className="hidden"
                  required
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-gradient-gold py-5 text-xl font-black text-gold-foreground shadow-gold transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {submitting ? "جاري الإرسال..." : `إرسال طلب ${selected.label}`}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
