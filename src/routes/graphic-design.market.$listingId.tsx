// src/routes/graphic-design.market.$listingId.tsx
import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, DollarSign, Download, Wand2, Smartphone, Loader2, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/graphic-design/market/$listingId")({
  component: ListingDetailPage,
});

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price_usd: number;
  preview_image_url: string | null;
  listing_type: "template" | "file";
  license: string;
  owner_id: string;
}

// سعر تقريبي بيتحدد حسب سعر الدولار اليومي — عدّله حسب نظامك أو اربطه بـ API لسعر الصرف
const USD_TO_EGP = 50;

function ListingDetailPage() {
  const { listingId } = useParams({ from: "/graphic-design/market/$listingId" });
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState<any>(null);
  const [showVfModal, setShowVfModal] = useState(false);
  const [vfPhone, setVfPhone] = useState("");
  const [vfNote, setVfNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase.from("gd_listings").select("*").eq("id", listingId).single();
      setListing(data as Listing);

      if (user) {
        const { data: existing } = await supabase
          .from("gd_purchases")
          .select("*")
          .eq("listing_id", listingId)
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setPurchase(existing);
      }
      setLoading(false);
    }
    load();
  }, [listingId, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-red-500" />
      </div>
    );
  }
  if (!listing) {
    return <div className="p-10 text-center text-sm text-muted-foreground">التصميم غير موجود</div>;
  }

  const isFree = listing.price_usd === 0;
  const priceEgp = Math.round(listing.price_usd * USD_TO_EGP);

  // شراء بالكريدت (بيفترض عمود profiles.credits — عدّل حسب نظامك)
  async function buyWithCredits() {
    if (!user) return navigate({ to: "/login" });
    setProcessing(true);
    try {
      const { data: profile } = await supabase.from("profiles").select("credits").eq("id", user.id).single();
      const priceCredits = Math.round(listing!.price_usd * 20); // معدّل تحويل تقريبي: 1$ = 20 كريدت — عدّله حسب نظامك
      if (!profile || profile.credits < priceCredits) {
        alert("رصيدك من الكريدت مش كافي");
        setProcessing(false);
        return;
      }

      const { data: newPurchase, error } = await supabase
        .from("gd_purchases")
        .insert({
          listing_id: listing!.id,
          buyer_id: user.id,
          seller_id: listing!.owner_id,
          price_usd: listing!.price_usd,
          payment_method: "credit",
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("profiles").update({ credits: profile.credits - priceCredits }).eq("id", user.id);

      if (listing!.listing_type === "template") {
        await supabase.rpc("gd_copy_template_to_buyer", { p_purchase_id: newPurchase.id });
      }

      setPurchase(newPurchase);
      alert("تم الشراء بنجاح ✅");
    } catch (e) {
      console.error(e);
      alert("حصل خطأ أثناء الشراء");
    } finally {
      setProcessing(false);
    }
  }

  // شراء مجاني
  async function claimFree() {
    if (!user) return navigate({ to: "/login" });
    setProcessing(true);
    const { data: newPurchase, error } = await supabase
      .from("gd_purchases")
      .insert({
        listing_id: listing!.id,
        buyer_id: user.id,
        seller_id: listing!.owner_id,
        price_usd: 0,
        payment_method: "credit",
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (!error && newPurchase) {
      if (listing!.listing_type === "template") {
        await supabase.rpc("gd_copy_template_to_buyer", { p_purchase_id: newPurchase.id });
      }
      setPurchase(newPurchase);
    }
    setProcessing(false);
  }

  // بدء طلب دفع بفودافون كاش
  async function submitVodafonePayment() {
    if (!user) return navigate({ to: "/login" });
    if (!vfPhone.trim()) {
      alert("اكتب رقم فودافون كاش بتاعك");
      return;
    }
    setProcessing(true);
    try {
      const { data: newPurchase, error } = await supabase
        .from("gd_purchases")
        .insert({
          listing_id: listing!.id,
          buyer_id: user.id,
          seller_id: listing!.owner_id,
          price_usd: listing!.price_usd,
          payment_method: "vodafone_cash",
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("gd_vodafone_payments").insert({
        purchase_id: newPurchase.id,
        buyer_phone: vfPhone.trim(),
        amount_egp: priceEgp,
        buyer_note: vfNote.trim() || null,
        status: "pending_seller_or_admin",
      });

      setPurchase(newPurchase);
      setShowVfModal(false);
      alert("تم إرسال طلب الدفع، مستني موافقة البائع أو الأدمن خلال وقت قصير");
    } catch (e) {
      console.error(e);
      alert("حصل خطأ أثناء إرسال الطلب");
    } finally {
      setProcessing(false);
    }
  }

  async function downloadFile() {
    if (!purchase) return;
    setProcessing(true);
    const { data, error } = await supabase.functions.invoke("get-download-url", {
      body: { purchase_id: purchase.id },
    });
    setProcessing(false);
    if (error || !data?.url) {
      alert("تعذر إنشاء رابط التحميل");
      return;
    }
    window.open(data.url, "_blank");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 px-4 py-4">
        <Link to="/graphic-design/market" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" /> السوق
        </Link>
      </header>

      <div className="container mx-auto grid gap-8 px-4 py-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-neutral-900">
          {listing.preview_image_url ? (
            <img src={listing.preview_image_url} alt={listing.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-white/20">لا توجد معاينة</div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-black">{listing.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{listing.description}</p>

          <div className="mt-4 flex items-center gap-3">
            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-500">{listing.license}</span>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs">
              {listing.listing_type === "template" ? "قالب قابل للتعديل" : "ملف تحميل مباشر"}
            </span>
          </div>

          <div className="mt-6 text-3xl font-black text-red-500 flex items-center gap-1">
            <DollarSign className="h-6 w-6" /> {isFree ? "مجاني" : listing.price_usd}
          </div>

          <div className="mt-6 space-y-3">
            {purchase?.status === "completed" ? (
              <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-sm">
                <p className="flex items-center gap-2 font-black text-green-500">
                  <CheckCircle2 className="h-4 w-4" /> تم الشراء
                </p>
                {listing.listing_type === "template" && purchase.copied_project_id ? (
                  <Link
                    to="/graphic-design/editor"
                    search={{ project: purchase.copied_project_id }}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white"
                  >
                    <Wand2 className="h-4 w-4" /> افتح في المحرر وعدّل عليه
                  </Link>
                ) : (
                  <button
                    onClick={downloadFile}
                    disabled={processing}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" /> تحميل الملف
                  </button>
                )}
              </div>
            ) : purchase?.status === "pending" ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                <p className="flex items-center gap-2 font-black text-amber-500">
                  <Clock className="h-4 w-4" /> طلب الدفع قيد المراجعة
                </p>
                <p className="mt-1 text-xs text-muted-foreground">هيتم تفعيل التصميم فور موافقة البائع أو الأدمن</p>
              </div>
            ) : isFree ? (
              <button
                onClick={claimFree}
                disabled={processing}
                className="w-full rounded-xl bg-red-600 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {processing ? "جاري التنفيذ..." : "احصل عليه مجاناً"}
              </button>
            ) : (
              <>
                <button
                  onClick={buyWithCredits}
                  disabled={processing}
                  className="w-full rounded-xl bg-red-600 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {processing ? "جاري التنفيذ..." : "ادفع بالكريدت"}
                </button>
                <button
                  onClick={() => setShowVfModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-500 py-3 text-sm font-black text-red-500"
                >
                  <Smartphone className="h-4 w-4" /> ادفع بفودافون كاش ({priceEgp} ج.م)
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showVfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6">
            <h3 className="text-lg font-black">الدفع بفودافون كاش</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              حوّل مبلغ <b className="text-red-500">{priceEgp} ج.م</b> على رقم البائع، واكتب رقمك تحت لتأكيد التحويل
            </p>
            <input
              value={vfPhone}
              onChange={(e) => setVfPhone(e.target.value)}
              placeholder="رقم فودافون كاش بتاعك"
              className="mt-4 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            />
            <textarea
              value={vfNote}
              onChange={(e) => setVfNote(e.target.value)}
              placeholder="ملاحظة (اختياري) — مثلاً وقت التحويل"
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
              rows={2}
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={submitVodafonePayment}
                disabled={processing}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-black text-white disabled:opacity-50"
              >
                {processing ? "جاري الإرسال..." : "أكدت إني حوّلت"}
              </button>
              <button onClick={() => setShowVfModal(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

