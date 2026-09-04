import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Home,
  Film,
  Sparkles,
  LayoutDashboard,
  Gift,
  MoreHorizontal,
  X,
  Upload,
  MessageSquare,
  Bot,
  Palette,
  Globe,
  Crown,
  Ticket,
  Users,
  Music,
  Scale,
  BookOpen,
} from "lucide-react";

const navItems = [
  { id: "home", label: "الرئيسية", icon: Home, href: "/" as const },
  { id: "movies", label: "أفلام", icon: Film, href: "/anime-market" as const },
  { id: "anime", label: "انمي", icon: Sparkles, href: "/anime-browse" as const },
  { id: "dashboard", label: "لوحتي", icon: LayoutDashboard, href: "/dashboard" as const },
  { id: "earn", label: "اربح كريدت", icon: Gift, href: "/tasks" as const },
];

// قائمة "المزيد" — كل أدوات الموقع في مكان واحد
const moreItems = [
  { label: "اربح 25 كريدت مجاناً", desc: "مهمات يومية وكريدت فوري", icon: Gift, to: "/tasks" as const, tone: "#22c55e" },
  { label: "إنشاء مشاريع", desc: "ارفع مشروعك واعرضه للبيع", icon: Upload, to: "/shorts/upload" as const, tone: "#f97316" },
  { label: "تصفح المشاريع", desc: "شوف واشترِ مشاريع المستخدمين", icon: Film, to: "/shorts" as const, tone: "#ec4899" },
  { label: "شات برمجي", desc: "مساعد برمجة ذكي", icon: MessageSquare, to: "/chat" as const, tone: "#3b82f6" },
  { label: "استوديو النماذج", desc: "درّب نموذج ذكاء اصطناعي خاص", icon: Bot, to: "/model-studio" as const, tone: "#8b5cf6" },
  { label: "جرافيك ديزاين", desc: "محرر تصميم ومتجر", icon: Palette, to: "/graphic-design" as const, tone: "#06b6d4" },
  { label: "استوديو المانجا", desc: "ارسم مانجا بالألوان والأنميشن", icon: BookOpen, to: "/manga" as const, tone: "#f59e0b" },
  { label: "عجلة الحظ", desc: "لفة أسبوعية وجوائز", icon: Ticket, to: "/wheel" as const, tone: "#eab308" },
  { label: "الدردشة العامة", desc: "تواصل مع المجتمع", icon: Users, to: "/social" as const, tone: "#14b8a6" },
  { label: "الصوتيات", desc: "مؤثرات وموسيقى أنمي", icon: Music, to: "/audio" as const, tone: "#a855f7" },
  { label: "ترقية PRO", desc: "مزايا كاملة واشتراكات", icon: Crown, to: "/pro-upgrade" as const, tone: "#f59e0b" },
  { label: "دومينات مستقلة", desc: "احصل على دومين .com", icon: Globe, to: "/domains" as const, tone: "#0ea5e9" },
  { label: "الشروط والسياسات", desc: "القوانين وسياسة الخصوصية", icon: Scale, to: "/legal" as const, tone: "#64748b" },
];

export default function Navbar() {
  const location = useLocation();
  const [openMore, setOpenMore] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-4px_20px_-10px_rgba(17,24,39,0.25)]">
        <div className="mx-auto flex max-w-3xl items-center justify-around px-1 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href);

            return (
              <Link
                key={item.id}
                to={item.href}
                className={`flex min-w-[56px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition-all duration-200
                  ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary"}`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                <span className="whitespace-nowrap text-[11px] font-bold">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setOpenMore(true)}
            className={`flex min-w-[56px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition-all ${
              openMore ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary"
            }`}
          >
            <MoreHorizontal size={22} />
            <span className="whitespace-nowrap text-[11px] font-bold">المزيد</span>
          </button>
        </div>
      </nav>

      {openMore && (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/40" onClick={() => setOpenMore(false)}>
          <div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-background p-4 pb-24"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black text-gradient-gold">كل أدوات أنمي فورج</h2>
              <button
                type="button"
                onClick={() => setOpenMore(false)}
                className="rounded-full border border-border p-1.5 text-muted-foreground"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setOpenMore(false)}
                    className="rounded-2xl border-2 bg-card p-3 text-right shadow-card transition-transform hover:scale-[1.02]"
                    style={{ borderColor: item.tone }}
                  >
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl"
                      style={{ background: `${item.tone}1f`, color: item.tone }}
                    >
                      <Icon size={17} />
                    </span>
                    <p className="mt-2 text-[13px] font-black text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{item.desc}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
