// src/routes/graphic-design.dashboard.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, DollarSign, Download, ShoppingBag, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/graphic-design/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [pendingVf, setPendingVf] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    const [{ data: l }, { data: s }] = await Promise.all([
      supabase.from("gd_listings").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("gd_purchases").select("*, gd_listings(title)").eq("seller_id", user!.id).order("created_at", { ascending: false }),
    ]);
    setListings(l || []);
    setSales(s || []);

    const { data: vf } = await supabase
      .from("gd_vodafone_payments")
      .select("*, gd_purchases!inner(seller_id, listing_id, buyer_id, price_usd)")
      .eq("gd_purchases.seller_id", user!.id)
      .eq("status", "pending_seller_or_admin");
    setPendingVf(vf || []);
    setLoading(false);
  }

  async function approvePayment(vfId: string, purchaseId: string) {
    await supabase
      .from("gd_vodafone_payments")
      .update({ status: "approved", approved_by: user!.id, approved_by_role: "seller", resolved_at: new Date().toISOString() })
      .eq("id", vfId);

    const { data: purchase } = await supabase.from("gd_purchases").select("*, gd_listings(listing_type)").eq("id", purchaseId).single();

    await supabase
      .from("gd_purchases")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", purchaseId);

    if (purchase?.gd_listings?.listing_type === "template") {
      await supabase.rpc("gd_copy_template_to_buyer", { p_purchase_id: purchaseId });
    }

    load();
  }

  async function rejectPayment(vfId: string, purchaseId: string) {
    await supabase
      .from("gd_vodafone_payments")
      .update({ status: "rejected", approved_by: user!.id, approved_by_role: "seller", resolved_at: new Date().toISOString() })
      .eq("id", vfId);
    await supabase.from("gd_purchases").update({ status: "rejected" }).eq("id", purchaseId);
    load();
  }

  if (!user) return null;

  const totalEarnings = sales.filter((s) => s.status === "completed").reduce((sum, s) => sum + Number(s.price_usd), 0);
  const totalSales = sales.filter((s) => s.status === "completed").length;
  const totalDownloads = listings.reduce((sum, l) => sum + (l.downloads_count || 0), 0);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 px-4 py-4">
        <Link to="/graphic-design" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" /> جرافيك ديزاين
        </Link>
      </header>

      <div className="container mx-auto px-4 py-6">
        <h1 className="mb-6 text-2xl font-black">لوحة تحكم المصمم</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-red-500" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <StatCard icon={DollarSign} label="إجمالي الأرباح" value={`$${totalEarnings.toFixed(2)}`} />
              <StatCard icon={ShoppingBag} label="عدد المبيعات" value={String(totalSales)} />
              <StatCard icon={Download} label="عدد التحميلات" value={String(totalDownloads)} />
            </div>

            {pendingVf.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-lg font-black flex items-center gap-2 text-amber-500">
                  <Clock className="h-4 w-4" /> طلبات دفع فودافون كاش قيد المراجعة ({pendingVf.length})
                </h2>
                <div className="space-y-2">
                  {pendingVf.map((vf) => (
                    <div key={vf.id} className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
                      <div className="text-sm">
                        <p className="font-bold">رقم المشتري: {vf.buyer_phone}</p>
                        <p className="text-xs text-muted-foreground">
                          المبلغ: {vf.amount_egp} ج.م {vf.buyer_note && `— ${vf.buyer_note}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approvePayment(vf.id, vf.purchase_id)}
                          className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-black text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> استلمت المبلغ
                        </button>
                        <button
                          onClick={() => rejectPayment(vf.id, vf.purchase_id)}
                          className="flex items-center gap-1 rounded-lg border border-red-500 px-3 py-1.5 text-xs font-black text-red-500"
                        >
                          <XCircle className="h-3.5 w-3.5" /> رفض
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  ملاحظة: الأدمن برضه يقدر يوافق على أي طلب من لوحة تحكم الإدارة مباشرة لو البائع اتأخر
                </p>
              </div>
            )}

            <h2 className="mb-3 text-lg font-black">تصاميمي المعروضة</h2>
            <div className="space-y-2">
              {listings.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <div>
                    <p className="text-sm font-bold">{l.title}</p>
                    <p className="text-xs text-muted-foreground">${l.price_usd} · {l.downloads_count} تحميل</p>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
              ))}
              {listings.length === 0 && <p className="text-sm text-muted-foreground">لسه معرضتش أي تصميم للبيع</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Icon className="h-6 w-6 text-red-500" />
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: "منشور", cls: "bg-green-500/10 text-green-500" },
    pending: { label: "قيد المراجعة", cls: "bg-amber-500/10 text-amber-500" },
    rejected: { label: "مرفوض", cls: "bg-red-500/10 text-red-500" },
  };
  const s = map[status] || map.pending;
  return <span className={`rounded-full px-3 py-1 text-[10px] font-black ${s.cls}`}>{s.label}</span>;
}

