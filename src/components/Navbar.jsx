import { Link, useLocation } from '@tanstack/react-router';
import { Home, Film, Sparkles, LayoutDashboard, Gift, MoreHorizontal } from 'lucide-react';

// ملاحظة: الروابط دي لازم تبقى مطابقة لمسارات موجودة فعلاً في src/routes
// عدّل href هنا لو غيّرت اسم أي صفحة
const navItems = [
  { id: 'home', label: 'الرئيسية', icon: Home, href: '/' as const },
  { id: 'movies', label: 'أفلام', icon: Film, href: '/anime-market' as const },
  { id: 'anime', label: 'انمي', icon: Sparkles, href: '/anime-market' as const },
  { id: 'dashboard', label: 'لوحتي', icon: LayoutDashboard, href: '/dashboard' as const },
  { id: 'earn', label: 'اربح كريدت', icon: Gift, href: '/tasks' as const },
  { id: 'more', label: 'المزيد', icon: MoreHorizontal, href: '/legal' as const },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-primary/30 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.6)]">
      <div className="flex justify-around items-center py-2 px-1 max-w-3xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.href);

          return (
            <Link
              key={item.id}
              to={item.href}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-all duration-200 min-w-[56px]
                ${isActive
                  ? 'text-primary bg-primary/10 shadow-[0_0_15px_-3px_var(--primary)]'
                  : 'text-muted-foreground hover:text-primary'
                }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
              <span className="text-[11px] font-bold whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
