import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl, uploadUserFile, publicUrl } from "@/lib/storage";
import { ShieldCheck, ArrowRight, Check, X, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    if (!roles?.some((r) => r.role === "admin")) throw redirect({ to: "/dashboard" });
  },
  component: AdminPanel,
});

function AdminPanel() {
  const [tab, setTab] = useState<"requests" | "payments">("requests");
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 backdrop-blur-md bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm font-bold"><ArrowRight className="h-4 w-4" /> العودة</Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-gold" />
            <span className="text-base font-black text-gradient-gold">لوحة الأدمن</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTab("requests")}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === "requests" ? "bg-gradient-gold text-gold-foreground" : "border border-border bg-card"}`}
          >
            طلبات التوليد
          </button>
          <button
            onClick={() => setTab("payments")}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === "payments" ? "bg-gradient-gold text-gold-foreground" : "border border-border bg-card"}`}
          >
            مدفوعات قيد المراجعة
          </button>
        </div>

        {tab === "requests" ? <RequestsTable /> : <PaymentsTable />}
      </main>
    </div>
  );
}

/* ---------------- Generation requests ---------------- */
function RequestsTable() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generation_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [active, setActive] = useState<string | null>(null);

  if (isLoading) return <p className="text-muted-foreground">جاري التحميل...</p>;
  if (!data?.length) return <p className="text-muted-foreground">لا توجد طلبات حالياً</p>;

  return (
    <div className="space-y-3">
      {data.map((r) => (
        <RequestRow
          key={r.id}
          row={r}
          expanded={active === r.id}
          onToggle={() => setActive((p) => (p === r.id ? null : r.id))}
          onChange={() => qc.invalidateQueries({ queryKey: ["admin", "requests"] })}
        />
      ))}
    </div>
  );
}

