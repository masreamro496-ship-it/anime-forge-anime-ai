import blueBadge from "@/assets/verified-blue.png";
import goldBadge from "@/assets/verified-gold.png";

type Props = {
  /** ذهبي للمشرف/الأدمن، أزرق لمشتركي Pro */
  variant: "gold" | "blue";
  size?: number;
  withLabel?: boolean;
  className?: string;
};

export function VerifiedBadge({ variant, size = 16, withLabel = false, className = "" }: Props) {
  const src = variant === "gold" ? goldBadge : blueBadge;
  const label = variant === "gold" ? "مشرف موثّق" : "موثّق Pro";
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title={label}>
      <img
        src={src}
        alt={label}
        width={512}
        height={512}
        loading="lazy"
        style={{ width: size, height: size }}
        className={
          variant === "gold"
            ? "drop-shadow-[0_0_6px_rgba(250,204,21,0.85)]"
            : "drop-shadow-[0_0_6px_rgba(56,189,248,0.85)]"
        }
      />
      {withLabel && (
        <span className={`text-[9px] font-black ${variant === "gold" ? "text-yellow-300" : "text-sky-300"}`}>
          {label}
        </span>
      )}
    </span>
  );
}
