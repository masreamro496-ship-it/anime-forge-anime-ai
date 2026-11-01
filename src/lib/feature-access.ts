export function featureAccessError(code?: string) {
  if (code === "not_authenticated") return "جلسة الدخول انتهت. سجّل الدخول مرة أخرى.";
  return "تعذر الاتصال بالمحفظة الآن. لم يتم خصم أي كريدت؛ حاول إعادة تحميل الرصيد.";
}