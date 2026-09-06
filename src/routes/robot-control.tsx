import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight as ArrowRightIcon,
  Bot,
  Camera,
  CircleStop,
  Loader2,
  Lock,
  Plug,
  Play,
  Save,
  Send,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { robotAssistant } from "@/lib/robot.functions";

export const Route = createFileRoute("/robot-control")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "تحكم في الروبوت — قيادة ESP32 عبر الواي فاي | أنمي فورج" },
      {
        name: "description",
        content:
          "صفحة تحكم كاملة في روبوت ESP32: أزرار اتجاه، إيقاف فوري، بث كاميرا مباشر، مساعد ذكاء اصطناعي، وتدريب حركات مخصصة — محمية بكود خاص.",
      },
      { property: "og:title", content: "تحكم في الروبوت — أنمي فورج" },
      { property: "og:description", content: "قد روبوت ESP32 من المتصفح مع كاميرا مباشرة ومساعد ذكي وتدريب حركات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RobotControlPage,
});

/* ---------------- اللغات ---------------- */

type LangKey = "ar" | "en" | "fr" | "es" | "de" | "tr" | "hi" | "zh";

type Dict = {
  name: string;
  dir: "rtl" | "ltr";
  title: string;
  subtitle: string;
  home: string;
  connection: string;
  deviceUrl: string;
  token: string;
  camUrl: string;
  connect: string;
  connected: string;
  offline: string;
  controls: string;
  forward: string;
  back: string;
  left: string;
  right: string;
  stop: string;
  speed: string;
  camera: string;
  noCam: string;
  assistant: string;
  askPlaceholder: string;
  training: string;
  trainHint: string;
  record: string;
  stopRecord: string;
  routineName: string;
  save: string;
  run: string;
  del: string;
  noRoutines: string;
  locked: string;
  lockedHint: string;
  setCode: string;
  enterCode: string;
  unlock: string;
  wrongCode: string;
  lockAgain: string;
  sent: string;
  failed: string;
  emergency: string;
};

