import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import {
  Sparkles,
  Play,
  Music,
  Wand2,
  User,
  DollarSign,
  Upload,
  Rocket,
  Film,
  MessageCircle,
  Palette,
  Smartphone,
  Heart,
  Crown,
  LogIn,
  ImagePlus,
  ChevronDown,
  Code2,
  Shield,
} from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";
import { GlobalLanguageSelector } from "@/components/LanguageSwitcher";
import gameComingSoon from "@/assets/world-cup-game.jpg";
import { PaidFeatureGate } from "@/components/PaidFeatureGate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "انمي فورج | Anime Forge — مشاهدة انمي مترجم اونلاين، توليد أنمي بالذكاء الاصطناعي، شورتس، دبلجة، ألعاب",
      },
      {
        name: "description",
        content:
          "انمي فورج (Anime Forge): أفضل منصة عربية لمشاهدة انمي مترجم اونلاين بجودة 4K، توليد وصناعة حلقات وأفلام أنمي بالذكاء الاصطناعي، شورتس أنمي، دبلجة عربية، بيع وشراء مشاريع أنمي، ألعاب كأس العالم، ودردشة مباشرة. ابدأ الآن مجاناً على anime-forge-anime-ai.lovable.app",
      },
      {
        name: "keywords",
        content:
          "انمي فورج, Anime Forge, انمي, مشاهدة انمي, مشاهدة انمي مترجم, انمي مترجم اونلاين, انمي اون لاين, تحميل انمي, انمي بالذكاء الاصطناعي, توليد انمي AI, صناعة انمي, حلقات انمي, افلام انمي, افلام انمي مترجمة, شورتس انمي, دبلجة انمي, دبلجة انمي عربي, بيع مشاريع انمي, شراء مشاريع انمي, كأس العالم انمي, العاب انمي, دردشة انمي, مانجا انمي, صور انمي بالذكاء الاصطناعي, انمي 4K, انمي فورج تسجيل دخول, anime forge site, anime ai generator arabic, مواقع مشاهدة انمي عربي",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { name: "author", content: "انمي فورج - Anime Forge" },
      { name: "language", content: "Arabic" },
      { name: "revisit-after", content: "1 days" },

      { property: "og:site_name", content: "انمي فورج — Anime Forge" },
      {
        property: "og:title",
        content: "انمي فورج | Anime Forge — مشاهدة وصناعة الأنمي بالذكاء الاصطناعي",
      },
      {
        property: "og:description",
        content:
          "شاهد وصنع وبيع أنمي بالذكاء الاصطناعي: حلقات، أفلام، شورتس، دبلجة عربية، وألعاب — كل شيء في مكان واحد على انمي فورج.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://anime-forge-anime-ai.lovable.app" },
      { property: "og:locale", content: "ar_AR" },

      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "انمي فورج | Anime Forge — مشاهدة وصناعة الأنمي بالذكاء الاصطناعي" },
      {
        name: "twitter:description",
        content: "منصة الأنمي العربية الأولى: توليد أنمي بالـ AI، مشاهدة حلقات وأفلام، شورتس، دبلجة وألعاب.",
      },
    ],
    links: [{ rel: "canonical", href: "https://anime-forge-anime-ai.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "انمي فورج — Anime Forge",
          alternateName: [
            "Anime Forge",
            "انمي فورج",
            "موقع انمي فورج",
            "منصة انمي فورج",
            "Anime Forge AI",
          ],
          url: "https://anime-forge-anime-ai.lovable.app/",
          inLanguage: "ar",
          description:
            "منصة انمي فورج لمشاهدة وصناعة وبيع الأنمي بالذكاء الاصطناعي: حلقات، أفلام، شورتس، دبلجة، وألعاب.",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://anime-forge-anime-ai.lovable.app/anime-market?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "انمي فورج - Anime Forge",
          alternateName: "Anime Forge",
          url: "https://anime-forge-anime-ai.lovable.app/",
          logo: "https://anime-forge-anime-ai.lovable.app/favicon.ico",
          sameAs: [],
          description:
            "انمي فورج منصة عربية لتوليد ومشاهدة وبيع محتوى الأنمي بالذكاء الاصطناعي.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "انمي فورج",
              item: "https://anime-forge-anime-ai.lovable.app/",
            },
          ],
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user } = useAuth();
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-gold" />
              <span className="text-xl font-black text-gradient-gold">انمي فورج</span>
            </Link>
            <GlobalLanguageSelector />
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/audio" className="hidden sm:inline-flex rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold">
              الصوتيات
            </Link>
            {user ? (
              <>
                <Link to="/profile" className="flex items-center gap-1 rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-xs font-black text-gold">
                  <User className="h-3.5 w-3.5" /> PROFILE
                </Link>
                <Link to="/dashboard" className="rounded-lg bg-gradient-gold px-3 py-2 text-xs font-black text-gold-foreground shadow-gold">
                  لوحتي
                </Link>
              </>
            ) : (
              <Link to="/login" className="rounded-lg bg-gradient-gold px-4 py-2 text-sm font-bold text-gold-foreground shadow-gold">
                تسجيل الدخول
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* SEO: h1 مخفي بصرياً لتعزيز الكلمات المفتاحية دون التأثير على التصميم */}
      <h1 className="sr-only">
        انمي فورج Anime Forge — مشاهدة انمي مترجم اونلاين وتوليد أنمي بالذكاء الاصطناعي
      </h1>

      {/* 🔥 هيرو رئيسي: سجّل دخولك / إنشاء مشروع أنمي — أول حاجة يشوفها الزائر */}
      <section className="container mx-auto px-4 pt-8">
        <div className="relative overflow-hidden rounded-3xl border-2 border-gold bg-gradient-to-br from-gold/25 via-primary/15 to-transparent p-6 text-center shadow-gold sm:p-10">
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />

          <Sparkles className="mx-auto h-10 w-10 text-gold animate-pulse" />

          <h2 className="mt-3 text-2xl font-black leading-snug sm:text-4xl">
            {user ? (
              <>
                جاهز تبدأ؟ <span className="text-gradient-gold">أنشئ مشروع أنمي الآن</span>
              </>
            ) : (
              <>
                سجّل دخولك أولاً <span className="text-gradient-gold">وابدأ رحلتك في عالم الأنمي</span>
              </>
            )}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
            ولّد، انشر، وابيع مشاريع أنمي بالذكاء الاصطناعي — كل الأدوات في مكان واحد
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {!user && (
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-2xl bg-gradient-gold px-8 py-4 text-base font-black text-gold-foreground shadow-gold transition-transform hover:scale-[1.03]"
              >
                <LogIn className="h-5 w-5" /> سجّل دخولك الآن
              </Link>
            )}

            {user ? (
              <Link
                to="/anime-market"
                className="flex items-center gap-2 rounded-2xl bg-gradient-gold px-8 py-4 text-base font-black text-gold-foreground shadow-gold transition-transform hover:scale-[1.03]"
              >
                <Wand2 className="h-5 w-5" /> إنشاء مشروع أنمي
              </Link>
            ) : (
              <Link
                to="/login"
                search={{ redirect: "/anime-market" }}
                className="flex items-center gap-2 rounded-2xl border-2 border-gold bg-gold/10 px-8 py-4 text-base font-black text-gold transition-transform hover:scale-[1.03]"
              >
                <Wand2 className="h-5 w-5" /> إنشاء مشروع أنمي
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Big Gold CTA — Free Shorts */}
      <section className="container mx-auto px-4 pt-6">
        <Link to="/free-shorts" className="block rounded-3xl border-2 border-gold bg-gradient-to-br from-gold/30 via-gold/10 to-transparent p-6 shadow-gold transition-transform hover:scale-[1.01] sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-[10px] font-black text-gold-foreground">
                <Sparkles className="h-3 w-3" /> مجاني للجميع
              </span>
              <h2 className="mt-2 text-2xl font-black text-gradient-gold sm:text-3xl">نشر فيديوهات شورتس القوية</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">30 ثانية كحد أقصى · تظهر لكل زوار الموقع · بدون كريديت</p>
            </div>
            <Upload className="h-12 w-12 shrink-0 text-gold sm:h-16 sm:w-16" />
          </div>
        </Link>
      </section>

      {/* Hero — بيع المشاريع */}
      <section className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-3xl font-black leading-tight md:text-5xl">
          بيع مشاريعك مباشرة بـ <span className="text-gradient-gold">فودافون كاش</span>
        </h2>
        <p className="mt-4 text-sm text-muted-foreground md:text-base">
          ارفع فيديو مشروعك، ضع سعراً بالدولار، والمشتري يحوّل لك مباشرة. أنت توافق على التفعيل.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/shorts" className="rounded-xl bg-gradient-gold px-6 py-3 text-sm font-black text-gold-foreground shadow-gold">
            <DollarSign className="inline h-4 w-4" /> تصفّح المشاريع
          </Link>
          {user ? (
            <Link to="/shorts/upload" className="rounded-xl border-2 border-gold bg-gold/10 px-6 py-3 text-sm font-black text-gold">
              إنشاء مشروع جديد
            </Link>
          ) : (
            <Link to="/login" search={{ redirect: "/shorts/upload" }} className="rounded-xl border-2 border-gold bg-gold/10 px-6 py-3 text-sm font-black text-gold">
              سجّل وابدأ البيع
            </Link>
          )}
        </div>
      </section>

      {/* Main Grid */}
      <section className="container mx-auto px-4 pb-10">
        <div className="grid gap-4 md:grid-cols-2">
          <Link to="/audio" className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-gold">
            <Music className="h-10 w-10 text-gold" />
            <h3 className="mt-3 text-lg font-black">مكتبة الصوتيات</h3>
            <p className="mt-1 text-sm text-muted-foreground">استمع مجاناً · التحميل 5 كريديت لكل ملف</p>
          </Link>

          <Link to="/watermark" className="group relative overflow-hidden rounded-2xl border-2 p-6 transition-transform hover:scale-[1.01]" style={{ borderColor: "#a855f7", background: "linear-gradient(135deg, rgba(168,85,247,0.18), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10px] font-black" style={{ color: "#a855f7" }}>جديد</span>
            <Wand2 className="h-10 w-10" style={{ color: "#a855f7" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#a855f7" }}>حذف العلامة المائية</h3>
            <p className="mt-1 text-sm text-muted-foreground">معالجة متقدمة عبر Cloudinary · 15 كريديت · النتيجة خاصة بك فقط</p>
          </Link>

          {/* شات برمجي — مدفوع بالكريدت */}
          <PaidFeatureGate featureKey="ai_chat" href="https://anime-forge-ai-coder.lovable.app/login" className="group relative block w-full overflow-hidden rounded-2xl border-2 p-6 text-right transition-transform hover:scale-[1.01]" style={{ borderColor: "#3b82f6", background: "linear-gradient(135deg, rgba(59,130,246,0.25), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">New</span>
            <Rocket className="h-10 w-10" style={{ color: "#3b82f6" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#3b82f6" }}>شات برمجي</h3>
            <p className="mt-1 text-sm text-muted-foreground">ادفع 25 كريدت للدخول والتجربة لمدة ساعتين فقط</p>
          </PaidFeatureGate>

          <PaidFeatureGate featureKey="keys" href="https://anime-key-forge.lovable.app/" className="group relative block w-full overflow-hidden rounded-2xl border-2 p-6 text-right transition-transform hover:scale-[1.01]" style={{ borderColor: "#a855f7", background: "linear-gradient(135deg, rgba(168,85,247,0.25), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10px] font-black" style={{ color: "#a855f7" }}>جديد</span>
            <Sparkles className="h-10 w-10" style={{ color: "#a855f7" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#a855f7" }}>إنشاء مفاتيح</h3>
            <p className="mt-1 text-sm text-muted-foreground">ادفع 5 كريدت كل يوم لتجربته · وبعد انتهاء اليوم ادفع مرة أخرى</p>
          </PaidFeatureGate>

          <PaidFeatureGate featureKey="art4k" href="https://anime-forge-4k-art.lovable.app/" className="group relative block w-full overflow-hidden rounded-2xl border-2 p-6 text-right transition-transform hover:scale-[1.01]" style={{ borderColor: "#f97316", background: "linear-gradient(135deg, rgba(249,115,22,0.25), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10px] font-black" style={{ color: "#f97316" }}>جديد</span>
            <Wand2 className="h-10 w-10" style={{ color: "#f97316" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#f97316" }}>توليد جودة أنمي صورية خيالية 4K</h3>
            <p className="mt-1 text-sm text-muted-foreground">ادفع 50 كريدت كل 5 ساعات لتجربته</p>
          </PaidFeatureGate>

          {/* إنشاء صورة بالذكاء الاصطناعي — مدفوع بالكريدت (جديد) */}
          <PaidFeatureGate
            featureKey="image_gen"
            href="https://your-image-generator-app.lovable.app/"
            className="group relative block w-full overflow-hidden rounded-2xl border-2 p-6 text-right transition-transform hover:scale-[1.01]"
            style={{ borderColor: "#8b5cf6", background: "linear-gradient(135deg, rgba(139,92,246,0.25), transparent)" }}
          >
            <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10px] font-black" style={{ color: "#8b5cf6" }}>جديد</span>
            <ImagePlus className="h-10 w-10" style={{ color: "#8b5cf6" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#8b5cf6" }}>إنشاء صورة بالذكاء الاصطناعي</h3>
            <p className="mt-1 text-sm text-muted-foreground">ولّد صور أنمي فريدة من وصف نصي · ادفع 20 كريدت لكل صورة</p>
          </PaidFeatureGate>

          <PaidFeatureGate featureKey="dubbing" href="https://anime-forge-dummling.lovable.app/" className="group relative block w-full overflow-hidden rounded-2xl border-2 p-6 text-right transition-transform hover:scale-[1.01]" style={{ borderColor: "#22c55e", background: "linear-gradient(135deg, rgba(34,197,94,0.25), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10px] font-black" style={{ color: "#22c55e" }}>جديد</span>
            <Film className="h-10 w-10" style={{ color: "#22c55e" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#22c55e" }}>دبلجة فيديوهات</h3>
            <p className="mt-1 text-sm text-muted-foreground">دبلجة من الإنجليزية أو الصينية أو اليابانية للعربية · ادفع 25 كريدت للدخول لمدة 3 ساعات فقط</p>
          </PaidFeatureGate>

          <Link to="/anime-market" className="group relative overflow-hidden rounded-2xl border-2 p-6 transition-transform hover:scale-[1.01]" style={{ borderColor: "#ec4899", background: "linear-gradient(135deg, rgba(236,72,153,0.25), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10px] font-black" style={{ color: "#ec4899" }}>جديد</span>
            <Upload className="h-10 w-10" style={{ color: "#ec4899" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#ec4899" }}>نشر فيديوهات أنمي</h3>
            <p className="mt-1 text-sm text-muted-foreground">ارفع فيديو أنمي حتى 30 دقيقة، حدّد سعرك بالكريدت (حتى 100)، انشره وناس تشتريه — تحصل على 80% من كل بيعة</p>
          </Link>

          <Link to="/anime-market" className="group relative overflow-hidden rounded-2xl border-2 p-6 transition-transform hover:scale-[1.01]" style={{ borderColor: "#eab308", background: "linear-gradient(135deg, rgba(234,179,8,0.25), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10px] font-black" style={{ color: "#eab308" }}>جديد</span>
            <Film className="h-10 w-10" style={{ color: "#eab308" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#eab308" }}>أفلام أنمي</h3>
            <p className="mt-1 text-sm text-muted-foreground">ارفع فيلم أنمي حتى ساعتين بسعر يصل إلى 200 كريدت — عرض بجودة 480p ومشغّل احترافي مريح</p>
          </Link>

          <PaidFeatureGate featureKey="world_cup" to="/world-cup" className="group relative block w-full overflow-hidden rounded-2xl border-2 p-6 text-right transition-transform hover:scale-[1.01]" style={{ borderColor: "#10b981", background: "linear-gradient(135deg, rgba(16,185,129,0.30), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">HOT</span>
            <span className="text-4xl">⚽</span>
            <h3 className="mt-3 text-lg font-black" style={{ color: "#10b981" }}>كأس العالم</h3>
            <p className="mt-1 text-sm text-muted-foreground">ادفع 10 كريدت كل شهر للدخول واللعب · خمّن نتيجة الماتش واربح كريدت</p>
          </PaidFeatureGate>

          <Link to="/social" className="group relative overflow-hidden rounded-2xl border-2 p-6 transition-transform hover:scale-[1.01]" style={{ borderColor: "#06b6d4", background: "linear-gradient(135deg, rgba(6,182,212,0.30), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white">LIVE</span>
            <MessageCircle className="h-9 w-9" style={{ color: "#06b6d4" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#06b6d4" }}>تواصل اجتماعي</h3>
            <p className="mt-1 text-sm text-muted-foreground">دردشة مباشرة مع كل الزوار · صور · صوت · ملفات · تُحذف بعد 10 ساعات</p>
          </Link>

          {/* كرت المهمات والمكافآت */}
          <Link to="/tasks" className="group relative overflow-hidden rounded-2xl border-2 border-purple-500/80 bg-slate-900 p-5 transition-transform hover:scale-[1.01]">
            <span className="absolute right-3 top-3 rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
              اربح كريديت
            </span>
            <h3 className="mt-3 text-lg font-black" style={{ color: "#a855f7" }}>
              مركز المهمات والمكافآت 🎯
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              أكمل المهمات اليومية، شارك الموقع، واربح كريديت مجاني لحسابك فوراً
            </p>
          </Link>

          {/* رسم وأنميشن 2D */}
          <PaidFeatureGate
            featureKey="draw2d"
            href="https://speed-ink-dream.lovable.app"
            className="group relative block w-full overflow-hidden rounded-2xl border-2 border-pink-500/70 bg-gradient-to-br from-pink-500/20 to-rose-500/10 p-5 text-right transition-transform hover:scale-[1.01]"
          >
            <span className="text-3xl">🎨</span>
            <h3 className="mt-3 text-lg font-black text-pink-400">ارسم بسهولة وأنميشن 2D</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              ادفع 250 كريدت للتجربة لمدة شهر كامل · وخلفيات أنمي رهيبة
            </p>
          </PaidFeatureGate>

          {/* زر المانجا */}
          <button
            onClick={() => alert("قريباً سنطورها")}
            className="group relative block w-full overflow-hidden rounded-2xl border-2 border-amber-900/50 bg-amber-950 p-5 text-right transition-transform hover:scale-[1.01] text-white"
          >
            <span className="absolute right-3 top-3 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
              قريباً
            </span>
            <span className="text-3xl">📖</span>
            <h3 className="mt-3 text-lg font-black text-amber-100">مانجا انمي</h3>
            <p className="mt-1 text-sm text-amber-200/70">
              أداة صنع المانجا القادمة · قصص مصورة احترافية بلمستك الخاصة
            </p>
          </button>

          {/* عجلة الحظ */}
          <Link
            to="/wheel"
            className="group relative overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-gradient-to-br from-amber-400/20 to-yellow-500/10 p-5 transition-transform hover:scale-[1.01]"
          >
            <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-black">أسبوعي</span>
            <span className="text-3xl">🎡</span>
            <h3 className="mt-3 text-lg font-black text-amber-400">عجلة الحظ</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              لفّة واحدة كل أسبوع · اربح 25 / 50 / 100 كريدت أو كرت فكة بـ 5 جنيه
            </p>
          </Link>

          {/* جرافيك ديزاين */}
          <Link
            to="/graphic-design"
            className="group relative overflow-hidden rounded-2xl border-2 border-red-500/80 bg-gradient-to-br from-red-600/25 to-red-900/10 p-5 transition-transform hover:scale-[1.01]"
          >
            <span className="absolute right-3 top-3 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
              جديد
            </span>
            <span className="text-3xl">🖌️</span>
            <h3 className="mt-3 text-lg font-black text-red-500">جرافيك ديزاين</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              اكسب فلوس من جرافيك ديزاين وبيع للناس، وبيع لوحات أنمي ولوحات وكتابة لوحات وشركات ونصوص
            </p>
          </Link>

          {/* الترقية والاشتراكات + الدومينات */}
          <div className="md:col-span-2 space-y-3">
            <Link
              to="/pro-upgrade"
              className="flex items-center justify-center gap-3 w-full rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-yellow-500 p-5 text-xl font-black text-white shadow-xl hover:brightness-110 hover:scale-[1.01] transition-all duration-300 border border-yellow-400/50"
            >
              <Crown className="h-7 w-7 text-yellow-200 fill-yellow-200 animate-bounce" />
              <span>ترقية والاشتراكات 👑</span>
              <Sparkles className="h-6 w-6 text-yellow-200" />
            </Link>

            <Link
              to="/domains"
              className="flex items-center justify-center gap-3 w-full rounded-2xl border-2 border-sky-400/60 bg-gradient-to-r from-sky-600 to-indigo-600 p-4 text-lg font-black text-white shadow-lg hover:brightness-110 hover:scale-[1.01] transition-all"
            >
              🌐 <span>دومينات مستقلة — 1000 كريدت للسنة الأولى</span>
            </Link>
          </div>

          {/* المزيد — قسم قابل للطي يجمع القرآن / تقديم إدارة / تقديم مطور */}
          <div className="md:col-span-2">
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex w-full items-center justify-between rounded-2xl border-2 border-border bg-card px-5 py-4 text-base font-black transition-colors hover:border-gold"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-gold" /> المزيد من الخدمات
              </span>
              <ChevronDown className={`h-5 w-5 transition-transform ${showMore ? "rotate-180" : ""}`} />
            </button>

            {showMore && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <a
                  href="https://anime-forge-quran.lovable.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-center transition-colors hover:border-gold"
                >
                  <span className="text-3xl">📖</span>
                  <span className="font-black">قراءة القرآن الكريم</span>
                </a>

                <Link
                  to="/apply-admin"
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-center transition-colors hover:border-gold"
                >
                  <Shield className="h-7 w-7 text-gold" />
                  <span className="font-black">تقديم إدارة — 500 كريدت شهرياً</span>
                </Link>

                <Link
                  to="/apply-developer"
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-center transition-colors hover:border-gold"
                >
                  <Code2 className="h-7 w-7 text-gold" />
                  <span className="font-black">تقديم مطوّر — 25% من الأرباح</span>
                </Link>
              </div>
            )}
          </div>

          {/* دعم المنصة والتبرع */}
          <div className="text-center my-8 md:col-span-2 flex flex-col items-center gap-4">
            <a
              href="https://wa.me/?text=أرغب%20في%20دعم%20منصة%20أنمي%20فورج"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 rounded-full font-bold text-white shadow-lg transition-all"
            >
              <Heart className="w-5 h-5 fill-white animate-pulse" />
              <span>دعم المنصة والتبرع ❤️</span>
            </a>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <InstallAppButton />

          <a
            href="https://anime-forge-glb-1440p.lovable.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-2xl border-2 border-fuchsia-500/60 bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 py-4 text-base font-black text-fuchsia-300 flex items-center justify-center gap-2 hover:scale-[1.01] transition"
          >
            <Palette className="h-5 w-5" />
            صنع شخصيات وأنميشن — مجاني بالكامل
          </a>

          <a
            href="https://anime-forge-boxes-leguce.lovable.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl border-2 border-sky-500/60 bg-gradient-to-br from-sky-500/15 to-indigo-500/10 p-4 transition-transform hover:scale-[1.01]"
          >
            <div className="flex items-center gap-2 text-sky-300 font-black text-base mb-3">
              <Smartphone className="h-5 w-5" />
              نزلت لعبة انمي فورج وتحقيقات انمية وكأس العالم
            </div>
            <img
              src={gameComingSoon}
              alt="لعبة انمي فورج — تحقيقات أنمية وكأس العالم"
              className="w-full rounded-xl border border-sky-500/30"
              loading="lazy"
            />
            <p className="mt-2 text-xs text-muted-foreground">تعب لمدة شهرين</p>
          </a>
        </div>
      </section>

      {/* Quick info */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Upload, title: "ارفع مشروعك", desc: "فيديو حتى دقيقتين (مجاني) أو 30 دقيقة (Pro)" },
            { icon: DollarSign, title: "حدّد سعرك", desc: "بالجنيه + رقم فودافون كاش" },
            { icon: Play, title: "وافق على التفعيل", desc: "بعد تحويل المشتري، تفعّل الفيديو له فوراً" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <Icon className="h-7 w-7 text-gold" />
              <h3 className="mt-3 text-base font-bold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* نبذة + سياسة الاستخدام + بنود الخدمة */}
      <section className="container mx-auto px-4 pb-10">
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-lg font-black text-gradient-gold">نبذة عن انمي فورج Anime Forge</h2>
            <p className="mt-2 text-sm leading-7 text-foreground/85">
              انمي فورج (Anime Forge) منصة عربية متخصصة في مشاهدة انمي مترجم اونلاين وإنتاج وتوليد حلقات أنمي أصلية بالكامل
              بالذكاء الاصطناعي، بدءاً من الفكرة والتحريك وحتى الإخراج النهائي. نهدف لتقديم تجربة بصرية سينمائية فريدة
              لعشاق الأنمي بجودة عالية تصل إلى 4K Ultra HD، مع دبلجة عربية وشورتس أنمي وأفلام أنمي حصرية.
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-lg font-black text-gradient-gold">سياسة الاستخدام</h2>
            <ul className="mt-2 space-y-2 text-sm leading-7 text-foreground/85">
              <li><b>الملكية الفكرية:</b> جميع حلقات الأنمي والتصاميم والمحتوى المولد داخل المنصة إنتاج حصري ومملوك للموقع، وتُتاح للمشاهدة والاستخدام الشخصي فقط.</li>
              <li><b>جودة العرض:</b> نضمن توفير المحتوى بأعلى دقة ممكنة (4K)، مع الاعتماد على اتصال المستخدم بالإنترنت لضمان سلاسة البث.</li>
              <li><b>الاستخدام المقبول:</b> يُمنع منعاً باتاً تنزيل أو إعادة رفع أو استخدام أي جزء من الحلقات لأغراض تجارية أو إعادة توزيعها دون إذن كتابي مسبق.</li>
              <li><b>حدود المسؤولية:</b> المحتوى المعروض مخصص لأغراض الترفيه والاستعراض الفني، والموقع غير مسؤول عن أي استخدام غير مصرح به للمحتوى خارج المنصة الرسمية.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-lg font-black text-gradient-gold">بنود الخدمة</h2>
            <ul className="mt-2 space-y-2 text-sm leading-7 text-foreground/85">
              <li><b>قبول الشروط:</b> باستخدامك لموقعنا أو الوصول إلى محتوانا، فإنك تقر بموافقتك على كافة الشروط والبنود الواردة هنا.</li>
              <li><b>حساب المستخدم:</b> في حال توفر ميزة إنشاء حساب، يقع على عاتق المستخدم مسؤولية الحفاظ على سرية بيانات دخوله، ولا نتحمل أي مسؤولية عن أي نشاط يتم عبر حسابه.</li>
              <li><b>تعديل الخدمات والشروط:</b> نحتفظ بالحق الكامل في تعديل أو تعليق أو إيقاف أي جزء من الخدمة أو تحديث هذه البنود في أي وقت دون إشعار مسبق.</li>
              <li><b>إنهاء الخدمة:</b> يحق لإدارة الموقع إيقاف أو حظر وصول أي مستخدم ينتهك سياسات الاستخدام أو يمارس سلوكاً يضر بالمنصة أو حقوقها.</li>
            </ul>
          </article>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Link to="/legal" hash="policy" className="rounded-full border border-border px-3 py-1 text-[11px] font-bold hover:text-foreground">
            سياسة الاستخدام
          </Link>
          <Link to="/legal" hash="terms" className="rounded-full border border-border px-3 py-1 text-[11px] font-bold hover:text-foreground">
            بنود الخدمة
          </Link>
        </div>
        © {new Date().getFullYear()} منصة انمي فورج — جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
