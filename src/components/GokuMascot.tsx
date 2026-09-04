/**
 * شخصية غوكو مرسومة بالكامل بـ SVG (مش صورة) ومتحركة بالأنميشن:
 * شعر يتحرك، هالة طاقة، ذراع تلوّح، وشرارات صاعدة.
 */
export default function GokuMascot({ size = 150 }: { size?: number }) {
  return (
    <div className="relative inline-block mascot-walk-a" style={{ width: size, height: size * 1.25 }}>
      {/* هالة الطاقة */}
      <div
        className="goku-aura pointer-events-none absolute inset-0 rounded-full blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(249,115,22,0.55), transparent 65%)" }}
      />
      {/* شرارات */}
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="goku-spark absolute bottom-4 h-2 w-2 rounded-full"
          style={{
            left: `${18 + i * 20}%`,
            background: i % 2 ? "#facc15" : "#f97316",
            animationDelay: `${i * 0.55}s`,
          }}
        />
      ))}

      <svg viewBox="0 0 120 150" className="relative h-full w-full mascot-bob" aria-label="غوكو">
        {/* شعر خلفي */}
        <g className="goku-hair" style={{ transformOrigin: "60px 45px" }}>
          <path d="M60 6 L44 34 L52 32 L40 52 L60 42 L80 52 L68 32 L76 34 Z" fill="#171717" />
          <path d="M30 40 L34 22 L44 38 Z" fill="#171717" />
          <path d="M90 40 L86 22 L76 38 Z" fill="#171717" />
        </g>

        {/* الوجه */}
        <ellipse cx="60" cy="52" rx="20" ry="21" fill="#f6d3ad" />
        <path d="M40 45 q20 -16 40 0 q-20 -6 -40 0" fill="#171717" />
        {/* عيون */}
        <g className="goku-blink" style={{ transformOrigin: "60px 54px" }}>
          <ellipse cx="52" cy="54" rx="3.2" ry="4.2" fill="#111" />
          <ellipse cx="68" cy="54" rx="3.2" ry="4.2" fill="#111" />
        </g>
        <path d="M54 63 q6 5 12 0" stroke="#8b5a3c" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* الجسم — بدلة برتقالية */}
        <path d="M42 74 h36 l6 34 h-48 z" fill="#f97316" />
        <path d="M60 74 l-10 10 l10 8 l10 -8 z" fill="#1d4ed8" />
        <rect x="36" y="106" width="48" height="8" rx="4" fill="#1d4ed8" />

        {/* الذراع اليمنى (تلوّح) */}
        <g className="goku-wave" style={{ transformOrigin: "80px 80px" }}>
          <rect x="78" y="76" width="10" height="28" rx="5" fill="#f97316" />
          <circle cx="83" cy="106" r="6" fill="#f6d3ad" />
        </g>
        {/* الذراع اليسرى */}
        <g className="goku-punch" style={{ transformOrigin: "38px 80px" }}>
          <rect x="32" y="76" width="10" height="28" rx="5" fill="#f97316" />
          <circle cx="37" cy="106" r="6" fill="#f6d3ad" />
        </g>

        {/* الأرجل */}
        <rect x="46" y="112" width="11" height="28" rx="5" fill="#f97316" />
        <rect x="63" y="112" width="11" height="28" rx="5" fill="#f97316" />
        <ellipse cx="51" cy="143" rx="8" ry="5" fill="#1d4ed8" />
        <ellipse cx="69" cy="143" rx="8" ry="5" fill="#1d4ed8" />

        {/* كرة طاقة في اليد */}
        <circle cx="37" cy="112" r="7" fill="#fbbf24" opacity="0.85" className="goku-aura" />
      </svg>
    </div>
  );
}
