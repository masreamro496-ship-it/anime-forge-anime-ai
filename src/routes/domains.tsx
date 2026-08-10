import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Globe, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/domains")({
  head: () => ({
    meta: [
      { title: "دومينات مستقلة | انمي فورج" },
      { name: "description", content: "احصل على دومين .com مستقل لموقعك من انمي فورج مقابل 1000 كريدت في السنة الأولى و1800 كريدت في السنة الثانية." },
      { property: "og:title", content: "دومينات مستقلة — انمي فورج" },
      { property: "og:description", content: "اطلب دومين .com مستقل وسيقوم المطورون بشرائه وتسليمه لك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DomainsPage,
});

function DomainsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [year, setYear] = useState<1 | 2>(1);
  const [domain, setDomain] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const cost = year === 1 ? 1000 : 1800;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("request_domain", {
        _domain: domain.trim(),
        _url: url.trim(),
        _year: year,
      });
      if (error) throw error;
      toast.success("تم إرسال الطلب ✅ سيصل للمطوّرين وسيتم شراء الدومين المستقل وإعطاؤه لك");
      setDomain("");
      setUrl("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ";
      toast.error(msg.includes("insufficient") ? "رصيد الكريدت غير كافٍ، يرجى الشحن" : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowRight className="h-4 w-4" /> الرئيسية
      </Link>

      <div className="rounded-3xl border-2 border-sky-500/60 bg-gradient-to-br from-sky-500/15 to-indigo-500/10 p-6">
        <Globe className="h-10 w-10 text-sky-400" />
        <h1 className="mt-3 text-2xl font-black text-sky-300">دومينات مستقلة</h1>
        <p className="mt-2 text-sm leading-7 text-foreground/85">
          ادفع <b className="text-sky-300">1000 كريدت</b> للحصول على دومين مستقل في السنة الأولى، ثم
          ادفع <b className="text-sky-300">1800 كريدت</b> للحصول عليه في السنة الثانية.
          <br />
          اكتب اسم الدومين المطلوب ورابط موقعك — وستحصل في النهاية على رابط <b>.com</b> فقط، وسيصل
          الطلب للمطوّرين وسيتم شراء الدومين المستقل وإعطاؤه لك.
        </p>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-6">
        <div className="flex gap-2">
          {([1, 2] as const).map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={`flex-1 rounded-xl border-2 py-3 text-sm font-black transition ${
                year === y ? "border-sky-500 bg-sky-500/20 text-sky-300" : "border-border"
              }`}
            >
              {y === 1 ? "السنة الأولى — 1000 كريدت" : "السنة الثانية — 1800 كريدت"}
            </button>
          ))}
        </div>

        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          required
          placeholder="اسم الدومين المطلوب (مثال: myanime.com)"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/50"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="رابط موقعك الحالي (https://...)"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/50"
        />

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 py-3 text-base font-black text-white disabled:opacity-60"
        >
          {busy ? "جاري الإرسال..." : `ادفع ${cost} كريدت واطلب الدومين`}
        </button>
        <p className="text-center text-xs text-muted-foreground">ستحصل على رابط .com فقط</p>
      </form>
    </div>
  );
}
