import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Play, Music, Wand2, User, DollarSign, Upload, Rocket, Film, MessageCircle, Palette, Smartphone, Heart } from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";
import gameComingSoon from "@/assets/game-coming-soon.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-gold" />
            <span className="text-xl font-black text-gradient-gold">انمي فورج</span>
          </Link>
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

      {/* Hero */}
      <section className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-black leading-tight md:text-5xl">
          بيع مشاريعك مباشرة بـ <span className="text-gradient-gold">فودافون كاش</span>
        </h1>
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

      {/* Audio + Watermark cards */}
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

          <a href="https://anime-forge-ai-coder.lovable.app/login" target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden rounded-2xl border-2 p-6 transition-transform hover:scale-[1.01]" style={{ borderColor: "#3b82f6", background: "linear-gradient(135deg, rgba(59,130,246,0.25), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">New</span>
            <Rocket className="h-10 w-10" style={{ color: "#3b82f6" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#3b82f6" }}>شات برمجي</h3>
            <p className="mt-1 text-sm text-muted-foreground">منصّة برمجة كاملة · افتح المحرّر في تبويب جديد</p>
          </a>

          <a href="https://anime-key-forge.lovable.app/" target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden rounded-2xl border-2 p-6 transition-transform hover:scale-[1.01]" style={{ borderColor: "#a855f7", background: "linear-gradient(135deg, rgba(168,85,247,0.25), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10px] font-black" style={{ color: "#a855f7" }}>جديد</span>
            <Sparkles className="h-10 w-10" style={{ color: "#a855f7" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#a855f7" }}>إنشاء مفتاح</h3>
            <p className="mt-1 text-sm text-muted-foreground">منصّة Anime Key Forge لتوليد المفاتيح</p>
          </a>

          <a href="https://anime-forge-4k-art.lovable.app/" target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden rounded-2xl border-2 p-6 transition-transform hover:scale-[1.01]" style={{ borderColor: "#f97316", background: "linear-gradient(135deg, rgba(249,115,22,0.25), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10px] font-black" style={{ color: "#f97316" }}>جديد</span>
            <Wand2 className="h-10 w-10" style={{ color: "#f97316" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#f97316" }}>توليد جودة أنمي صورية خيالية</h3>
            <p className="mt-1 text-sm text-muted-foreground">صور أنمي بجودة 4K · افتح المولّد في تبويب جديد</p>
          </a>

          <a href="https://anime-forge-dummling.lovable.app/" target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden rounded-2xl border-2 p-6 transition-transform hover:scale-[1.01]" style={{ borderColor: "#22c55e", background: "linear-gradient(135deg, rgba(34,197,94,0.25), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-0.5 text-[10px] font-black" style={{ color: "#22c55e" }}>جديد</span>
            <Film className="h-10 w-10" style={{ color: "#22c55e" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#22c55e" }}>دبلجة فيديوهات</h3>
            <p className="mt-1 text-sm text-muted-foreground">دبلجة فيديو من لغة انجليزية للغة العربية أو دبلجة من لغة صينية أو يبانية للعربية</p>
          </a>

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

          <Link to="/world-cup" className="group relative overflow-hidden rounded-2xl border-2 p-6 transition-transform hover:scale-[1.01]" style={{ borderColor: "#10b981", background: "linear-gradient(135deg, rgba(16,185,129,0.30), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">HOT</span>
            <span className="text-4xl">⚽</span>
            <h3 className="mt-3 text-lg font-black" style={{ color: "#10b981" }}>كأس العالم</h3>
            <p className="mt-1 text-sm text-muted-foreground">خمّن نتيجة الماتش واربح كريدت · العب ماتشات مباشرة ضد لاعبين آخرين</p>
          </Link>

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

          {/* زر التبرع والدعم المباشر */}
          <div className="text-center my-8">
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

          <div className="rounded-2xl border-2 border-sky-500/60 bg-gradient-to-br from-sky-500/15 to-indigo-500/10 p-4">
            <div className="flex items-center gap-2 text-sky-300 font-black text-base mb-3">
              <Smartphone className="h-5 w-5" />
              اللعبة ستنزل على تلفونك قريباً
            </div>
            <img
              src={gameComingSoon}
              alt="معاينة محرّر اللعبة — قطع وتصميمات"
              className="w-full rounded-xl border border-sky-500/30"
              loading="lazy"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              محرّر ثلاثي الأبعاد كامل · قطع وتصميمات جاهزة · نسخة تلفون قريباً
            </p>
          </div>
        </div>
      </section>

      {/* Quick info */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Upload, title: "ارفع مشروعك", desc: "فيديو حتى دقيقتين (مجاني) أو 30 دقيقة (Pro)" },
            { icon: DollarSign, title: "حدّد سعرك", desc: "بالدولار + رقم فودافون كاش" },
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

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} منصة فودافون كاش — جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
