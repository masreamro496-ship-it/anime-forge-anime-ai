// src/routes/graphic-design.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowRight,
  Palette,
  Wand2,
  Upload,
  DollarSign,
  Sparkles,
  Users,
  LayoutDashboard,
} from "lucide-react";

export const Route = createFileRoute("/graphic-design")({
  head: () => ({
    meta: [
      { title: "جرافيك ديزاين | انمي فورج — محرر تصميم وسوق رقمي" },
      {
        name: "description",
        content:
          "صمّم لوحات أنمي، لوجوهات، وتصاميم شركات بمحرر جرافيك احترافي، وابيعها للناس واكسب فلوس على انمي فورج.",
      },
    ],
  }),
  component: GraphicDesignPage,
});

function GraphicDesignPage() {
  const { user } = useAuth();

  const sections = [
    {
      icon: Wand2,
      title: "محرر التصميم",
      desc: "ابدأ تصميم لوجو، غلاف، كرت عمل، أو أي تصميم من الصفر",
      to: "/graphic-design/editor",
    },
    {
      icon: DollarSign,
      title: "السوق",
      desc: "تصفّح وشراء تصاميم وقوالب جاهزة من مصممين تانيين",
      to: "/graphic-design/market",
    },
    {
      icon: Users,
      title: "المعرض",
      desc: "شوف وشارك أعمال المجتمع، وتابع مصممينك المفضلين",
      to: "/graphic-design/gallery",
    },
    {
      icon: LayoutDashboard,
      title: "لوحة تحكمي",
      desc: "تابع أرباحك، مبيعاتك، وطلبات الدفع",
      to: "/graphic-design/dashboard",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-red-500" />
            <span className="text-lg font-black text-red-500">جرافيك ديزاين</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-8">
        <div className="relative overflow-hidden rounded-3xl border-2 border-red-500 bg-gradient-to-br from-red-600/25 via-red-900/10 to-transparent p-6 text-center shadow-lg sm:p-10">
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-red-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-red-700/20 blur-3xl" />

          <Palette className="mx-auto h-10 w-10 text-red-500 animate-pulse" />

          <h1 className="mt-3 text-2xl font-black leading-snug sm:text-4xl">
            صمّم واكسب فلوس من <span className="text-red-500">الجرافيك ديزاين</span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
            محرر تصميم كامل + سوق رقمي لبيع لوحات أنمي، لوحات نصوص، وتصاميم شركات
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/graphic-design/editor"
              className="flex items-center gap-2 rounded-2xl bg-red-600 px-8 py-4 text-base font-black text-white shadow-lg transition-transform hover:scale-[1.03]"
            >
              <Wand2 className="h-5 w-5" /> افتح المحرر
            </Link>
            {user ? (
              <Link
                to="/graphic-design/upload"
                className="flex items-center gap-2 rounded-2xl border-2 border-red-500 bg-red-500/10 px-8 py-4 text-base font-black text-red-500 transition-transform hover:scale-[1.03]"
              >
                <Upload className="h-5 w-5" /> انشر تصميمك للبيع
              </Link>
            ) : (
              <Link
                to="/login"
                search={{ redirect: "/graphic-design/upload" }}
                className="flex items-center gap-2 rounded-2xl border-2 border-red-500 bg-red-500/10 px-8 py-4 text-base font-black text-red-500 transition-transform hover:scale-[1.03]"
              >
                <Upload className="h-5 w-5" /> سجّل وابدأ البيع
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* الأقسام */}
      <section className="container mx-auto px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map(({ icon: Icon, title, desc, to }) => (
            <Link
              key={to}
              to={to}
              className="rounded-2xl border-2 border-red-500/30 bg-card p-6 transition-colors hover:border-red-500"
            >
              <Icon className="h-8 w-8 text-red-500" />
              <h3 className="mt-3 text-lg font-black">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* شرح نشر التصميم */}
      <section className="container mx-auto px-4 pb-16">
        <div className="rounded-2xl border-2 border-red-500/50 bg-gradient-to-br from-red-600/15 to-transparent p-6 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-red-500" />
          <h3 className="mt-2 text-lg font-black">عايز تبيع تصميمك؟</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            نشر أي تصميم بيكلّف 10 كريدت بس، وسعرك يقدر يوصل لحد 80 دولار — والدفع يتقبل بالكريدت أو فودافون كاش
          </p>
        </div>
      </section>
    </div>
  );
}

