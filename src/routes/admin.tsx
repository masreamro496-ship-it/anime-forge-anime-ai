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
  const [tab, setTab] = useState<"requests" | "payments" | "messages" | "shorts" | "purchases" | "credits" | "locks" | "worldcup">("purchases");
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
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { k: "purchases", label: "طلبات الشراء" },
            { k: "requests", label: "طلبات التوليد" },
            { k: "payments", label: "المدفوعات" },
            { k: "shorts", label: "المشاريع" },
            { k: "messages", label: "الرسائل" },
            { k: "credits", label: "منح كريديت" },
            { k: "locks", label: "قفل/فتح الصفحات" },
            { k: "worldcup", label: "كأس العالم" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as typeof tab)}
              className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === t.k ? "bg-gradient-gold text-gold-foreground" : "border border-border bg-card"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "purchases" && <PurchasesTable />}
        {tab === "requests" && <RequestsTable />}
        {tab === "payments" && <PaymentsTable />}
        {tab === "shorts" && <ShortsTable />}
        {tab === "messages" && <MessagesTable />}
        {tab === "credits" && <GrantCreditsPanel />}
        {tab === "locks" && <SiteLocksPanel />}
        {tab === "worldcup" && <WorldCupPanel />}
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

/* ---------------- User messages ---------------- */
function MessagesTable() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "messages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_messages").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <p className="text-muted-foreground">جاري التحميل...</p>;
  if (!data?.length) return <p className="text-muted-foreground">لا توجد رسائل</p>;
  const markRead = async (id: string) => {
    await supabase.from("admin_messages").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin", "messages"] });
  };
  return (
    <div className="space-y-2">
      {data.map((m) => (
        <div key={m.id} className={`rounded-xl border p-4 ${m.is_read ? "border-border bg-card" : "border-gold/50 bg-gold/5"}`}>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <code dir="ltr">{m.user_id}</code>
            <span>{new Date(m.created_at).toLocaleString("ar-EG")}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{m.body}</p>
          {!m.is_read && (
            <button onClick={() => markRead(m.id)} className="mt-3 rounded bg-gradient-gold px-3 py-1 text-xs font-black text-gold-foreground">تأكيد القراءة</button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Shorts moderation ---------------- */
function ShortsTable() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "shorts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shorts").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <p className="text-muted-foreground">جاري التحميل...</p>;
  if (!data?.length) return <p className="text-muted-foreground">لا توجد شورتس</p>;
  const remove = async (id: string) => {
    if (!confirm("حذف هذا الشورت نهائياً؟")) return;
    await supabase.from("shorts").delete().eq("id", id);
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["admin", "shorts"] });
  };
  return (
    <div className="space-y-2">
      {data.map((s) => (
        <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-background px-2 py-0.5 text-xs font-bold">{s.status}</span>
              <span className="truncate text-sm font-bold">{s.title || "(بدون عنوان)"}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {s.views_count} مشاهدة • {s.likes_count} إعجاب • {s.comments_count} تعليق • {new Date(s.created_at).toLocaleString("ar-EG")}
            </div>
          </div>
          <button onClick={() => remove(s.id)} className="ml-2 rounded border border-destructive bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">حذف</button>
        </div>
      ))}
    </div>
  );
}

function PurchasesTable() {
  const qc = useQueryClient();
  const sb = supabase as unknown as { from: (t: string) => { select: (c: string) => { order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: { message: string } | null }> } }; rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
  const { data: rows } = useQuery({
    queryKey: ["admin-purchases"],
    queryFn: async () => {
      const res = await sb.from("project_purchases").select("id,project_id,buyer_id,seller_id,price_usd,status,created_at").order("created_at", { ascending: false });
      if (res.error) throw new Error(res.error.message);
      return (res.data ?? []) as { id: string; project_id: string; buyer_id: string; seller_id: string; price_usd: number; status: string; created_at: string }[];
    },
  });

  const approve = async (id: string) => {
    const res = await sb.rpc("approve_purchase", { _purchase_id: id });
    if (res.error) return toast.error(res.error.message);
    toast.success("تم التفعيل");
    qc.invalidateQueries({ queryKey: ["admin-purchases"] });
  };

  if (!rows?.length) return <p className="text-center text-sm text-muted-foreground py-10">لا توجد طلبات شراء.</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="text-xs">
            <div className="font-bold">مشروع {r.project_id.slice(0, 8)} • مشتري {r.buyer_id.slice(0, 8)}</div>
            <div className="text-muted-foreground">{new Date(r.created_at).toLocaleString("ar-EG")} • ${Number(r.price_usd).toFixed(2)}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${r.status === "approved" ? "bg-green-500/20 text-green-400" : r.status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>{r.status}</span>
            {r.status === "pending" && (
              <button onClick={() => approve(r.id)} className="flex items-center gap-1 rounded-lg bg-gradient-gold px-3 py-1 text-xs font-black text-gold-foreground">
                <Check className="h-3 w-3" /> موافقة
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function GrantCreditsPanel() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const sb = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!userId.trim() || !amt) return toast.error("ادخل user_id وقيمة");
    setBusy(true);
    const res = await sb.rpc("admin_grant_credits", { _target_user: userId.trim(), _amount: amt, _note: note || null });
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(`تم منح ${amt} كريديت`);
    setAmount(""); setNote("");
  };

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-2xl border border-border bg-card p-6">
      <h3 className="text-lg font-black">منح / خصم كريديت لأي مستخدم</h3>
      <div>
        <label className="text-xs font-bold">User ID (UUID)</label>
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs" />
      </div>
      <div>
        <label className="text-xs font-bold">الكمية (سالب للخصم)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" />
      </div>
      <div>
        <label className="text-xs font-bold">ملاحظة (اختياري)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" />
      </div>
      <button disabled={busy} className="w-full rounded-lg bg-gradient-gold py-2.5 text-sm font-black text-gold-foreground shadow-gold disabled:opacity-50">
        {busy ? "جاري..." : "تنفيذ"}
      </button>
    </form>
  );
}
