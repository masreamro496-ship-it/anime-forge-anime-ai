import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Play, Music, Wand2, User, DollarSign, Upload, Rocket, Film, MessageCircle, Palette, Smartphone, Heart, Crown, AlertTriangle } from "lucide-react";
import { InstallAppButton } from "@/components/InstallAppButton";
import { GlobalLanguageSelector } from "@/components/LanguageSwitcher";
import gameComingSoon from "@/assets/world-cup-game.jpg";
import { PaidFeatureGate } from "@/components/PaidFeatureGate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "انمي فورج | Anime Forge — صيانة شاملة للموقع" },
      {
        name: "description",
        content: "انمي فورج تحت الصيانة المؤقتة لإصلاح وتحديث قاعدة البيانات.",
      },
    ],
    links: [{ rel: "canonical", href: "https://anime-forge-anime-ai.lovable.app/" }],
  }),
  component: Landing,
});

function Landing() {
  const { user } = useAuth();

  // عداد تنازلي لصيانة الموقع (مثلاً لمدة أسبوعين أو شهر كحد أقصى)
  const [timeLeft, setTimeLeft] = useState({ days: 14, hours: 23, minutes: 59, seconds: 59 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev;
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else if (days > 0) {
          days--;
          hours = 23;
          minutes = 59;
          seconds = 59;
        }
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // دالة منع الشراء وإظهار رسالة الصيانة
  const handleMaintenanceAlert = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("عذراً صديقي، عمليات الشراء والترقيات معطلة مؤقتاً بسبب وجود أخطاء كثيرة في قاعدة البيانات نقوم بإصلاحها حالياً وتحديث الموقع بـأحدث قوي. ستتصلح المنصة خلال أسبوع إلى شهر كحد أقصى!");
  };

  return (
    <div className="min-h-screen">
      
      {/* 🚀 شريط الصيانة وتحديث قاعدة البيانات (موضع في أعلى قمة الصفحة تماماً) 🚀 */}
      <div className="bg-gradient-to-r from-red-700 via-rose-600 to-red-800 text-white px-4 py-4 border-b-4 border-yellow-400 shadow-2xl relative z-50">
        <div className="container mx-auto flex flex-col items-center text-center gap-2">
          <div className="flex items-center gap-2 font-black text-lg md:text-xl text-yellow-300 animate-pulse">
            <AlertTriangle className="h-7 w-7 text-yellow-300 shrink-0" />
            <span>تنبيه هام جداً: نقوم بتحديث الموقع بأحدث قوية جداً وإصلاح أخطاء في قاعدة البيانات!</span>
          </div>
          <p className="text-xs md:text-sm font-bold text-white/90">
            يتم الآن معالجة كافة المشاكل التقنية ومنع عمليات الشراء مؤقتاً لحين استقرار النظام بالكامل. ستتصلح المنصة خلال مدة من <span className="text-yellow-300 underline">أسبوع إلى شهر كحد أقصى</span>.
          </p>
          {/* العداد التنازلي للصيانة */}
          <div className="mt-1 flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-yellow-400/40 font-mono text-lg font-black text-yellow-400 shadow-inner">
            <span>⏱️ انتهاء الصيانة خلال:</span>
            <span>{timeLeft.days} يوم</span> : <span>{timeLeft.hours} ساعة</span> : <span>{timeLeft.minutes} دقيقة</span> : <span>{timeLeft.seconds} ثانية</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/60 backdrop-blur-md">
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
                <button onClick={handleMaintenanceAlert} className="rounded-lg bg-gradient-gold px-3 py-2 text-xs font-black text-gold-foreground shadow-gold">
                  لوحتي (تحت الصيانة)
                </button>
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
        <div onClick={handleMaintenanceAlert} className="cursor-pointer block rounded-3xl border-2 border-gold bg-gradient-to-br from-gold/30 via-gold/10 to-transparent p-6 shadow-gold transition-transform hover:scale-[1.01] sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black text-white">
                <Sparkles className="h-3 w-3" /> معطل مؤقتاً للصيانة
              </span>
              <h2 className="mt-2 text-2xl font-black text-gradient-gold sm:text-3xl">نشر فيديوهات شورتس القوية</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">30 ثانية كحد أقصى · تظهر لكل زوار الموقع · بدون كريديت</p>
            </div>
            <Upload className="h-12 w-12 shrink-0 text-gold sm:h-16 sm:w-16" />
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-black leading-tight md:text-5xl">
          المنصة تحت الإصلاح الشامل لقاعدة البيانات <span className="text-gradient-gold">بفودافون كاش</span>
        </h1>
        <p className="mt-4 text-sm text-muted-foreground md:text-base">
          نعمل حالياً على تحديث السيرفرات وإصلاح أخطاء الداتا بيز. عمليات الشراء متوقفة مؤقتاً لسلامة رصيدكم.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={handleMaintenanceAlert} className="rounded-xl bg-red-600/80 px-6 py-3 text-sm font-black text-white shadow-lg">
            <DollarSign className="inline h-4 w-4" /> تصفّح المشاريع (تحت الصيانة)
          </button>
          {user ? (
            <button onClick={handleMaintenanceAlert} className="rounded-xl border-2 border-red-500 bg-red-500/10 px-6 py-3 text-sm font-black text-red-400">
              إنشاء مشروع جديد (معطل)
            </button>
          ) : (
            <Link to="/login" search={{ redirect: "/shorts/upload" }} className="rounded-xl border-2 border-gold bg-gold/10 px-6 py-3 text-sm font-black text-gold">
              سجّل للدخول
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

          <div onClick={handleMaintenanceAlert} className="cursor-pointer group relative block w-full overflow-hidden rounded-2xl border-2 p-6 text-right transition-transform hover:scale-[1.01]" style={{ borderColor: "#3b82f6", background: "linear-gradient(135deg, rgba(59,130,246,0.25), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">صيانة</span>
            <Rocket className="h-10 w-10" style={{ color: "#3b82f6" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#3b82f6" }}>شات برمجي</h3>
            <p className="mt-1 text-sm text-muted-foreground">ادفع 25 كريدت للدخول والتجربة لمدة ساعتين فقط (معطل حالياً)</p>
          </div>

          <div onClick={handleMaintenanceAlert} className="cursor-pointer group relative block w-full overflow-hidden rounded-2xl border-2 p-6 text-right transition-transform hover:scale-[1.01]" style={{ borderColor: "#a855f7", background: "linear-gradient(135deg, rgba(168,85,247,0.25), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">صيانة</span>
            <Sparkles className="h-10 w-10" style={{ color: "#a855f7" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#a855f7" }}>إنشاء مفاتيح</h3>
            <p className="mt-1 text-sm text-muted-foreground">ادفع 5 كريدت كل يوم لتجربته (معطل لحين إصلاح الداتا)</p>
          </div>

          <div onClick={handleMaintenanceAlert} className="cursor-pointer group relative block w-full overflow-hidden rounded-2xl border-2 p-6 text-right transition-transform hover:scale-[1.01]" style={{ borderColor: "#f97316", background: "linear-gradient(135deg, rgba(249,115,22,0.25), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">صيانة</span>
            <Wand2 className="h-10 w-10" style={{ color: "#f97316" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#f97316" }}>توليد جودة أنمي صورية خيالية 4K</h3>
            <p className="mt-1 text-sm text-muted-foreground">ادفع 50 كريدت كل 5 ساعات (متوقف للصيانة)</p>
          </div>

          <div onClick={handleMaintenanceAlert} className="cursor-pointer group relative block w-full overflow-hidden rounded-2xl border-2 p-6 text-right transition-transform hover:scale-[1.01]" style={{ borderColor: "#22c55e", background: "linear-gradient(135deg, rgba(34,197,94,0.25), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">صيانة</span>
            <Film className="h-10 w-10" style={{ color: "#22c55e" }} />
            <h3 className="mt-3 text-lg font-black" style={{ color: "#22c55e" }}>دبلجة فيديوهات</h3>
            <p className="mt-1 text-sm text-muted-foreground">دبلجة من الإنجليزية والصينية واليابانية (تحت الصيانة القوية)</p>
          </div>


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

          <div onClick={handleMaintenanceAlert} className="cursor-pointer group relative block w-full overflow-hidden rounded-2xl border-2 p-6 text-right transition-transform hover:scale-[1.01]" style={{ borderColor: "#10b981", background: "linear-gradient(135deg, rgba(16,185,129,0.30), transparent)" }}>
            <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">صيانة</span>
            <span className="text-4xl">⚽</span>
            <h3 className="mt-3 text-lg font-black" style={{ color: "#10b981" }}>كأس العالم</h3>
            <p className="mt-1 text-sm text-muted-foreground">ادفع 10 كريدت كل شهر للدخول واللعب (متوقف لحين إصلاح الداتا)</p>
          </div>


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
          <div onClick={handleMaintenanceAlert} className="cursor-pointer group relative block w-full overflow-hidden rounded-2xl border-2 border-pink-500/70 bg-gradient-to-br from-pink-500/20 to-rose-500/10 p-5 text-right transition-transform hover:scale-[1.01]">
            <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">صيانة</span>
            <span className="text-3xl">🎨</span>
            <h3 className="mt-3 text-lg font-black text-pink-400">ارسم بسهولة وأنميشن 2D</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              ادفع 250 كريدت للتجربة لمدة شهر كامل (معطل مؤقتاً للصيانة)
            </p>
          </div>

          {/* زر المانجا الجديد */}
          <button
            onClick={() => alert("قريباً سنطورها فور الانتهاء من صيانة قاعدة البيانات")}
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

          {/* 🔥 زر الترقية والاشتراكات الجديد باللونين الأحمر والذهبي (معطل مؤقتاً للصيانة) 🔥 */}
          <div className="md:col-span-2 space-y-3">
            <button
              onClick={handleMaintenanceAlert}
              className="flex items-center justify-center gap-3 w-full rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-yellow-500 p-5 text-xl font-black text-white shadow-xl hover:brightness-110 hover:scale-[1.01] transition-all duration-300 border border-yellow-400/50 cursor-pointer"
            >
              <Crown className="h-7 w-7 text-yellow-200 fill-yellow-200 animate-bounce" />
              <span>ترقية والاشتراكات 👑 (تحت الصيانة وإصلاح الداتا)</span>
              <Sparkles className="h-6 w-6 text-yellow-200" />
            </button>

            <button
              onClick={handleMaintenanceAlert}
              className="flex items-center justify-center gap-3 w-full rounded-2xl border-2 border-sky-400/60 bg-gradient-to-r from-sky-600 to-indigo-600 p-4 text-lg font-black text-white shadow-lg hover:brightness-110 hover:scale-[1.01] transition-all cursor-pointer"
            >
              🌐 <span>دومينات مستقلة — 1000 كريدت للسنة الأولى (معطل مؤقتاً)</span>
            </button>
          </div>


          {/* أزرار التبرع ودعم المنصة */}
          <div className="text-center my-8 md:col-span-2 flex flex-col items-center gap-4">
            <a 
              href="https://wa.me/?text=أرغب%20في%20دعم%20منصة%20أنمي%20فورج%20أثناء%20الصيانة" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 rounded-full font-bold text-white shadow-lg transition-all"
            >
              <Heart className="w-5 h-5 fill-white animate-pulse" />
              <span>دعم المنصة والتبرع أثناء الصيانة ❤️</span>
            </a>

            {/* زر قراءة القرآن الكريم */}
            <a
              href="https://anime-forge-quran.lovable.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full max-w-sm py-3.5 px-6 rounded-2xl font-black text-white bg-gradient-to-r from-yellow-500 via-purple-500 to-amber-400 hover:opacity-90 hover:scale-[1.02] transition-all duration-300 text-center shadow-lg border border-yellow-400/50 text-lg"
            >
              📖 قراءة القران الكريم
            </a>

            {/* تقديم إدارة */}
            <Link
              to="/apply-admin"
              className="w-full max-w-sm py-3.5 px-6 rounded-2xl font-black text-black bg-gradient-to-r from-yellow-400 to-amber-500 hover:opacity-90 hover:scale-[1.02] transition-all duration-300 text-center shadow-lg border border-yellow-300/60 text-lg"
            >
              🛡️ تقديم إدارة — 500 كريدت شهرياً
            </Link>

            {/* تقديم مطوّر */}
            <Link
              to="/apply-developer"
              className="w-full max-w-sm py-3.5 px-6 rounded-2xl font-black text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-90 hover:scale-[1.02] transition-all duration-300 text-center shadow-lg border border-sky-400/50 text-lg"
            >
              💻 تقديم مطوّر — نسبة 25% من الأرباح
            </Link>
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
            <h2 className="text-lg font-black text-gradient-gold">نبذة عن الموقع</h2>
            <p className="mt-2 text-sm leading-7 text-foreground/85">
              منصة متخصصة في إنتاج وتوليد حلقات أنمي أصلية بالكامل بجهودنا الخاصة، بدءاً من الفكرة والتحريك وحتى الإخراج
              النهائي. نهدف لتقديم تجربة بصرية سينمائية فريدة للمشاهدين بجودة عالية تصل إلى 4K Ultra HD.
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
        © {new Date().getFullYear()} منصة انمي فورج — جاري إصلاح وتحديث قاعدة البيانات (صيانة عامة)
      </footer>

    </div>
  );
}