const L: Record<LangKey, Dict> = {
  ar: {
    name: "العربية", dir: "rtl", title: "تحكم في الروبوت", subtitle: "قيادة روبوت ESP32 عبر الواي فاي مع كاميرا مباشرة ومساعد ذكي",
    home: "الرئيسية", connection: "الاتصال بالروبوت", deviceUrl: "عنوان ESP32 (IP)", token: "كود الحماية للجهاز", camUrl: "رابط الكاميرا (اختياري)",
    connect: "اتصال", connected: "متصل", offline: "غير متصل", controls: "أزرار الاتجاه", forward: "قدام", back: "خلف", left: "شمال", right: "يمين",
    stop: "توقف فوري", speed: "السرعة", camera: "بث الكاميرا المباشر", noCam: "لا توجد كاميرا متصلة",
    assistant: "مساعد الروبوت الذكي", askPlaceholder: "اسأل عن حالة الروبوت…", training: "تدريب الروبوت",
    trainHint: "سجّل سلسلة حركات وشغّلها كحركة واحدة في أي وقت.", record: "ابدأ التسجيل", stopRecord: "إيقاف التسجيل",
    routineName: "اسم الحركة", save: "حفظ", run: "تشغيل", del: "حذف", noRoutines: "لا توجد حركات محفوظة بعد.",
    locked: "الصفحة محمية", lockedHint: "التحكم والتدريب متاحان لصاحب الروبوت فقط. اكتب كود التحكم الخاص بك.",
    setCode: "اضبط كود التحكم", enterCode: "اكتب كود التحكم", unlock: "فتح", wrongCode: "الكود غير صحيح", lockAgain: "قفل الصفحة",
    sent: "تم إرسال الأمر", failed: "تعذّر الوصول للروبوت", emergency: "زر الطوارئ يوقف كل الحركات فوراً",
  },
  en: {
    name: "English", dir: "ltr", title: "Robot Control", subtitle: "Drive your ESP32 robot over Wi-Fi with live camera and an AI assistant",
    home: "Home", connection: "Robot connection", deviceUrl: "ESP32 address (IP)", token: "Device secret token", camUrl: "Camera URL (optional)",
    connect: "Connect", connected: "Connected", offline: "Offline", controls: "Direction buttons", forward: "Forward", back: "Back", left: "Left", right: "Right",
    stop: "EMERGENCY STOP", speed: "Speed", camera: "Live camera", noCam: "No camera connected",
    assistant: "AI robot assistant", askPlaceholder: "Ask about the robot state…", training: "Robot training",
    trainHint: "Record a sequence of moves and replay it as one routine.", record: "Start recording", stopRecord: "Stop recording",
    routineName: "Routine name", save: "Save", run: "Run", del: "Delete", noRoutines: "No routines saved yet.",
    locked: "Protected page", lockedHint: "Control and training are for the robot owner only. Enter your control code.",
    setCode: "Set control code", enterCode: "Enter control code", unlock: "Unlock", wrongCode: "Wrong code", lockAgain: "Lock page",
    sent: "Command sent", failed: "Robot unreachable", emergency: "Emergency button stops all motion instantly",
  },
  fr: {
    name: "Français", dir: "ltr", title: "Contrôle du robot", subtitle: "Pilotez votre robot ESP32 en Wi-Fi avec caméra live et assistant IA",
    home: "Accueil", connection: "Connexion du robot", deviceUrl: "Adresse ESP32 (IP)", token: "Jeton secret", camUrl: "URL caméra (optionnel)",
    connect: "Connecter", connected: "Connecté", offline: "Hors ligne", controls: "Boutons de direction", forward: "Avant", back: "Arrière", left: "Gauche", right: "Droite",
    stop: "ARRÊT IMMÉDIAT", speed: "Vitesse", camera: "Caméra en direct", noCam: "Aucune caméra connectée",
    assistant: "Assistant IA du robot", askPlaceholder: "Posez une question…", training: "Entraînement du robot",
    trainHint: "Enregistrez une séquence et rejouez-la en un clic.", record: "Enregistrer", stopRecord: "Arrêter",
    routineName: "Nom de la séquence", save: "Enregistrer", run: "Lancer", del: "Supprimer", noRoutines: "Aucune séquence enregistrée.",
    locked: "Page protégée", lockedHint: "Réservé au propriétaire du robot. Entrez votre code.",
    setCode: "Définir le code", enterCode: "Entrez le code", unlock: "Déverrouiller", wrongCode: "Code incorrect", lockAgain: "Verrouiller",
    sent: "Commande envoyée", failed: "Robot injoignable", emergency: "Le bouton d'urgence arrête tout immédiatement",
  },
  es: {
    name: "Español", dir: "ltr", title: "Control del robot", subtitle: "Controla tu robot ESP32 por Wi-Fi con cámara en vivo y asistente IA",
    home: "Inicio", connection: "Conexión del robot", deviceUrl: "Dirección ESP32 (IP)", token: "Token secreto", camUrl: "URL de cámara (opcional)",
    connect: "Conectar", connected: "Conectado", offline: "Sin conexión", controls: "Botones de dirección", forward: "Adelante", back: "Atrás", left: "Izquierda", right: "Derecha",
    stop: "PARADA INMEDIATA", speed: "Velocidad", camera: "Cámara en vivo", noCam: "Sin cámara conectada",
    assistant: "Asistente IA del robot", askPlaceholder: "Pregunta por el estado…", training: "Entrenamiento del robot",
    trainHint: "Graba una secuencia y reprodúcela con un clic.", record: "Grabar", stopRecord: "Detener",
    routineName: "Nombre de la rutina", save: "Guardar", run: "Ejecutar", del: "Borrar", noRoutines: "Sin rutinas guardadas.",
    locked: "Página protegida", lockedHint: "Solo para el dueño del robot. Escribe tu código.",
    setCode: "Definir código", enterCode: "Escribe el código", unlock: "Desbloquear", wrongCode: "Código incorrecto", lockAgain: "Bloquear",
    sent: "Comando enviado", failed: "Robot inaccesible", emergency: "El botón de emergencia detiene todo al instante",
  },
  de: {
    name: "Deutsch", dir: "ltr", title: "Robotersteuerung", subtitle: "Steuere deinen ESP32-Roboter per WLAN mit Livekamera und KI-Assistent",
    home: "Startseite", connection: "Roboterverbindung", deviceUrl: "ESP32-Adresse (IP)", token: "Geheimer Token", camUrl: "Kamera-URL (optional)",
    connect: "Verbinden", connected: "Verbunden", offline: "Offline", controls: "Richtungstasten", forward: "Vorwärts", back: "Zurück", left: "Links", right: "Rechts",
    stop: "NOT-STOPP", speed: "Geschwindigkeit", camera: "Livekamera", noCam: "Keine Kamera verbunden",
    assistant: "KI-Roboterassistent", askPlaceholder: "Frag nach dem Status…", training: "Robotertraining",
    trainHint: "Nimm eine Bewegungsfolge auf und spiele sie ab.", record: "Aufnehmen", stopRecord: "Stoppen",
    routineName: "Name der Routine", save: "Speichern", run: "Abspielen", del: "Löschen", noRoutines: "Noch keine Routinen.",
    locked: "Geschützte Seite", lockedHint: "Nur für den Besitzer. Gib deinen Code ein.",
    setCode: "Code festlegen", enterCode: "Code eingeben", unlock: "Entsperren", wrongCode: "Falscher Code", lockAgain: "Sperren",
    sent: "Befehl gesendet", failed: "Roboter nicht erreichbar", emergency: "Not-Aus stoppt sofort alles",
  },
  tr: {
    name: "Türkçe", dir: "ltr", title: "Robot Kontrolü", subtitle: "ESP32 robotunu Wi-Fi ile canlı kamera ve yapay zekâ asistanıyla sür",
    home: "Ana sayfa", connection: "Robot bağlantısı", deviceUrl: "ESP32 adresi (IP)", token: "Gizli anahtar", camUrl: "Kamera adresi (isteğe bağlı)",
    connect: "Bağlan", connected: "Bağlı", offline: "Çevrimdışı", controls: "Yön tuşları", forward: "İleri", back: "Geri", left: "Sol", right: "Sağ",
    stop: "ACİL DURDUR", speed: "Hız", camera: "Canlı kamera", noCam: "Kamera bağlı değil",
    assistant: "Yapay zekâ asistanı", askPlaceholder: "Robot durumunu sor…", training: "Robot eğitimi",
    trainHint: "Hareket dizisi kaydet ve tek tıkla oynat.", record: "Kaydet", stopRecord: "Durdur",
    routineName: "Dizi adı", save: "Kaydet", run: "Çalıştır", del: "Sil", noRoutines: "Kayıtlı dizi yok.",
    locked: "Korumalı sayfa", lockedHint: "Sadece robot sahibi içindir. Kodunu gir.",
    setCode: "Kod belirle", enterCode: "Kodu gir", unlock: "Aç", wrongCode: "Kod yanlış", lockAgain: "Kilitle",
    sent: "Komut gönderildi", failed: "Robota ulaşılamadı", emergency: "Acil durdurma her şeyi anında durdurur",
  },
  hi: {
    name: "हिन्दी", dir: "ltr", title: "रोबोट नियंत्रण", subtitle: "वाई-फाई से ESP32 रोबोट चलाएँ, लाइव कैमरा और AI सहायक के साथ",
    home: "होम", connection: "रोबोट कनेक्शन", deviceUrl: "ESP32 पता (IP)", token: "गुप्त टोकन", camUrl: "कैमरा लिंक (वैकल्पिक)",
    connect: "कनेक्ट", connected: "जुड़ा है", offline: "ऑफ़लाइन", controls: "दिशा बटन", forward: "आगे", back: "पीछे", left: "बाएँ", right: "दाएँ",
    stop: "तुरंत रोकें", speed: "गति", camera: "लाइव कैमरा", noCam: "कोई कैमरा नहीं",
    assistant: "AI रोबोट सहायक", askPlaceholder: "रोबोट के बारे में पूछें…", training: "रोबोट प्रशिक्षण",
    trainHint: "चालों की श्रृंखला रिकॉर्ड करें और दोबारा चलाएँ।", record: "रिकॉर्ड", stopRecord: "रोकें",
    routineName: "रूटीन नाम", save: "सहेजें", run: "चलाएँ", del: "हटाएँ", noRoutines: "कोई रूटीन नहीं।",
    locked: "सुरक्षित पेज", lockedHint: "केवल मालिक के लिए। अपना कोड डालें।",
    setCode: "कोड सेट करें", enterCode: "कोड डालें", unlock: "अनलॉक", wrongCode: "गलत कोड", lockAgain: "लॉक करें",
    sent: "कमांड भेजी गई", failed: "रोबोट नहीं मिला", emergency: "आपातकालीन बटन सब कुछ तुरंत रोक देता है",
  },
  zh: {
    name: "中文", dir: "ltr", title: "机器人控制", subtitle: "通过 Wi-Fi 控制 ESP32 机器人，带实时摄像头和 AI 助手",
    home: "首页", connection: "机器人连接", deviceUrl: "ESP32 地址 (IP)", token: "设备密钥", camUrl: "摄像头地址（可选）",
    connect: "连接", connected: "已连接", offline: "离线", controls: "方向按钮", forward: "前进", back: "后退", left: "左转", right: "右转",
    stop: "紧急停止", speed: "速度", camera: "实时画面", noCam: "未连接摄像头",
    assistant: "AI 机器人助手", askPlaceholder: "询问机器人状态…", training: "机器人训练",
    trainHint: "录制一串动作，一键回放。", record: "开始录制", stopRecord: "停止录制",
    routineName: "动作名称", save: "保存", run: "运行", del: "删除", noRoutines: "还没有保存的动作。",
    locked: "受保护页面", lockedHint: "仅限机器人拥有者。请输入控制码。",
    setCode: "设置控制码", enterCode: "输入控制码", unlock: "解锁", wrongCode: "控制码错误", lockAgain: "锁定",
    sent: "指令已发送", failed: "无法连接机器人", emergency: "紧急按钮立即停止所有动作",
  },
};

