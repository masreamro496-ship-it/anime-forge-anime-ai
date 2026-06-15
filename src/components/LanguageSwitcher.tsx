import { useEffect } from "react";
import { Languages } from "lucide-react";

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  useEffect(() => {
    if (document.getElementById("google-translate-script")) return;

    window.googleTranslateElementInit = () => {
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "ar",
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element",
        );
      } catch (e) {
        console.warn("translate init failed", e);
      }
    };

    const s = document.createElement("script");
    s.id = "google-translate-script";
    s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 backdrop-blur ${className}`}
      title="اختر اللغة / Choose language"
    >
      <Languages className="h-4 w-4 text-gold" />
      <div id="google_translate_element" className="text-xs" />
    </div>
  );
}
