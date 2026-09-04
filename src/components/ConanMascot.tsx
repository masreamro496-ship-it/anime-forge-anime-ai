/**
 * شخصية المحقق كونان مرسومة بالكامل بـ SVG ومتحركة:
 * تمشي يمين وشمال، تلوّح بيدها، ترمش، ونظارتها تلمع.
 */
export default function ConanMascot({ size = 150 }: { size?: number }) {
  return (
    <div className="relative inline-block mascot-walk-b" style={{ width: size, height: size * 1.25 }}>
      <div
        className="pointer-events-none absolute inset-0 rounded-full blur-2xl goku-aura"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.45), transparent 65%)" }}
      />

      <svg viewBox="0 0 120 150" className="relative h-full w-full mascot-bob" aria-label="المحقق كونان">
        {/* شعر */}
        <g className="conan-hair" style={{ transformOrigin: "60px 40px" }}>
          <path d="M38 48 q0 -30 22 -30 q22 0 22 30 q-6 -14 -22 -14 q-16 0 -22 14 Z" fill="#1f2937" />
          <path d="M78 22 q14 6 10 22 q-6 -12 -14 -16 Z" fill="#1f2937" />
        </g>

        {/* الوجه */}
        <ellipse cx="60" cy="52" rx="19" ry="20" fill="#f7d7b4" />

        {/* النظارة */}
        <g className="conan-glass">
          <circle cx="52" cy="54" r="8" fill="#dbeafe" opacity="0.85" stroke="#111827" strokeWidth="2" />
          <circle cx="70" cy="54" r="8" fill="#dbeafe" opacity="0.85" stroke="#111827" strokeWidth="2" />
          <path d="M60 54 h2" stroke="#111827" strokeWidth="2" />
          <path d="M44 52 h-6 M78 52 h6" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
          <path d="M47 50 l6 5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" className="conan-shine" />
        </g>
        {/* عيون خلف النظارة */}
        <g className="goku-blink" style={{ transformOrigin: "60px 55px" }}>
          <circle cx="52" cy="55" r="2.6" fill="#111827" />
          <circle cx="70" cy="55" r="2.6" fill="#111827" />
        </g>
        <path d="M55 65 q5 4 10 0" stroke="#a1663f" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* بدلة زرقاء + بابيون أحمر */}
        <path d="M42 74 h36 l6 34 h-48 z" fill="#1e3a8a" />
        <path d="M52 74 l8 12 l8 -12 z" fill="#f8fafc" />
        <path d="M54 78 l6 4 l-6 4 z M66 78 l-6 4 l6 4 z" fill="#dc2626" />
        <rect x="36" y="106" width="48" height="8" rx="4" fill="#111827" />

        {/* ذراع تسلّم (تلوّح) */}
        <g className="conan-wave" style={{ transformOrigin: "80px 80px" }}>
          <rect x="78" y="76" width="10" height="26" rx="5" fill="#1e3a8a" />
          <circle cx="83" cy="104" r="6" fill="#f7d7b4" />
        </g>
        {/* ذراع تحمل عدسة مكبّرة */}
        <g className="conan-lens" style={{ transformOrigin: "38px 80px" }}>
          <rect x="32" y="76" width="10" height="26" rx="5" fill="#1e3a8a" />
          <circle cx="37" cy="104" r="6" fill="#f7d7b4" />
          <circle cx="30" cy="114" r="9" fill="#bfdbfe" opacity="0.7" stroke="#334155" strokeWidth="3" />
          <rect x="33" y="120" width="4" height="12" rx="2" fill="#334155" transform="rotate(-35 35 124)" />
        </g>

        {/* الأرجل */}
        <g className="mascot-leg-a" style={{ transformOrigin: "51px 112px" }}>
          <rect x="46" y="112" width="11" height="26" rx="5" fill="#374151" />
          <ellipse cx="51" cy="141" rx="8" ry="5" fill="#111827" />
        </g>
        <g className="mascot-leg-b" style={{ transformOrigin: "69px 112px" }}>
          <rect x="63" y="112" width="11" height="26" rx="5" fill="#374151" />
          <ellipse cx="69" cy="141" rx="8" ry="5" fill="#111827" />
        </g>
      </svg>
    </div>
  );
}