/* ---------------- الأنواع ---------------- */

type Dir = "forward" | "back" | "left" | "right" | "stop";
type Step = { dir: Dir; speed: number; delay: number };
type Routine = { id: string; name: string; steps: Step[] };

const key = (u: string, k: string) => `af:robot:${u}:${k}`;

function RobotControlPage() {
  const { user } = useAuth();
  const uid = user?.id ?? "guest";
  const askAi = useServerFn(robotAssistant);

  const [lang, setLang] = useState<LangKey>("ar");
  const t = L[lang];

  // الحماية
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  // الاتصال
  const [deviceUrl, setDeviceUrl] = useState("http://192.168.1.50");
  const [token, setToken] = useState("");
  const [camUrl, setCamUrl] = useState("");
  const [online, setOnline] = useState(false);
  const [speed, setSpeed] = useState(160);
  const [lastCmd, setLastCmd] = useState<Dir | "-">("-");
  const [log, setLog] = useState<string[]>([]);

  // التدريب
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [routineName, setRoutineName] = useState("");
  const [routines, setRoutines] = useState<Routine[]>([]);
  const lastStepAt = useRef<number>(0);

  // المساعد
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    try {
      setSavedCode(localStorage.getItem(key(uid, "code")));
      setDeviceUrl(localStorage.getItem(key(uid, "url")) ?? "http://192.168.1.50");
      setToken(localStorage.getItem(key(uid, "token")) ?? "");
      setCamUrl(localStorage.getItem(key(uid, "cam")) ?? "");
      setLang((localStorage.getItem("af:robot:lang") as LangKey) ?? "ar");
      setRoutines(JSON.parse(localStorage.getItem(key(uid, "routines")) ?? "[]") as Routine[]);
    } catch {
      /* ignore */
    }
  }, [uid]);

  useEffect(() => {
    setMessages([{ role: "assistant", content: L[lang].assistant + " ✅" }]);
    try {
      localStorage.setItem("af:robot:lang", lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const pushLog = (m: string) =>
    setLog((p) => [`${new Date().toLocaleTimeString()} — ${m}`, ...p].slice(0, 40));

  const persist = (k: string, v: string) => {
    try {
      localStorage.setItem(key(uid, k), v);
    } catch {
      /* ignore */
    }
  };

  const unlock = () => {
    const code = codeInput.trim();
    if (code.length < 4) return toast.error(t.wrongCode);
    if (!savedCode) {
      persist("code", code);
      setSavedCode(code);
      setUnlocked(true);
      toast.success("✅ " + t.setCode);
      return;
    }
    if (code === savedCode) {
      setUnlocked(true);
      setCodeInput("");
    } else toast.error(t.wrongCode);
  };

  const send = useCallback(
    async (dir: Dir, sp = speed) => {
      setLastCmd(dir);
      if (recording && dir !== "stop") {
        const now = Date.now();
        const delay = lastStepAt.current ? Math.min(5000, now - lastStepAt.current) : 400;
        lastStepAt.current = now;
        setSteps((p) => [...p, { dir, speed: sp, delay }]);
      }
      const base = deviceUrl.replace(/\/+$/, "");
      const url = `${base}/cmd?dir=${dir}&speed=${sp}${token ? `&token=${encodeURIComponent(token)}` : ""}`;
      try {
        await fetch(url, { mode: "no-cors", cache: "no-store" });
        setOnline(true);
        pushLog(`${dir} @${sp}`);
      } catch {
        setOnline(false);
        pushLog(`${t.failed}: ${dir}`);
        toast.error(t.failed);
      }
    },
    [deviceUrl, token, speed, recording, t.failed],
  );

  const emergencyStop = useCallback(async () => {
    setRecording(false);
    await send("stop", 0);
    toast.success("🛑 " + t.stop);
  }, [send, t.stop]);

  // تحكم بالكيبورد
  useEffect(() => {
    if (!unlocked) return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "forward",
        ArrowDown: "back",
        ArrowLeft: "left",
        ArrowRight: "right",
        " ": "stop",
      };
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      if (d === "stop") void emergencyStop();
      else void send(d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unlocked, send, emergencyStop]);

  const saveRoutine = () => {
    if (!steps.length) return toast.error(t.trainHint);
    const name = routineName.trim() || `#${routines.length + 1}`;
    const next = [...routines, { id: crypto.randomUUID(), name, steps }];
    setRoutines(next);
    persist("routines", JSON.stringify(next));
    setSteps([]);
    setRoutineName("");
    toast.success("✅ " + t.save);
  };

  const runRoutine = async (r: Routine) => {
    for (const s of r.steps) {
      await send(s.dir, s.speed);
      await new Promise((res) => setTimeout(res, s.delay));
    }
    await send("stop", 0);
    toast.success(`▶️ ${r.name}`);
  };

  const deleteRoutine = (id: string) => {
    const next = routines.filter((r) => r.id !== id);
    setRoutines(next);
    persist("routines", JSON.stringify(next));
  };

  const stateText = useMemo(
    () =>
      `الاتصال: ${online ? "متصل" : "غير متصل"} | العنوان: ${deviceUrl} | آخر أمر: ${lastCmd} | السرعة: ${speed} | كاميرا: ${camUrl ? "متصلة" : "لا"} | حركات محفوظة: ${routines.length}`,
    [online, deviceUrl, lastCmd, speed, camUrl, routines.length],
  );

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || thinking) return;
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setInput("");
    setThinking(true);
    try {
      const res = await askAi({ data: { messages: history, state: stateText, lang: t.name } });
      setMessages((p) => [...p, { role: "assistant", content: res.text || "..." }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI error");
    } finally {
      setThinking(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

  return (
    <div dir={t.dir} className="min-h-screen bg-background pb-28 text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5">
          <Link to="/model-studio" className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4" /> {t.home}
          </Link>
          <div className="flex items-center gap-1.5">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-black">{t.title}</span>
          </div>
          <select
            aria-label="language"
            value={lang}
            onChange={(e) => setLang(e.target.value as LangKey)}
            className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-bold"
          >
            {(Object.keys(L) as LangKey[]).map((k) => (
              <option key={k} value={k}>
                {L[k].name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 py-4">
        <h1 className="text-xl font-black sm:text-2xl">{t.title}</h1>
        <p className="mt-1 text-xs leading-6 text-muted-foreground sm:text-sm">{t.subtitle}</p>

        {!unlocked ? (
          <section className="mx-auto mt-8 max-w-md rounded-2xl border-2 border-primary/40 bg-card p-6 text-center shadow-card">
            <Lock className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-2 text-lg font-black">{t.locked}</h2>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">{t.lockedHint}</p>
            <input
              type="password"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && unlock()}
              placeholder={savedCode ? t.enterCode : t.setCode}
              className={`${inputCls} mt-4 text-center`}
            />
            <button onClick={unlock} className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-black text-primary-foreground hover:brightness-110">
              {savedCode ? t.unlock : t.setCode}
            </button>
          </section>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {/* الاتصال + التحكم */}
            <section className="space-y-3 lg:col-span-2">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-black">
                    <Plug className="h-4 w-4 text-primary" /> {t.connection}
                  </span>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${online ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />} {online ? t.connected : t.offline}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="block text-xs font-bold text-muted-foreground">
                    {t.deviceUrl}
                    <input dir="ltr" value={deviceUrl} onChange={(e) => { setDeviceUrl(e.target.value); persist("url", e.target.value); }} className={`${inputCls} mt-1`} />
                  </label>
                  <label className="block text-xs font-bold text-muted-foreground">
                    {t.token}
                    <input dir="ltr" type="password" value={token} onChange={(e) => { setToken(e.target.value); persist("token", e.target.value); }} className={`${inputCls} mt-1`} />
                  </label>
                  <label className="block text-xs font-bold text-muted-foreground">
                    {t.camUrl}
                    <input dir="ltr" value={camUrl} onChange={(e) => { setCamUrl(e.target.value); persist("cam", e.target.value); }} placeholder="http://192.168.1.51:81/stream" className={`${inputCls} mt-1`} />
                  </label>
                </div>
                <button onClick={() => send("stop", 0)} className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary">
                  {t.connect}
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <p className="mb-3 text-sm font-black">{t.controls}</p>
                <div className="mx-auto grid max-w-[260px] grid-cols-3 gap-2">
                  <span />
                  <PadBtn onClick={() => send("forward")} icon={<ArrowUp className="h-6 w-6" />} label={t.forward} />
                  <span />
                  <PadBtn onClick={() => send("left")} icon={<ArrowLeft className="h-6 w-6" />} label={t.left} />
                  <PadBtn onClick={() => send("stop", 0)} icon={<CircleStop className="h-6 w-6" />} label={t.stop} />
                  <PadBtn onClick={() => send("right")} icon={<ArrowRightIcon className="h-6 w-6" />} label={t.right} />
                  <span />
                  <PadBtn onClick={() => send("back")} icon={<ArrowDown className="h-6 w-6" />} label={t.back} />
                  <span />
                </div>

                <label className="mt-4 block text-xs font-bold text-muted-foreground">
                  {t.speed}: {speed}
                  <input type="range" min={60} max={255} value={speed} onChange={(e) => setSpeed(+e.target.value)} className="mt-1 w-full accent-primary" />
                </label>

                <button
                  onClick={emergencyStop}
                  className="mt-4 w-full rounded-2xl bg-red-600 py-5 text-xl font-black text-white shadow-lg ring-4 ring-red-600/25 transition hover:bg-red-500 active:scale-[0.98]"
                >
                  🛑 {t.stop}
                </button>
                <p className="mt-1.5 text-center text-[11px] text-muted-foreground">{t.emergency}</p>

                <div className="mt-3 max-h-28 overflow-y-auto rounded-lg border border-border bg-foreground/5 p-2 font-mono text-[10px]" dir="ltr">
                  {log.length ? log.map((l) => <div key={l}>{l}</div>) : <span className="text-muted-foreground">no commands yet…</span>}
                </div>
              </div>

              {/* الكاميرا */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-black">
                  <Camera className="h-4 w-4 text-primary" /> {t.camera}
                </p>
                {camUrl ? (
                  <img src={camUrl} alt={t.camera} className="w-full rounded-xl border border-border bg-black object-contain" />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground">
                    {t.noCam}
                  </div>
                )}
              </div>

              {/* التدريب */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <p className="text-sm font-black">{t.training}</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{t.trainHint}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => { setRecording((r) => !r); lastStepAt.current = 0; }}
                    className={`rounded-lg px-3 py-2 text-xs font-black ${recording ? "bg-red-600 text-white" : "bg-primary text-primary-foreground"}`}
                  >
                    {recording ? t.stopRecord : t.record} {steps.length ? `(${steps.length})` : ""}
                  </button>
                  <input value={routineName} onChange={(e) => setRoutineName(e.target.value)} placeholder={t.routineName} className={`${inputCls} max-w-[180px]`} />
                  <button onClick={saveRoutine} className="inline-flex items-center gap-1 rounded-lg border border-primary px-3 py-2 text-xs font-black text-primary hover:bg-primary/10">
                    <Save className="h-3.5 w-3.5" /> {t.save}
                  </button>
                </div>
                <div className="mt-3 space-y-1.5">
                  {routines.length ? (
                    routines.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                        <span className="text-xs font-bold">{r.name} · {r.steps.length}</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => runRoutine(r)} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-black text-white">
                            <Play className="h-3 w-3" /> {t.run}
                          </button>
                          <button aria-label={t.del} onClick={() => deleteRoutine(r.id)} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-red-500">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">{t.noRoutines}</p>
                  )}
                </div>
              </div>
            </section>

            {/* المساعد الذكي */}
            <aside className="space-y-3">
              <div className="flex h-[70vh] min-h-[420px] flex-col rounded-2xl border border-primary/40 bg-card p-3.5">
                <p className="flex items-center gap-1.5 text-sm font-black text-primary">
                  <Bot className="h-4 w-4" /> {t.assistant}
                </p>
                <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1">
                  {messages.map((m, i) => (
                    <div key={i} className={`max-w-[92%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-6 ${m.role === "user" ? "ms-auto bg-primary text-primary-foreground" : "border border-border bg-background"}`}>
                      {m.content}
                    </div>
                  ))}
                  {thinking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(input)} placeholder={t.askPlaceholder} className={inputCls} />
                  <button aria-label="send" onClick={() => ask(input)} disabled={thinking} className="rounded-lg bg-primary px-3 text-primary-foreground disabled:opacity-50">
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <button onClick={() => setUnlocked(false)} className="w-full rounded-xl border border-border py-2 text-xs font-bold text-muted-foreground hover:border-primary">
                🔒 {t.lockAgain}
              </button>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function PadBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-border bg-background text-foreground transition hover:border-primary hover:bg-primary/10 active:scale-95"
    >
      {icon}
      <span className="text-[10px] font-black">{label}</span>
    </button>
  );
}
