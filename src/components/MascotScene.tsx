import GokuMascot from "@/components/GokuMascot";
import ConanMascot from "@/components/ConanMascot";

/**
 * مشهد متحرك: غوكو يطلق كرة الطاقة وكونان يتفاداها.
 */
export default function MascotScene({ size = 130 }: { size?: number }) {
  return (
    <div className="relative flex w-full items-end justify-center gap-6 overflow-hidden sm:gap-16">
      <GokuMascot size={size} mode="blast" />

      {/* كرة الطاقة المنطلقة */}
      <div className="pointer-events-none absolute bottom-[38%] right-[38%] z-10">
        <div className="ki-blast relative">
          <span className="block h-6 w-6 rounded-full bg-[#7dd3fc] shadow-[0_0_25px_10px_rgba(56,189,248,0.85)]" />
          <span className="absolute top-1/2 -right-10 h-2 w-12 -translate-y-1/2 rounded-full bg-gradient-to-l from-transparent to-[#bae6fd] opacity-80" />
        </div>
      </div>

      <ConanMascot size={size} mode="dodge" />
    </div>
  );
}
