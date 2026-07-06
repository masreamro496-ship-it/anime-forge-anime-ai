import { Link } from "@tanstack/react-router";
import { Lock, ArrowRight } from "lucide-react";
import { useSiteLock } from "@/hooks/use-site-lock";

export function SiteLockGate({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { locked, message, loading } = useSiteLock(slug);
  if (loading) return <>{children}</>;
  if (!locked) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-gold/40 bg-card p-8 text-center shadow-gold">
        <Lock className="mx-auto h-14 w-14 text-gold" />
        <h1 className="mt-4 text-2xl font-black text-gradient-gold">الصفحة تحت الصيانة</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {message ?? "هذه الصفحة مقفلة مؤقتاً من قِبل الإدارة. برجاء المحاولة لاحقاً."}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-3 text-sm font-black text-gold-foreground shadow-gold"
        >
          <ArrowRight className="h-4 w-4 rotate-180" /> العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
