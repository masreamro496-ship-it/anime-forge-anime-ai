import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadUserFile } from "@/lib/storage";
import { SiteLockGate } from "@/components/SiteLockGate";
import { Crown, Upload, ArrowRight, Copy, CheckCircle, CreditCard, ShieldCheck } from "lucide-react";
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

// دالة إنشاء الفاتورة في NOWPayments
async function createInvoice(userId: string, priceUsd: number, description: string) {
  try {
    const orderId = `pkg_${userId || "guest"}_${Date.now()}`;
    const response = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": "HJB6ZHJ-3T9MZF5-JNDXWVP-3HKEKKJ",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: priceUsd,
        price_currency: "usd",
        order_id: orderId,
        order_description: description,
        success_url: typeof window !== "undefined" ? `${window.location.origin}/dashboard?payment=success&orderId=${orderId}` : "",
        cancel_url: typeof window !== "undefined" ? window.location.origin : "",
      }),
    });

    const data = await response.json();
    if (data && data.invoice_url) {
      return data.invoice_url;
    }
    return null;
  } catch (error) {
    console.error("Payment error:", error);
    return null;
  }
}

function ProUpgradePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // حالات الدفع الإلكتروني (NOWPayments)
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);

  // حالات فودافون كاش (رفع الإيصال)
  const [opNumber, setOpNumber] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submittingVodafone, setSubmittingVodafone] = useState(false);

  // نسخ رقم فودافون
  const copyVodafoneNumber = () => {
    navigator.clipboard.writeText(VODAFONE_NUMBER);
    toast.success("تم نسخ رقم فودافون كاش بنجاح 📱");
  };

  // معالجة الدفع الإلكتروني
  const handlePurchase = async (pkgKey: string, priceUsd: number, desc: string) => {
    setLoadingPkg(pkgKey);
    const userId = user?.id || "guest";
    const invoiceUrl = await createInvoice(userId, priceUsd, desc);
    setLoadingPkg(null);

    if (invoiceUrl) {
      window.location.href = invoiceUrl;
    } else {
      toast.error("حدث خطأ أثناء إنشاء فاتورة الدفع، يرجى المحاولة مرة أخرى.");
    }
  };

  // معالجة إرسال إيصال فودافون كاش
  const handleVodafoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (opNumber.trim().length < 4) return toast.error("أدخل رقم العملية بشكل صحيح");
    if (!receipt) return toast.error("الرجاء رفع صورة الإيصال");
    if (receipt.size > 5 * 1024 * 1024) return toast.error("حجم الصورة يجب أن لا يتجاوز 5MB");

    setSubmittingVodafone(true);
    try {
      const path = await uploadUserFile("receipts", user.id, receipt, "receipt-");
      const { error } = await supabase.from("pending_payments").insert({
        user_id: user.id,
        op_number: `pro_weekly:${opNumber.trim()}`,
        receipt_url: path,
        amount: 50,
      });
      if (error) throw error;
      toast.success("تم إرسال طلبك! سيراجع الأدمن البيانات ويفعّل الاشتراك قريباً");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmittingVodafone(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* زر العودة */}
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-6">
          <ArrowRight className="h-4 w-4" /> العودة لصفحة التحكم
        </Link>

        {/* العنوان الرئيسي */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-gradient-gold sm:text-4xl flex items-center justify-center gap-2">
            <Crown className="h-8 w-8 text-gold" /> متجر الترقية والاشتراكات
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            اختر طريقة الدفع المناسبة لك لشحن الكريديت أو تفعيل باقة PRO
          </p>
        </div>

        {/* قسم فودافون كاش (اشتراك PRO الأسبوعي - 50 ج) */}
        <section className="rounded-3xl border-2 border-red-500/50 bg-gradient-to-br from-red-950/40 via-background to-amber-950/20 p-6 shadow-2xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 bg-red-600 text-white text-xs font-black px-4 py-1 rounded-br-xl">
            متاح للمصريين 🇪🇬
          </div>

          <h2 className="text-2xl font-black text-red-400 flex items-center gap-2 mt-2 mb-3">
            <Crown className="h-6 w-6 text-yellow-400" /> اشتراك PRO الأسبوعي (50 جنيه مصري)
          </h2>

          <p className="text-sm text-muted-foreground mb-4">
            قم بتحويل مبلغ <span className="font-bold text-foreground">50 جنيه مصري</span> عبر فودافون كاش للرقم التالي ثم ارفع الإيصال أدناه:
          </p>

          {/* رقم فودافون كاش */}
          <div className="flex items-center justify-between rounded-2xl border-2 border-yellow-500/50 bg-black/50 p-4 mb-5">
            <button
              type="button"
              onClick={copyVodafoneNumber}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-gold px-4 py-2 text-xs font-black text-gold-foreground shadow-gold hover:brightness-110 transition"
            >
              <Copy className="h-4 w-4" /> نسخ الرقم
            </button>
            <span className="font-mono text-2xl font-black tracking-widest text-gold" dir="ltr">
              {VODAFONE_NUMBER}
            </span>
          </div>

          {/* المميزات */}
          <div className="space-y-2 mb-6 text-sm font-bold">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>احصل على 100 كريديت يومياً (لمدة أسبوع كامل)</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>فتح ميزة استنساخ صوت غوكو حصرياً</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>أولوية التوليد والحصول على شارة VIP</span>
            </div>
          </div>

          {/* نموذج رفع الإيصال ورقم العملية */}
          <form onSubmit={handleVodafoneSubmit} className="space-y-4 border-t border-border/50 pt-5">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">رقم العملية (من رسالة التحويل)</label>
              <input
                value={opNumber}
                onChange={(e) => setOpNumber(e.target.value)}
                placeholder="مثال: 1234567890"
                className="w-full rounded-xl border border-input bg-background/80 px-4 py-2.5 text-sm font-mono focus:border-gold outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">صورة الإيصال</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background/40 p-4 hover:border-gold transition">
                <Upload className="h-5 w-5 text-gold" />
                <span className="text-xs font-bold">{receipt?.name ?? "اضغط لرفع صورة الإيصال (PNG / JPG)"}</span>
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
              disabled={submittingVodafone}
              className="w-full rounded-xl bg-gradient-gold py-3 text-base font-black text-gold-foreground shadow-gold hover:brightness-110 disabled:opacity-50 transition"
            >
              {submittingVodafone ? "جاري إرسال الطلب..." : "تأكيد وإرسال طلب فودافون كاش"}
            </button>
          </form>
        </section>

        {/* قسم شراء الكريديت أونلاين (NOWPayments / الفيزا والعملات الرقمية) */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-xl">
          <h2 className="text-2xl font-black mb-1 flex items-center gap-2 text-blue-400">
            <CreditCard className="h-6 w-6" /> شراء كريديت إضافي (دفع إلكتروني آلي)
          </h2>
          <p className="text-xs text-muted-foreground mb-6">الدفع مشفر وآمن 100% عبر الفيزا أو العملات الرقمية من خلال بوابة NOWPayments.</p>

          <div className="space-y-4">
            {/* الباقة الأولى: 100 كريديت */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-border bg-background p-5 hover:border-blue-500/50 transition">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-blue-400">100 كريديت</span>
                  <span className="text-xs bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded-full">حوالي 25 ج.م</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">تتيح لك توليد فيديوهات واستخدام أدوات الذكاء الاصطناعي</p>
              </div>
              <button
                type="button"
                onClick={() => handlePurchase("100cr", 0.50, "شراء 100 كريديت - أنمي فورج")}
                disabled={loadingPkg === "100cr"}
                className="w-full sm:w-auto min-w-[140px] rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-black text-white shadow-lg disabled:opacity-50 transition"
              >
                {loadingPkg === "100cr" ? "جاري التحضير..." : "شراء بـ $0.50"}
              </button>
            </div>

            {/* الباقة الثانية: 500 كريديت */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border-2 border-purple-500/50 bg-purple-500/5 p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-black px-3 py-0.5 rounded-bl-lg">
                الأكثر شعبية 💥
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-purple-400">500 كريديت</span>
                  <span className="text-xs bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full">حوالي 175 ج.م</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">القيمة الأفضل لصانعي المحتوى والمصممين</p>
              </div>
              <button
                type="button"
                onClick={() => handlePurchase("500cr", 3.75, "شراء 500 كريديت - أنمي فورج")}
                disabled={loadingPkg === "500cr"}
                className="w-full sm:w-auto min-w-[140px] rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-2.5 text-sm font-black text-white shadow-lg disabled:opacity-50 transition"
              >
                {loadingPkg === "500cr" ? "جاري التحضير..." : "شراء بـ $3.75"}
              </button>
            </div>

            {/* الباقة الثالثة: 1000 كريديت */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border-2 border-gold bg-gold/5 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-gold">1000 كريديت</span>
                  <span className="text-xs bg-gold/20 text-gold font-bold px-2 py-0.5 rounded-full">حوالي 350 ج.م</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">باقة المحترفين والشحن الأكبر عبر فاتورة 7 دولار</p>
              </div>
              <button
                type="button"
                onClick={() => handlePurchase("1000cr", 7.00, "شراء 1000 كريديت - أنمي فورج")}
                disabled={loadingPkg === "1000cr"}
                className="w-full sm:w-auto min-w-[140px] rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-black text-gold-foreground shadow-gold disabled:opacity-50 hover:brightness-110 transition"
              >
                {loadingPkg === "1000cr" ? "جاري التحضير..." : "شراء بـ $7.00"}
              </button>
            </div>
          </div>
        </section>

        {/* ضمان وأمان */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-green-400" /> جميع عمليات الدفع آمنة ومشفرة 100%
        </div>
      </div>
    </div>
  );
}

