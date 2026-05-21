import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Crown, Sparkles, Video, Music, Shield, Play, Heart, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-md bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-gold" />
            <span className="text-xl font-black text-gradient-gold">شاهد أنمي الآن</span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Link
                to="/dashboard"
                className="rounded-lg bg-gradient-gold px-4 py-2 text-sm font-bold text-gold-foreground shadow-gold"
              >
                لوحة التحكم
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-gradient-gold px-4 py-2 text-sm font-bold text-gold-foreground shadow-gold transition-transform hover:scale-105"
              >
                تسجيل الدخول
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-bold text-gold">
            <Sparkles className="h-3.5 w-3.5" /> الجيل الجديد من توليد الأنمي
          </span>
          <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
            ولّد فيديوهات <span className="text-gradient-gold">أنمي خيالية</span>
            <br /> بالذكاء الاصطناعي
          </h1>
          <p className="mt-6 text-base text-muted-foreground md:text-lg">
            ارفع صورة البداية والنهاية، أضف صوتك، واختر الجودة. نحن نتولى الباقي.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to={user ? "/dashboard" : "/login"}
              className="rounded-xl bg-gradient-gold px-7 py-3 text-base font-bold text-gold-foreground shadow-gold transition-transform hover:scale-105"
            >
              ابدأ الآن مجاناً
            </Link>
            <a
              href="#pricing"
              className="rounded-xl border border-border bg-card px-7 py-3 text-base font-bold text-foreground"
            >
              عرض الباقات
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Video, title: "توليد فيديو ذكي", desc: "صورة بداية + صورة نهاية = فيديو سلس" },
            { icon: Music, title: "صوت متعدد المسارات", desc: "أضف حتى 3 ملفات صوتية لكل فيديو" },
            { icon: Shield, title: "حماية وخصوصية", desc: "بياناتك محفوظة بأعلى معايير الأمان" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <Icon className="h-8 w-8 text-gold" />
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Shorts section — directly under AI section */}
      <section id="shorts" className="container mx-auto px-4 py-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-bold text-gold">
            <Play className="h-3.5 w-3.5" /> جديد
          </span>
          <h2 className="mt-4 text-3xl font-black md:text-4xl">شورتس الأنمي <span className="text-gradient-gold">9:16</span></h2>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            ارفع شورت أنمي (15 ثانية، 480p) — يظهر للجميع بعد ساعة من النشر
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
          {[
            { icon: Play, t: "نسبة 9:16", d: "عرض عمودي مثل تيك توك ويوتيوب شورتس" },
            { icon: Heart, t: "تفاعل كامل", d: "إعجاب، تعليقات، ومشاركة بضغطة" },
            { icon: MessageCircle, t: "خوارزمية ذكية", d: "اختبار لأول 50 مشاهد ثم انتشار للجميع" },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <Icon className="h-7 w-7 text-gold" />
              <h3 className="mt-3 text-base font-bold">{t}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/shorts" className="rounded-xl bg-gradient-gold px-7 py-3 text-base font-black text-gold-foreground shadow-gold transition-transform hover:scale-105">
            تصفّح الشورتس
          </Link>
          <Link to={user ? "/shorts/upload" : "/login"} className="rounded-xl border border-gold/50 bg-gold/10 px-7 py-3 text-base font-bold text-gold">
            ارفع شورت (5 كريديت)
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-20">
        <h2 className="text-center text-3xl font-black md:text-4xl">اختر باقتك</h2>
        <p className="mt-2 text-center text-muted-foreground">ابدأ مجاناً أو ارتقِ إلى الـ PRO الذهبية</p>

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
            <h3 className="text-2xl font-black">مجاني</h3>
            <p className="mt-1 text-sm text-muted-foreground">للبدء واستكشاف المنصة</p>
            <div className="mt-4 text-4xl font-black">
              0 <span className="text-base font-normal text-muted-foreground">جنيه</span>
            </div>
            <ul className="mt-6 space-y-2 text-sm">
              <li>✦ 25 كريديت مجاني عند التسجيل</li>
              <li>✦ توليد فيديوهات بدقة 480p</li>
              <li>✦ حد النص الأقصى: 2,000 كلمة</li>
              <li>✦ معالجة عادية في الطابور</li>
            </ul>
          </div>

          {/* PRO - Golden */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-gold bg-card p-8 shadow-gold ring-gold">
            <div className="absolute -left-12 top-6 rotate-[-45deg] bg-gradient-gold px-12 py-1 text-xs font-black text-gold-foreground">
              الأكثر طلباً
            </div>
            <div className="flex items-center gap-2">
              <Crown className="h-6 w-6 text-gold" />
              <h3 className="text-2xl font-black text-gradient-gold">PRO الذهبية</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">للمبدعين والمحترفين</p>
            <div className="mt-4 text-4xl font-black text-gradient-gold">
              50 <span className="text-base font-normal text-muted-foreground">جنيه مصري</span>
            </div>
            <ul className="mt-6 space-y-2 text-sm">
              <li className="text-gold font-bold">
                ✦ تخفيضات خاصة وحصرية لأعضاء الـ PRO على المدة واستهلاك الكريديت للصوت والفيديو!
              </li>
              <li>✦ جودة فيديو حتى 1080p</li>
              <li>✦ حد النص: 5,000 كلمة</li>
              <li>✦ أولوية في طابور المعالجة</li>
              <li>✦ ميزة إزالة العلامة المائية</li>
              <li>✦ ميزة استنساخ صوت غوكو</li>
            </ul>
            <Link
              to={user ? "/dashboard" : "/login"}
              className="mt-6 block rounded-xl bg-gradient-gold py-3 text-center text-base font-black text-gold-foreground shadow-gold transition-transform hover:scale-[1.02]"
            >
              {user ? "الترقية الآن" : "سجّل وابدأ"}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} شاهد أنمي الآن - جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
