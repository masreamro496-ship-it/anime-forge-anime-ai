import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Search } from "lucide-react";

/** بحث الإدارة — اكتب الكلمة الصحيحة لتحصل على كامل صلاحيات الأدمن */
export default function AdminCodeBox() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.rpc("grant_admin_by_code", { _code: code });
    setLoading(false);
    if (error) return toast.error("حصل خطأ، جرّب تاني");
    if (data === true) {
      toast.success("تم منحك كل صلاحيات الإدارة ✅");
      setCode("");
      navigate({ to: "/admin" });
    } else {
      toast.error("الكلمة غير صحيحة");
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-3 shadow-card">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-gold" /> بحث الإدارة
      </p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="اكتب كلمة الدخول للإدارة"
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="flex items-center gap-1 rounded-xl bg-gradient-gold px-4 py-2 text-xs font-black text-gold-foreground disabled:opacity-50"
        >
          <Search className="h-4 w-4" /> بحث
        </button>
      </div>
    </form>
  );
}
