import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowRight, Code2, Send, Percent } from "lucide-react";

export const Route = createFileRoute("/apply-developer")({
  head: () => ({
    meta: [
      { title: "تقديم مطوّر — انضم لفريق تطوير انمي فورج" },
      { name: "description", content: "قدّم كمطوّر في منصة انمي فورج واحصل على نسبة 25% من أرباح الموقع." },
      { property: "og:title", content: "تقديم مطوّر — انمي فورج" },
      { property: "og:description", content: "انضم لفريق التطوير واحصل على 25% من أرباح المنصة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApplyDeveloperPage,
});

function ApplyDeveloperPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) { toast.error("سجّل دخولك أولاً"); void navigate({ to: "/login" }); return; }
    if (fullName.trim().length < 2) return toast.error("اكتب اسمك");
    if (info.trim().length < 10) return toast.error("اكتب كل معلوماتك وخبراتك");
    setSaving(true);
    try {
      const { error } = await (supabase as unknown as {
        from: (t: string) => { insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
      }).from("staff_applications").insert({
        user_id: user.id,
        kind: "developer",
        full_name: fullName.trim(),
        age: age ? Number(age) : null,
        phone: phone.trim() || null,
        skills: skills.trim() || null,
        info: info.trim(),
      });
      if (error) throw new Error(error.message);
      toast.success("تم إرسال طلبك ✅ سيتم مراجعته قريباً");
      setFullName(""); setAge(""); setPhone(""); setSkills(""); setInfo("");
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
            <Code2 className="h-5 w-5 text-sky-400" />
            <h1 className="text-lg font-black text-sky-300">تقديم مطوّر</h1>
          </div>
        </div>
      </header>

      <section className="container mx-auto max-w-2xl px-4 py-6 space-y-5">
        <div className="rounded-2xl border-2 border-sky-500/50 bg-gradient-to-br from-sky-500/15 to-indigo-500/5 p-5">
          <div className="flex items-center gap-2 text-sky-300 font-black text-lg">
            <Percent className="h-6 w-6" /> نسبة 25% من أرباح الموقع
          </div>
          <p className="mt-2 text-sm text-foreground/85">
            المطوّر المقبول يحصل على 10 من كل 25% من أرباح المنصة حسب الاتفاق ومساهمته في التطوير.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
          <Input label="الاسم بالكامل" value={fullName} onChange={setFullName} placeholder="اسمك" />
          <Input label="العمر" value={age} onChange={setAge} placeholder="20" type="number" />
          <Input label="رقم الهاتف (اختياري)" value={phone} onChange={setPhone} placeholder="01xxxxxxxxx" />
          <Input label="لغات البرمجة والمهارات" value={skills} onChange={setSkills} placeholder="React, TypeScript, Supabase..." />
          <div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">كل معلوماتك وخبراتك وأعمالك السابقة</label>
            <textarea
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              rows={6}
              placeholder="اكتب خبرتك، مشاريعك، روابط أعمالك..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={submit}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 py-4 text-base font-black text-white shadow-lg disabled:opacity-60"
          >
            <Send className="h-5 w-5" /> {saving ? "جاري الإرسال..." : "إرسال طلب المطوّر"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
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