function RequestRow({ row, expanded, onToggle, onChange }: { row: any; expanded: boolean; onToggle: () => void; onChange: () => void }) {
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300",
    in_review: "bg-blue-500/20 text-blue-300",
    completed: "bg-green-500/20 text-green-300",
    rejected: "bg-red-500/20 text-red-300",
  };

  const handleApproveAndUpload = async () => {
    if (!resultFile) return toast.error("ارفع ملف النتيجة أولاً");
    setBusy(true);
    try {
      const path = await uploadUserFile("gen-outputs", row.user_id, resultFile, "result-");
      const url = publicUrl("gen-outputs", path);

      // Deduct credits from the user's balance
      const { data: bal } = await supabase.from("credits").select("balance").eq("user_id", row.user_id).maybeSingle();
      const newBalance = Math.max(0, Number(bal?.balance ?? 0) - Number(row.credits_charged ?? 0));
      await supabase.from("credits").update({ balance: newBalance }).eq("user_id", row.user_id);
      await supabase.from("credit_transactions").insert({
        user_id: row.user_id,
        amount: -Number(row.credits_charged ?? 0),
        kind: "spend",
        description: `${row.type} request ${row.id}`,
      });

      const { error } = await supabase
        .from("generation_requests")
        .update({ status: "completed", result_url: url, reviewed_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw error;
      toast.success("تم تسليم الطلب للمستخدم");
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("generation_requests")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw error;
      toast.success("تم رفض الطلب");
      onChange();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const openSigned = async (path: string) => {
    try {
      const url = await signedUrl("gen-inputs", path);
      window.open(url, "_blank");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`rounded px-2 py-0.5 text-xs font-bold ${statusColor[row.status]}`}>{row.status}</span>
          <span className="text-xs font-bold">{row.type === "video" ? "فيديو" : "صوت غوكو"}</span>
          <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("ar-EG")}</span>
          <span className="text-xs text-gold">{Number(row.credits_charged)} كريديت</span>
        </div>
        <button onClick={onToggle} className="text-sm font-bold text-gold">{expanded ? "إخفاء" : "معاينة"}</button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="text-xs text-muted-foreground">User ID: <code dir="ltr">{row.user_id}</code></div>
          <div>
            <div className="text-xs font-bold text-muted-foreground">Prompt:</div>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-background/40 p-3 text-sm">{row.prompt}</p>
          </div>

          {row.type === "video" && (
            <div className="flex flex-wrap gap-2">
              {row.start_image_url && (
                <button onClick={() => openSigned(row.start_image_url)} className="flex items-center gap-1 rounded border border-border bg-background px-3 py-1.5 text-xs">
                  <ExternalLink className="h-3 w-3" /> صورة البداية
                </button>
              )}
              {row.end_image_url && (
                <button onClick={() => openSigned(row.end_image_url)} className="flex items-center gap-1 rounded border border-border bg-background px-3 py-1.5 text-xs">
                  <ExternalLink className="h-3 w-3" /> صورة النهاية
                </button>
              )}
              {row.duration_seconds && <span className="rounded bg-background px-3 py-1.5 text-xs">المدة: {row.duration_seconds} ث</span>}
            </div>
          )}

          {row.status === "completed" && row.result_url && (
            <a href={row.result_url} target="_blank" className="inline-flex items-center gap-1 text-sm text-gold underline">
              <ExternalLink className="h-3 w-3" /> النتيجة المسلّمة
            </a>
          )}

          {row.status !== "completed" && row.status !== "rejected" && (
            <div className="space-y-2 rounded-lg border border-gold/30 bg-gold/5 p-3">
              <div className="text-xs font-bold text-gold">رفع الملف النهائي وتسليمه للمستخدم:</div>
              <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-border bg-background px-3 py-2 text-xs">
                <Upload className="h-3.5 w-3.5" />
                <span>{resultFile?.name ?? "اختر ملف النتيجة"}</span>
                <input type="file" className="hidden" onChange={(e) => setResultFile(e.target.files?.[0] ?? null)} />
              </label>
              <div className="flex gap-2">
                <button
                  disabled={busy || !resultFile}
                  onClick={handleApproveAndUpload}
                  className="flex items-center gap-1 rounded bg-gradient-gold px-3 py-1.5 text-xs font-black text-gold-foreground disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" /> اعتماد وتسليم
                </button>
                <button
                  disabled={busy}
                  onClick={handleReject}
                  className="flex items-center gap-1 rounded border border-destructive bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive"
                >
                  <X className="h-3.5 w-3.5" /> رفض
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Payments ---------------- */
function PaymentsTable() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_payments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-muted-foreground">جاري التحميل...</p>;
  if (!data?.length) return <p className="text-muted-foreground">لا توجد مدفوعات</p>;

  const approve = async (p: any) => {
    try {
      // Grant PRO + 50 credits
      await supabase.from("profiles").update({ is_pro: true, pro_expires_at: null }).eq("id", p.user_id);
      await supabase.from("user_roles").insert({ user_id: p.user_id, role: "pro" });
      const { data: bal } = await supabase.from("credits").select("balance").eq("user_id", p.user_id).maybeSingle();
      const newBalance = Number(bal?.balance ?? 0) + 50;
      await supabase.from("credits").update({ balance: newBalance }).eq("user_id", p.user_id);
      await supabase.from("credit_transactions").insert({
        user_id: p.user_id,
        amount: 50,
        kind: "pro_bonus",
        description: `PRO upgrade — payment ${p.id}`,
      });
      await supabase.from("pending_payments").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", p.id);
      toast.success("تم اعتماد الترقية وإضافة 50 كريديت");
      qc.invalidateQueries({ queryKey: ["admin", "payments"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const reject = async (p: any) => {
    await supabase.from("pending_payments").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", p.id);
    toast.success("تم الرفض");
    qc.invalidateQueries({ queryKey: ["admin", "payments"] });
  };

  const viewReceipt = async (path: string) => {
    try {
      const url = await signedUrl("receipts", path);
      window.open(url, "_blank");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      {data.map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold">رقم العملية: <code dir="ltr">{p.op_number}</code></div>
              <div className="text-xs text-muted-foreground">User: {p.user_id}</div>
              <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("ar-EG")}</div>
            </div>
            <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-300">{p.status}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => viewReceipt(p.receipt_url)} className="flex items-center gap-1 rounded border border-border bg-background px-3 py-1.5 text-xs">
              <ExternalLink className="h-3 w-3" /> عرض الإيصال
            </button>
            {p.status === "pending" && (
              <>
                <button onClick={() => approve(p)} className="flex items-center gap-1 rounded bg-gradient-gold px-3 py-1.5 text-xs font-black text-gold-foreground">
                  <Check className="h-3.5 w-3.5" /> اعتماد + 50 كريديت
                </button>
                <button onClick={() => reject(p)} className="flex items-center gap-1 rounded border border-destructive bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive">
                  <X className="h-3.5 w-3.5" /> رفض
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
