import { useEffect } from "react";

const MAX_TRIGGERS = 5;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const ZONE = "249393";

function showAd() {
  try {
    const w = window as unknown as Record<string, unknown>;
    const fn = w[`show_${ZONE}`];
    if (typeof fn === "function") {
      (fn as () => void)();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://quge5.com/88/tag.min.js";
    s.async = true;
    s.setAttribute("data-zone", ZONE);
    s.setAttribute("data-cfasync", "false");
    document.head.appendChild(s);
  } catch {
    // silent
  }
}

export function MonetagAutoAd() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let count = 0;
    let lastAdTime = 0;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isButtonLike =
        target.tagName === "BUTTON" ||
        target.closest("button") != null ||
        target.tagName === "A" ||
        target.closest("a") != null ||
        target.getAttribute("role") === "button" ||
        target.closest('[role="button"]') != null;

      if (!isButtonLike) return;
      if (count >= MAX_TRIGGERS) return;

      const now = Date.now();
      if (now - lastAdTime < COOLDOWN_MS) return;

      count++;
      lastAdTime = now;
      showAd();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
