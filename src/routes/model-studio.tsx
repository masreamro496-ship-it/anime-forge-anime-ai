import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Bot, Cpu, ImagePlus, Loader2, Play, Send, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { uploadUserFile, signedUrl } from "@/lib/storage";
import gokuHero from "@/assets/goku-hero.png";

const LORA_BUCKET = "lora-model";
import { copilotChat, getTrainingStatus, startLoraTraining } from "@/lib/model-studio.functions";

export const Route = createFileRoute("/model-studio")({
  head: () => ({
    meta: [
      { title: "استوديو النماذج — درّب نموذج ذكاء اصطناعي مخصص | موقع انمي فورج" },
      { name: "description", content: "ابنِ نموذج ذكاء اصطناعي مخصص للمانجا والصور والفيديو، برمجه مع كوبايلوت ذكي، ودرّبه بتقنية LoRA على GPU مجاني." },
      { property: "og:title", content: "استوديو النماذج — موقع انمي فورج" },
      { property: "og:description", content: "درّب نموذج LoRA خاص بك على المانجا والصور والفيديو بمساعدة كوبايلوت ذكي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ModelStudio,
});

const BASE_MODELS = [
  { id: "stabilityai/stable-diffusion-xl-base-1.0", label: "SDXL 1.0 — صور عالية الدقة", domain: "image" },
  { id: "cagliostrolab/animagine-xl-3.1", label: "Animagine XL 3.1 — أنمي", domain: "image" },
  { id: "Linaqruf/anything-v3.0", label: "Anything V3 — مانجا وأنمي", domain: "manga" },
  { id: "runwayml/stable-diffusion-v1-5", label: "SD 1.5 — سريع وخفيف", domain: "image" },
  { id: "guoyww/animatediff-motion-adapter-v1-5-2", label: "AnimateDiff — فيديو/تحريك", domain: "video" },
];

type ChatMsg = { role: "user" | "assistant"; content: string };
type Asset = { name: string; url: string };

function ModelStudio() {
  const { user } = useAuth();
  const chat = useServerFn(copilotChat);
  const train = useServerFn(startLoraTraining);
  const status = useServerFn(getTrainingStatus);

  const [tab, setTab] = useState<"config" | "data" | "train" | "copilot">("config");

  // إعدادات النموذج
  const [modelName, setModelName] = useState("نموذجي الأول");
  const [triggerWord, setTriggerWord] = useState("afchar");
  const [domain, setDomain] = useState<"manga" | "image" | "video">("manga");
  const [baseModel, setBaseModel] = useState(BASE_MODELS.find((model) => model.domain === "manga")?.id ?? "Linaqruf/anything-v3.0");
  const [systemPrompt, setSystemPrompt] = useState(
    "أنت نموذج توليد أنمي/مانجا عالي الجودة. التزم بأسلوب خطوط حادة، تظليل سينمائي، وألوان متباينة.",
  );
  const [steps, setSteps] = useState(1200);
  const [learningRate, setLearningRate] = useState(0.0001);
  const [rank, setRank] = useState(16);
  const [resolution, setResolution] = useState(768);

  // الداتاست
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // التدريب
  const [training, setTraining] = useState(false);
  const [jobLog, setJobLog] = useState<string[]>([]);

  // الكوبايلوت
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "أهلاً 👋 أنا كوبايلوت موقع انمي فورج. قولي نوع النموذج اللي عايز تبنيه (مانجا / صور / فيديو) وأنا هظبطلك الـ System Prompt والباراميترات وأحسّن جودة ردوده.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const configText = `الاسم: ${modelName} | المجال: ${domain} | النموذج الأساسي: ${baseModel} | كلمة التفعيل: ${triggerWord} | steps: ${steps} | lr: ${learningRate} | rank: ${rank} | resolution: ${resolution} | عدد ملفات الداتاست: ${assets.length}\nSystem Prompt: ${systemPrompt}`;

  const log = (m: string) => setJobLog((p) => [`${new Date().toLocaleTimeString("ar-EG")} — ${m}`, ...p].slice(0, 60));

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    if (!user) {
      toast.error("سجّل دخولك الأول عشان ترفع الداتاست");
      return;
    }
    setUploading(true);
    try {
      const selectedFiles = Array.from(files);
      let uploadedCount = 0;
      for (const file of selectedFiles) {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
          toast.error(`نوع الملف غير مدعوم: ${file.name}`);
          continue;
        }
        // يرفع الملف كاملاً إلى bucket الـ LoRA مع مسار خاص بالمستخدم.
        const uploadedPath = await uploadUserFile(LORA_BUCKET, user.id, file, "lora-");
        const url = await signedUrl(LORA_BUCKET, uploadedPath, 60 * 60 * 24 * 7);
        setAssets((previous) => [...previous, { name: file.name, url }]);
        uploadedCount += 1;
      }
      if (uploadedCount) toast.success(`تم رفع ${uploadedCount} ملف بالكامل ✅`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function ask(text: string) {
    const q = text.trim();
    if (!q || thinking) return;
    const history: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(history);
    setInput("");
    setThinking(true);
    try {
      const res = await chat({ data: { messages: history, context: configText } });
      setMessages((p) => [...p, { role: "assistant", content: res.text || "..." }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الاتصال بالكوبايلوت");
    } finally {
      setThinking(false);
    }
  }

  async function autoTune() {
    setThinking(true);
    setTab("copilot");
    try {
      const res = await chat({
        data: {
          messages: [
            {
              role: "user",
              content:
                "اضبط لي أفضل باراميترات تدريب LoRA لهذه الإعدادات، وأعد في آخر ردك سطر JSON فقط بالشكل: {\"steps\":..,\"learning_rate\":..,\"rank\":..,\"resolution\":..}",
            },
          ],
          context: configText,
        },
      });
      setMessages((p) => [...p, { role: "assistant", content: res.text }]);
      const m = res.text.match(/\{[^{}]*"steps"[^{}]*\}/);
      if (m) {
        const j = JSON.parse(m[0]) as { steps?: number; learning_rate?: number; rank?: number; resolution?: number };
        if (j.steps) setSteps(j.steps);
        if (j.learning_rate) setLearningRate(j.learning_rate);
        if (j.rank) setRank(j.rank);
        if (j.resolution) setResolution(j.resolution);
        toast.success("تم ضبط الباراميترات تلقائياً ✅");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الضبط التلقائي");
    } finally {
      setThinking(false);
    }
  }

  async function improvePrompt() {
    setThinking(true);
    try {
      const res = await chat({
        data: {
          messages: [{ role: "user", content: "حسّن الـ System Prompt التالي وأعد النسخة النهائية فقط بدون شرح:\n" + systemPrompt }],
          context: configText,
        },
      });
      const clean = res.text.replace(/^```[a-z]*\s*|\s*```$/g, "").trim();
      if (clean) {
        setSystemPrompt(clean);
        toast.success("تم تطوير الـ Prompt ✅");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل التحسين");
    } finally {
      setThinking(false);
    }
  }

  async function launchTraining() {
    if (!assets.length) {
      toast.error("ارفع صور/فيديوهات الداتاست الأول");
      setTab("data");
      return;
    }
    setTraining(true);
    setTab("train");
    log("جارٍ إرسال المهمة إلى Kaggle GPU...");
    try {
      const res = await train({
        data: {
          modelName,
          baseModel,
          domain,
          steps,
          learningRate,
          rank,
          resolution,
          datasetUrls: assets.map((a) => a.url),
          triggerWord,
          systemPrompt,
        },
      });
      if (res.ok) {
        log(`تم إدراج المهمة في الطابور على Kaggle — ${res.ref}`);
        toast.success("بدأ التدريب على GPU ✅");
        const st = await status({ data: {} });
        log(`الحالة: ${st.status}${st.message ? " — " + st.message : ""}`);
      } else {
        log(`فشل: ${res.message}`);
        toast.error(res.message);
      }
    } catch (e) {
      log(`خطأ: ${e instanceof Error ? e.message : "غير معروف"}`);
      toast.error("فشل إطلاق التدريب");
    } finally {
      setTraining(false);
    }
  }

  async function refreshStatus() {
    const st = await status({ data: {} });
    log(`الحالة: ${st.status}${st.message ? " — " + st.message : ""}`);
  }

  return (
    <div className="studio-light min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-5">
          <Link to="/" className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition hover:text-foreground">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <div className="flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-primary" />
            <span className="text-sm font-black text-foreground">استوديو النماذج</span>
          </div>
          <span className="hidden rounded-full bg-accent px-2 py-1 text-[10px] font-black text-accent-foreground sm:inline">LoRA / AI</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-5 sm:py-6">
        <section className="relative mb-4 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-card sm:px-6">
          <div className="relative z-10 max-w-2xl py-2 sm:py-4">
            <p className="mb-1 text-[11px] font-black uppercase tracking-[0.12em] text-primary">Anime Forge Studio</p>
            <h1 className="text-xl font-black leading-tight text-foreground sm:text-2xl">ابنِ نموذج ذكاء اصطناعي خاص بك</h1>
            <p className="mt-1 max-w-xl text-xs leading-6 text-muted-foreground sm:text-sm">
              صمّم نموذجك للمانجا أو الصور أو الفيديو، ارفع بياناتك، وطوّره بمساعدة الكوبايلوت ثم أرسل تدريب LoRA إلى Kaggle.
            </p>
          </div>
          <div className="pointer-events-none absolute -bottom-7 left-0 h-44 w-44 opacity-20 sm:h-56 sm:w-56" aria-hidden="true">
            <div className="goku-aura absolute inset-4 rounded-full bg-primary/30 blur-3xl" />
          </div>
          <img
            src={gokuHero}
            alt="شخصية أنمي متحركة تمثل استوديو النماذج"
            width={768}
            height={768}
            className="goku-float pointer-events-none absolute -bottom-9 left-3 z-10 h-44 w-44 object-contain sm:-bottom-14 sm:left-10 sm:h-60 sm:w-60"
          />
          <div className="pointer-events-none absolute bottom-8 left-12 h-1.5 w-1.5 rounded-full bg-primary goku-spark sm:left-24" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-12 left-28 h-1 w-1 rounded-full bg-primary goku-spark [animation-delay:0.8s] sm:left-40" aria-hidden="true" />
        </section>

        <div className="flex flex-wrap gap-1.5">
          {[
            { k: "config", label: "إعداد النموذج" },
            { k: "data", label: `الداتاست (${assets.length})` },
            { k: "train", label: "تدريب LoRA" },
            { k: "copilot", label: "الكوبايلوت" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as typeof tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition sm:px-3.5 ${
                tab === t.k ? "bg-primary text-primary-foreground shadow-sm" : "border border-border bg-card text-foreground hover:border-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <section className="rounded-xl border border-border bg-card p-3.5 shadow-card sm:p-4 lg:col-span-2">
            {tab === "config" && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="اسم النموذج">
                    <input value={modelName} onChange={(e) => setModelName(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="كلمة التفعيل">
                    <input value={triggerWord} onChange={(e) => setTriggerWord(e.target.value)} className={inputCls} dir="ltr" />
                  </Field>
                </div>
                <Field label="مجال النموذج">
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { k: "manga", l: "مانجا" },
                      { k: "image", l: "صور" },
                      { k: "video", l: "فيديو" },
                    ] as const).map((d) => (
                      <button
                        key={d.k}
                        onClick={() => setDomain(d.k)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold ${domain === d.k ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground"}`}
                      >
                        {d.l}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="النموذج الأساسي مفتوح المصدر">
                  <select value={baseModel} onChange={(e) => setBaseModel(e.target.value)} className={inputCls}>
                    {BASE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </Field>
                <Field label="System Prompt الخاص بالنموذج">
                  <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={4} className={inputCls} />
                  <button onClick={improvePrompt} disabled={thinking} className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-primary/60 px-2.5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 disabled:opacity-50">
                    {thinking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} طوّر الـ Prompt بالذكاء الاصطناعي
                  </button>
                </Field>
                <div className="grid gap-2 sm:grid-cols-4">
                  <Field label="Steps"><input type="number" value={steps} onChange={(e) => setSteps(+e.target.value)} className={inputCls} /></Field>
                  <Field label="Learning rate"><input type="number" step="0.00001" value={learningRate} onChange={(e) => setLearningRate(+e.target.value)} className={inputCls} /></Field>
                  <Field label="LoRA rank"><input type="number" value={rank} onChange={(e) => setRank(+e.target.value)} className={inputCls} /></Field>
                  <Field label="Resolution"><input type="number" value={resolution} onChange={(e) => setResolution(+e.target.value)} className={inputCls} /></Field>
                </div>
                <button onClick={autoTune} disabled={thinking} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-black text-primary-foreground hover:brightness-110 disabled:opacity-50">
                  {thinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} ضبط تلقائي للباراميترات
                </button>
              </div>
            )}

            {tab === "data" && (
              <div className="space-y-3">
                <div onClick={() => fileRef.current?.click()} className="cursor-pointer rounded-xl border-2 border-dashed border-primary/50 p-5 text-center transition hover:bg-primary/5">
                  {uploading ? <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" /> : <ImagePlus className="mx-auto h-7 w-7 text-primary" />}
                  <p className="mt-1.5 text-sm font-bold">ارفع صور أو فيديوهات الداتاست</p>
                  <p className="text-[11px] text-muted-foreground">الرفع الكامل يتم إلى bucket: lora-model</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => onUpload(e.target.files)} />
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {assets.map((a, i) => (
                    <div key={`${a.url}-${i}`} className="group relative overflow-hidden rounded-lg border border-border bg-background">
                      {a.name.match(/\.(mp4|webm|mov|avi)$/i) ? <video src={a.url} className="h-20 w-full object-cover" muted /> : <img src={a.url} alt={a.name} className="h-20 w-full object-cover" loading="lazy" />}
                      <button aria-label={`حذف ${a.name}`} onClick={() => setAssets((p) => p.filter((_, idx) => idx !== i))} className="absolute left-1 top-1 rounded-md bg-destructive p-1 text-destructive-foreground opacity-0 transition group-hover:opacity-100">
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <p className="truncate px-1 py-1 text-[9px] text-muted-foreground">{a.name}</p>
                    </div>
                  ))}
                </div>
                {!assets.length && <p className="text-xs text-muted-foreground">لا توجد ملفات بعد.</p>}
              </div>
            )}

            {tab === "train" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-background p-3 text-xs">
                  <p className="font-bold">ملخص المهمة</p>
                  <pre className="mt-1.5 whitespace-pre-wrap text-[11px] leading-5 text-muted-foreground">{configText}</pre>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={launchTraining} disabled={training} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-black text-primary-foreground hover:brightness-110 disabled:opacity-50">
                    {training ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} {training ? "جارٍ تجهيز النموذج…" : "ابدأ تدريب LoRA"}
                  </button>
                  <button onClick={refreshStatus} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground hover:border-primary">تحديث الحالة</button>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-foreground/5 p-2.5 font-mono text-[10px]" dir="ltr">
                  {jobLog.length ? jobLog.map((l) => <div key={l}>{l}</div>) : <span className="text-muted-foreground">no logs yet…</span>}
                </div>
              </div>
            )}

            {tab === "copilot" && (
              <div className="flex h-[58vh] min-h-[360px] flex-col">
                <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                  {messages.map((m, i) => <div key={i} className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-6 ${m.role === "user" ? "ms-auto bg-primary text-primary-foreground" : "border border-border bg-background text-foreground"}`}>{m.content}</div>)}
                  {thinking && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> الكوبايلوت بيفكر…</div>}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(input)} placeholder="اسأل الكوبايلوت عن النموذج…" className={inputCls} />
                  <button aria-label="إرسال الرسالة" onClick={() => ask(input)} disabled={thinking} className="rounded-lg bg-primary px-3 text-primary-foreground disabled:opacity-50"><Send className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-3">
            <div className="rounded-xl border border-primary/40 bg-card p-3.5">
              <div className="flex items-center gap-1.5 text-sm font-black text-primary"><Bot className="h-4 w-4" /> مساعد سريع</div>
              <div className="mt-2 space-y-1.5">
                {["اكتب لي System Prompt احترافي لنموذج مانجا أبيض وأسود", "إزاي أخلي ردود النموذج أقوى وأدق؟", "اقترح داتاست مثالي لتدريب أسلوب أنمي", "اكتب كود inference للنموذج بعد التدريب"].map((q) => <button key={q} onClick={() => { setTab("copilot"); ask(q); }} className="w-full rounded-lg border border-border bg-background p-2.5 text-right text-[11px] font-bold leading-5 text-foreground hover:border-primary">{q}</button>)}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3.5 text-[11px] leading-5 text-muted-foreground">
              التدريب يعمل على GPU الخاص بحساب Kaggle المربوط بالموقع. يمكنك متابعة حالة النموذج من تبويب تدريب LoRA.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
