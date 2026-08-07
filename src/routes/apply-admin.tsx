import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck, Coins, Send, Code2 } from "lucide-react";

export const Route = createFileRoute("/apply-admin")({
  head: () => ({
    meta: [
      { title: "تقديم إدارة — انضم لفريق إدارة انمي فورج" },
      { name: "description", content: "قدّم للانضمام لفريق الإدارة واحصل على 500 كريدت شهرياً بالإضافة إلى أرباح من المنصة." },
      { property: "og:title", content: "تقديم إدارة — انمي فورج" },
      { property: "og:description", content: "500 كريدت شهرياً + أرباح من المنصة لأعضاء فريق الإدارة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApplyAdminPage,
});

function ApplyAdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState("");
  const [info, setInfo] = useState("");
  const [credits, setCredits] = useState("");
  const [saving, setSaving] = useState(false);

  const submitFn = useServerFn(submitStaffApplication);

  const submit = async () => {
    if (!user) { toast.error("سجّل دخولك أولاً"); void navigate({ to: "/login" }); return; }
    if (fullName.trim().length < 2) return toast.error("اكتب اسمك");
    if (info.trim().length < 10) return toast.error("اكتب المعلومات والمواصفات التي تقدمها");
    setSaving(true);
    try {
      await submitFn({ data: {
        kind: "admin",
        full_name: fullName.trim(),
        age: age ? Number(age) : null,
        phone: phone.trim() || null,
        skills: skills.trim() || null,
        info: info.trim(),
        requested_credits: credits ? Number(credits) : null,
      } });
      toast.success("تم إرسال طلبك للإدارة ✅ وصلت رسالة للأدمن");
      setFullName(""); setAge(""); setPhone(""); setSkills(""); setInfo(""); setCredits("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  };


  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 bg-background/70 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4 rotate-180" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-gold" />
            <h1 className="text-lg font-black text-gradient-gold">تقديم إدارة</h1>
          </div>
        </div>
      </header>

      <section className="container mx-auto max-w-2xl px-4 py-6 space-y-5">
        <div className="rounded-2xl border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/15 to-amber-500/5 p-5">
          <div className="flex items-center gap-2 text-yellow-300 font-black text-lg">
            <Coins className="h-6 w-6" /> ستحصل على 500 كريدت كل شهر
          </div>
          <p className="mt-2 text-sm text-foreground/85">
            وقد تحصل أيضاً على أرباح من الموقع حسب أدائك ونشاطك داخل المنصة.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
          <Field label="الاسم بالكامل" value={fullName} onChange={setFullName} placeholder="اسمك" />
          <Field label="كم عمرك؟" value={age} onChange={setAge} placeholder="18" type="number" />
          <Field label="رقم الهاتف (اختياري)" value={phone} onChange={setPhone} placeholder="01xxxxxxxxx" />
          <Field label="المواصفات / المهارات" value={skills} onChange={setSkills} placeholder="خبرة إدارة مجتمعات، تصميم..." />
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">المعلومات والخدمات التي ستقدمها</label>
            <textarea
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              rows={5}
              placeholder="اشرح ما ستقدمه للمنصة..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <Field label="كم مبلغ الكريدت الذي تحتاجه؟" value={credits} onChange={setCredits} placeholder="500" type="number" />

          <button
            onClick={submit}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-600 py-4 text-base font-black text-black shadow-lg disabled:opacity-60"
          >
            <Send className="h-5 w-5" /> {saving ? "جاري الإرسال..." : "إرسال طلب الإدارة"}
          </button>
        </div>

        <Link
          to="/apply-developer"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-sky-500/60 bg-gradient-to-r from-sky-500/20 to-indigo-500/15 py-4 text-base font-black text-sky-300"
        >
          <Code2 className="h-5 w-5" /> تقديم مطوّر — احصل على 25% من أرباح الموقع
        </Link>
      </section>
    </div>
  );
}

export function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}
