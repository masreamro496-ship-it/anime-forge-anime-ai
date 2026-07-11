import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BIP | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIP);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const onClick = async () => {
    if (!deferred) {
      toast.info("افتح القائمة في المتصفح واختر: أضف للشاشة الرئيسية / Install app");
      return;
    }
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") toast.success("تم تثبيت التطبيق!");
    setDeferred(null);
  };

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border-2 border-yellow-500/60 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 py-4 text-base font-black text-yellow-300 flex items-center justify-center gap-2 hover:scale-[1.01] transition"
    >
      <Download className="h-5 w-5" />
      تنزيل التطبيق على جهازك
    </button>
  );
}
