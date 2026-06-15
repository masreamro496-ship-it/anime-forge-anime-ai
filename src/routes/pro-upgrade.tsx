import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadUserFile } from "@/lib/storage";
import { Crown, Upload, ArrowRight, Copy, CheckCircle2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { createFatoraCheckout } from "@/lib/fatora.functions";

export const Route = createFileRoute("/pro-upgrade")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: ProUpgradePage,
});

const VODAFONE_NUMBER = "01080390782";

function ProUpgradePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        op_number: opNumber.trim(),
        receipt_url: path,
        amount: 50,
      });
      if (error) throw error;
      toast.success("تم إرسال طلب الترقية! سيراجعه الأدمن قريباً");
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
            <span className="text-base font-black text-gradient-gold">الترقية إلى PRO</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border-2 border-gold bg-card p-8 shadow-gold">
          <div className="text-center">
            <Crown className="mx-auto h-12 w-12 text-gold" />
            <h1 className="mt-3 text-3xl font-black text-gradient-gold">باقة PRO الذهبية</h1>
            <p className="mt-2 text-sm text-muted-foreground">انضم لنخبة المبدعين واحصل على كل المميزات</p>
          </div>

          <div className="mt-6 rounded-xl border border-gold/40 bg-gold/5 p-5">
            <div className="text-sm font-bold text-gold">خطوات الترقية:</div>
            <ol className="mt-3 space-y-3 text-sm">
              <li className="flex gap-2">
                <span className="font-black text-gold">1.</span>
                <span>
                  حوّل مبلغ <span className="font-black text-gold">50 جنيه مصري لا غير</span> عبر فودافون كاش إلى الرقم:
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-background p-3">
                    <code dir="ltr" className="flex-1 font-mono text-lg font-black text-gradient-gold">{VODAFONE_NUMBER}</code>
                    <button type="button" onClick={handleCopy} className="rounded-md border border-border bg-card p-2 hover:bg-accent">
                      {copied ? <CheckCircle2 className="h-4 w-4 text-gold" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </span>
              </li>
              <li className="flex gap-2"><span className="font-black text-gold">2.</span><span>احصل على رقم العملية من رسالة التأكيد</span></li>
              <li className="flex gap-2"><span className="font-black text-gold">3.</span><span>التقط صورة (سكرين شوت) للإيصال وارفعها هنا</span></li>
              <li className="flex gap-2"><span className="font-black text-gold">4.</span><span>سيراجع الأدمن خلال 24 ساعة ويفعّل حسابك</span></li>
            </ol>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-background/40 p-5">
            <div className="text-sm font-bold">مميزات تحصل عليها فوراً بعد الاعتماد:</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>✦ <span className="font-bold text-gold">+50 كريديت</span> إضافي تُضاف لحسابك</li>
              <li>✦ كتابة سكريبتات بلا حدود للذكاء الاصطناعي</li>
              <li>✦ تخفيضات حصرية على استهلاك الكريديت</li>
              <li>✦ أولوية في طابور المعالجة</li>
              <li>✦ ميزة استنساخ صوت غوكو</li>
            </ul>
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
              className="w-full rounded-xl bg-gradient-gold py-3 text-base font-black text-gold-foreground shadow-gold transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {submitting ? "جاري الإرسال..." : "إرسال طلب الترقية"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
