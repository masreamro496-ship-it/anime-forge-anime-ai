import { useEffect } from "react";

const MAX_TRIGGERS = 5;
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const ZONE = "249393";

export function MonetagAutoAd() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let count = 0;

    const trigger = () => {
      if (count >= MAX_TRIGGERS) {
        clearInterval(timer);
        return;
      }
      count++;
      try {
        // Try common Monetag global trigger first
        const w = window as unknown as Record<string, unknown>;
        const fn = w[`show_${ZONE}`];
        if (typeof fn === "function") {
          (fn as () => void)();
          return;
        }
        // Fallback: re-inject the MultiTag script to retrigger
        const s = document.createElement("script");
        s.src = "https://quge5.com/88/tag.min.js";
        s.async = true;
        s.setAttribute("data-zone", ZONE);
        s.setAttribute("data-cfasync", "false");
        document.head.appendChild(s);
      } catch {
        // silent
      }
    };

    const timer = setInterval(trigger, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return null;
}
