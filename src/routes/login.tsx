import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Phone, Mail, Lock, User, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s.redirect === "string" ? { redirect: s.redirect } : {},
  component: LoginPage,
});

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

  // بيانات رقم الهاتف
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<"send" | "verify">("send");

  const [loading, setLoading] = useState(false);

  // دالة بناء رابط التوجيه بدقة استناداً إلى النطاق الحالي لموقعك
  const getRedirectUrl = () => {
    const targetPath = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";
    return `${window.location.origin}${targetPath}`;
  };

  useEffect(() => {
    if (user) {
      navigate({ to: (redirectTo ?? "/dashboard") as "/dashboard" });
    }
  }, [user, navigate, redirectTo]);

  function checkLoginCooldown(): string | null {
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

  // 4. إرسال رمز التحقق (OTP) للهاتف
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("يرجى إدخال رقم الهاتف مع كود الدولة (مثال: +201000000000)");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.trim(),
      });
      if (error) throw error;
      toast.success("تم إرسال رمز التحقق إلى هاتفك!");
      setPhoneStep("verify");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء إرسال الرمز";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 5. تأكيد رمز التحقق (OTP) وحفظ الاسم
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast.error("يرجى إدخال رمز التحقق المكون من الأرقام");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: otp.trim(),
        type: "sms",
      });
      if (error) throw error;

      // تحديث اسم المستخدم إذا تم كتابته
      if (name.trim() && data.user) {
        await supabase.auth.updateUser({
          data: { full_name: name.trim() },
        });
      }

      toast.success("تم تسجيل الدخول بنجاح!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "رمز التحقق غير صحيح";
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
            onClick={() => {
              setAuthMethod("email");
              setPhoneStep("send");
            }}
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
            onClick={() => setAuthMethod("phone")}
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

        {/* نموذج رقم الهاتف */}
        {authMethod === "phone" && (
          <>
            {phoneStep === "send" ? (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div className="relative">
                  <Phone className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="tel"
                    placeholder="رقم الهاتف (مثال: +201000000000)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full rounded-xl border border-input bg-background pr-10 pl-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/50 text-right"
                  />
                </div>

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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-gold py-3 text-base font-black text-gold-foreground shadow-gold disabled:opacity-60"
                >
                  {loading ? "جاري إرسال الرمز..." : "إرسال رمز التحقق (SMS)"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div className="relative">
                  <Lock className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="أدخل رمز التحقق (OTP)"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    className="w-full rounded-xl border border-input bg-background pr-10 pl-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gold/50 text-center text-lg tracking-widest"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-gold py-3 text-base font-black text-gold-foreground shadow-gold disabled:opacity-60"
                >
                  {loading ? "جاري التحقق..." : "تأكيد وتأكيد الحساب"}
                </button>

                <button
                  type="button"
                  onClick={() => setPhoneStep("send")}
                  className="flex items-center justify-center gap-1 w-full text-xs text-muted-foreground hover:text-foreground mt-2"
                >
                  <ArrowRight className="h-3 w-3" />
                  تغيير رقم الهاتف
                </button>
              </form>
            )}
          </>
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
