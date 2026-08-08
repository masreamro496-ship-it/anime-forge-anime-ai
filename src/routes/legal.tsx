import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "سياسة الاستخدام وبنود الخدمة — انمي فورج" },
      { name: "description", content: "نبذة عن انمي فورج، سياسة الاستخدام، وبنود الخدمة الخاصة بالمنصة." },
      { property: "og:title", content: "سياسة الاستخدام وبنود الخدمة — انمي فورج" },
      { property: "og:description", content: "كل ما يخص حقوق الاستخدام والملكية الفكرية والدفع داخل منصة انمي فورج." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4 rotate-180" /> الرئيسية
          </Link>
          <span className="text-lg font-black text-gradient-gold">السياسات والبنود</span>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl space-y-4 px-4 py-8">
        <article id="about" className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h1 className="text-xl font-black text-gradient-gold">نبذة عن الموقع</h1>
          <p className="mt-2 text-sm leading-7 text-foreground/85">
            منصة متخصصة في إنتاج وتوليد حلقات أنمي أصلية بالكامل بجهودنا الخاصة، بدءاً من الفكرة والتحريك وحتى الإخراج
            النهائي. نهدف لتقديم تجربة بصرية سينمائية فريدة للمشاهدين بجودة عالية، مع أدوات توليد ودبلجة ومجتمع تفاعلي.
          </p>
        </article>

        <article id="policy" className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-xl font-black text-gradient-gold">سياسة الاستخدام</h2>
          <ul className="mt-2 space-y-2 text-sm leading-7 text-foreground/85">
            <li><b>الملكية الفكرية:</b> جميع الحلقات والتصاميم والمحتوى المولد داخل المنصة إنتاج حصري ومملوك للمنصة أو لناشره.</li>
            <li><b>الاستخدام الشخصي:</b> المحتوى للمشاهدة الشخصية فقط، ويُمنع إعادة النشر أو البيع خارج المنصة.</li>
            <li><b>السلوك:</b> يُمنع السب أو القذف أو نشر صور غير لائقة في الدردشة أو التعليقات، والمخالفة تعني الحظر.</li>
            <li><b>الحسابات:</b> كل مستخدم مسؤول عن حسابه ورصيد الكريدت الخاص به.</li>
          </ul>
        </article>

        <article id="terms" className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-xl font-black text-gradient-gold">بنود الخدمة</h2>
          <ul className="mt-2 space-y-2 text-sm leading-7 text-foreground/85">
            <li><b>الكريدت:</b> يُستخدم داخل المنصة فقط وغير قابل للاسترداد نقداً إلا في العروض التي تحددها الإدارة.</li>
            <li><b>الدفع:</b> عمليات الترقية والاشتراك تتم عبر فودافون كاش بمراجعة الإدارة لصورة العملية ورقمها.</li>
            <li><b>الجوائز:</b> جوائز عجلة الحظ تُصرف على محفظة فودافون كاش تبدأ بـ 010، ويمكن تحويلها إلى كريدت.</li>
            <li><b>التعديلات:</b> يحق للمنصة تعديل الأسعار والبنود مع إشعار المستخدمين داخل الموقع.</li>
          </ul>
        </article>
      </main>
    </div>
  );
}
