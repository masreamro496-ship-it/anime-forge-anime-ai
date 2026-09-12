import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Phone, Mail, Lock, User, Globe } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s.redirect === "string" ? { redirect: s.redirect } : {},
  component: LoginPage,
});

// قائمة الدول الأكثر استخداماً مع أكواد الاتصال الدولية
// أضف/احذف أي دولة حسب احتياجك
const COUNTRIES: { name: string; code: string; flag: string }[] = [
  { name: "مصر", code: "+20", flag: "🇪🇬" },
  { name: "السعودية", code: "+966", flag: "🇸🇦" },
  { name: "الإمارات", code: "+971", flag: "🇦🇪" },
  { name: "الكويت", code: "+965", flag: "🇰🇼" },
  { name: "قطر", code: "+974", flag: "🇶🇦" },
  { name: "البحرين", code: "+973", flag: "🇧🇭" },
  { name: "عُمان", code: "+968", flag: "🇴🇲" },
  { name: "الأردن", code: "+962", flag: "🇯🇴" },
  { name: "العراق", code: "+964", flag: "🇮🇶" },
  { name: "لبنان", code: "+961", flag: "🇱🇧" },
  { name: "سوريا", code: "+963", flag: "🇸🇾" },
  { name: "فلسطين", code: "+970", flag: "🇵🇸" },
  { name: "ليبيا", code: "+218", flag: "🇱🇾" },
  { name: "تونس", code: "+216", flag: "🇹🇳" },
  { name: "الجزائر", code: "+213", flag: "🇩🇿" },
  { name: "المغرب", code: "+212", flag: "🇲🇦" },
  { name: "السودان", code: "+249", flag: "🇸🇩" },
  { name: "اليمن", code: "+967", flag: "🇾🇪" },
  { name: "تركيا", code: "+90", flag: "🇹🇷" },
  { name: "أمريكا وكندا", code: "+1", flag: "🇺🇸" },
  { name: "المملكة المتحدة", code: "+44", flag: "🇬🇧" },
];

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();

  // نمط التسجيل: إما عبر البريد الإلكتروني أو رقم الهاتف
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // بيانات البريد الإلكتروني
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // بيانات رقم الهاتف (دخول مباشر بدون رمز تحقق SMS)
  const [countryCode, setCountryCode] = useState(COUNTRIES[0].code);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [phoneName, setPhoneName] = useState("");

  const [loading, setLoading] = useState(false);

  // دالة بناء رابط التوجيه بدقة استناداً إلى النطاق الحالي لموقعك
  const getRedirectUrl = () => {
    const targetPath = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";
    return `${window.location.origin}${targetPath}`;
  };

  useEffect(() => {
    if (user) {
      // navigate بدون type-cast خطر؛ التحقق من المسار تم بالفعل في validateSearch
      navigate({ to: redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard" });
    }
  }, [user, navigate, redirectTo]);

  // تحقق فعلي من cooldown لتسجيل الدخول (بريد/Google/GitHub/هاتف)
  // ملاحظة: هنا فقط حماية بسيطة على مستوى الواجهة لمنع الضغط المتكرر، وليست بديلاً عن rate limiting من طرف السيرفر
  const loginAttemptRef = useRef<number>(0);
  function checkLoginCooldown(): string | null {
    const now = Date.now();
    if (now - loginAttemptRef.current < 1500) {
      return "برجاء الانتظار قليلاً قبل المحاولة مرة أخرى";
    }
    loginAttemptRef.current = now;
    return null;
  }

  // 1. تسجيل الدخول / الإنشاء بالبريد الإلكتروني
  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cd = checkLoginCooldown();
    if (cd) {
      toast.error(cd);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getRedirectUrl(),
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب! تحقق من بريدك الإلكتروني لتأكيده.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("تم تسجيل الدخول بنجاح");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      toast.error(
        msg.includes("Invalid login credentials")
          ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  // 2. تسجيل الدخول بواسطة Google
  const handleGoogle = async () => {
    const cd = checkLoginCooldown();
    if (cd) {
      toast.error(cd);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectUrl(),
      },
    });
    if (error) {
      toast.error("فشل تسجيل الدخول بـ Google: " + error.message);
      setLoading(false);
    }
  };

  // 3. تسجيل الدخول بواسطة GitHub
  const handleGithub = async () => {
    const cd = checkLoginCooldown();
    if (cd) {
      toast.error(cd);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: getRedirectUrl(),
      },
    });
    if (error) {
      toast.error("فشل تسجيل الدخول بـ GitHub: " + error.message);
      setLoading(false);
    }
  };

  // 4. دخول مباشر برقم الهاتف — بدون إرسال أو انتظار رمز SMS
  // المستخدم يختار الدولة + يكتب رقمه واسمه ويدخل فوراً
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cd = checkLoginCooldown();
    if (cd) {
      toast.error(cd);
      return;
    }

    const localDigits = phoneLocal.trim().replace(/^0+/, ""); // إزالة الصفر الأول لو موجود
    if (!localDigits || !/^\d{6,12}$/.test(localDigits)) {
      toast.error("يرجى إدخال رقم هاتف صحيح");
      return;
    }

    if (!phoneName.trim()) {
      toast.error("يرجى إدخال الاسم بالكامل");
      return;
    }

    const fullPhone = `${countryCode}${localDigits}`;

    setLoading(true);
    try {
      // دخول مباشر بدون رمز تحقق: ننشئ جلسة مجهولة (Anonymous) ونربطها برقم الهاتف والاسم
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;

      if (data.user) {
        await supabase.auth.updateUser({
          data: {
            full_name: phoneName.trim(),
            phone_number: fullPhone,
            country_code: countryCode,
          },
        });
      }

      toast.success("تم تسجيل الدخول بنجاح!");
      navigate({ to: redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء تسجيل الدخول";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 bg-background" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">

        {/* العناوين والشعار */}
        <Link to="/" className="flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-gold" />
          <span className="text-xl font-black text-gradient-gold">شاهد أنمي الآن</span>
        </Link>

        <h1 className="mt-6 text-center text-2xl font-black">
          {authMethod === "phone"
            ? "تسجيل الدخول برقم الهاتف"
            : mode === "signin"
            ? "تسجيل الدخول"
            : "إنشاء حساب جديد"}
        </h1>

        {/* أزرار التواصل الاجتماعي */}
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 font-bold transition-colors hover:bg-accent disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            المتابعة باستخدام Google
          </button>

          <button
            type="button"
            onClick={handleGithub}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-3 font-bold transition-colors hover:bg-accent disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.69-3.88-1.54-3.88-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.24 2.75.12 3.04.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56C20.22 21.38 23.5 17.08 23.5 12 23.5 5.73 18.27.5 12 .5z" />
            </svg>
            المتابعة باستخدام GitHub
          </button>
        </div>

        {/* فاصل */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">أو</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* تبديل بين البريد ورقم الهاتف */}
        <div className="mb-4 flex gap-2 rounded-xl border border-border p-1 bg-muted/40">
          <button
            type="button"
            onClick={() => setAuthMethod("email")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              authMethod === "email"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="h-4 w-4" />
            بالبريد الإلكتروني
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod("phone");
              setPassword("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              authMethod === "phone"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Phone className="h-4 w-4" />
            برقم الهاتف
          </button>
        </div>

        {/* نموذج البريد الإلكتروني */}
        {authMethod === "email" && (
          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="الاسم بالكامل"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background pr-10 pl-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/50"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-input bg-background pr-10 pl-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>

            <div className="relative">
              <Lock className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                placeholder="كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-input bg-background pr-10 pl-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-gold py-3 text-base font-black text-gold-foreground shadow-gold disabled:opacity-60"
            >
              {loading ? "جاري المعالجة..." : mode === "signin" ? "تسجيل الدخول" : "إنشاء الحساب"}
            </button>
          </form>
        )}

        {/* نموذج رقم الهاتف — دخول مباشر بدون رمز SMS */}
        {authMethod === "phone" && (
          <form onSubmit={handlePhoneLogin} className="space-y-3">
            {/* اختيار الدولة */}
            <div className="relative">
              <Globe className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                required
                className="w-full appearance-none rounded-xl border border-input bg-background pr-10 pl-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/50"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code + c.name} value={c.code}>
                    {c.flag} {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* رقم الهاتف */}
            <div className="relative">
              <Phone className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <input
                type="tel"
                placeholder="رقم الهاتف بدون كود الدولة (مثال: 1000000000)"
                value={phoneLocal}
                onChange={(e) => setPhoneLocal(e.target.value.replace(/[^\d]/g, ""))}
                required
                inputMode="numeric"
                className="w-full rounded-xl border border-input bg-background pr-10 pl-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/50 text-right"
              />
            </div>

            {/* الاسم بالكامل */}
            <div className="relative">
              <User className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="الاسم بالكامل"
                value={phoneName}
                onChange={(e) => setPhoneName(e.target.value)}
                required
                className="w-full rounded-xl border border-input bg-background pr-10 pl-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-gold py-3 text-base font-black text-gold-foreground shadow-gold disabled:opacity-60"
            >
              {loading ? "جاري تسجيل الدخول..." : "دخول مباشر"}
            </button>
          </form>
        )}

        {/* التبديل بين إنشاء الحساب وتسجيل الدخول */}
        {authMethod === "email" && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-bold text-gold hover:underline"
            >
              {mode === "signin" ? "أنشئ حساباً" : "سجّل الدخول"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

