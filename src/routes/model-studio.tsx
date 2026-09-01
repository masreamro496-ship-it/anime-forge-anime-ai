import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Bot, Cpu, ImagePlus, Loader2, Play, Send, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { uploadUserFile, signedUrl } from "@/lib/storage";
import { copilotChat, getTrainingStatus, startLoraTraining } from "@/lib/model-studio.functions";

export const Route = createFileRoute("/lora-models")({
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
  const [baseModel, setBaseModel] = useState(BASE_MODELS[2]!.id);
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
      const next: Asset[] = [];
      for (const file of Array.from(files)) {
        const path = await uploadUserFile("lora-models", user.id, file, "lora-");
        const url = await signedUrl("lora-models", path, 60 * 60 * 24 * 7);
        next.push({ name: file.name, url });
      }
      setAssets((p) => [...p, ...next]);
      toast.success(`تم رفع ${next.length} ملف ✅`);
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <span className="text-base font-black text-primary">استوديو النماذج المخصصة</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-black">ابنِ نموذج ذكاء اصطناعي خاص بك</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ارفع بياناتك، اختر نموذجاً مفتوح المصدر، برمجه مع الكوبايلوت، ثم درّبه بتقنية LoRA على GPU الخاص بـ Kaggle.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { k: "config", label: "إعداد النموذج" },
            { k: "data", label: `الداتاست (${assets.length})` },
            { k: "train", label: "تدريب LoRA" },
            { k: "copilot", label: "الكوبايلوت 🤖" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as typeof tab)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                tab === t.k ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground hover:border-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-card">
            {tab === "config" && (
              <div className="space-y-4">
                <Field label="اسم النموذج">
                  <input value={modelName} onChange={(e) => setModelName(e.target.value)} className={inputCls} />
                </Field>
                <Field label="كلمة التفعيل (Trigger word)">
                  <input value={triggerWord} onChange={(e) => setTriggerWord(e.target.value)} className={inputCls} dir="ltr" />
                </Field>
                <Field label="مجال النموذج">
                  <div className="flex gap-2">
                    {([
                      { k: "manga", l: "مانجا 📖" },
                      { k: "image", l: "صور 🖼️" },
                      { k: "video", l: "فيديو 🎬" },
                    ] as const).map((d) => (
                      <button
                        key={d.k}
                        onClick={() => setDomain(d.k)}
                        className={`rounded-lg px-4 py-2 text-sm font-bold ${
                          domain === d.k ? "bg-primary text-primary-foreground" : "border border-border bg-background"
                        }`}
                      >
                        {d.l}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="النموذج الأساسي مفتوح المصدر">
                  <select value={baseModel} onChange={(e) => setBaseModel(e.target.value)} className={inputCls}>
                    {BASE_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="System Prompt الخاص بالنموذج">
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={5}
                    className={inputCls}
                  />
                  <button
                    onClick={improvePrompt}
                    disabled={thinking}
                    className="mt-2 inline-flex items-center gap-2 rounded-lg border border-primary/60 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    {thinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} طوّر الـ Prompt بالذكاء الاصطناعي
                  </button>
                </Field>

                <div className="grid gap-3 sm:grid-cols-4">
                  <Field label="Steps">
                    <input type="number" value={steps} onChange={(e) => setSteps(+e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Learning rate">
                    <input type="number" step="0.00001" value={learningRate} onChange={(e) => setLearningRate(+e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="LoRA rank">
                    <input type="number" value={rank} onChange={(e) => setRank(+e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Resolution">
                    <input type="number" value={resolution} onChange={(e) => setResolution(+e.target.value)} className={inputCls} />
                  </Field>
                </div>

                <button
                  onClick={autoTune}
                  disabled={thinking}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground hover:brightness-110 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" /> ضبط تلقائي للباراميترات
                </button>
              </div>
            )}

            {tab === "data" && (
              <div className="space-y-4">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-primary/50 p-8 text-center transition hover:bg-primary/5"
                >
                  {uploading ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <ImagePlus className="mx-auto h-8 w-8 text-primary" />
                  )}
                  <p className="mt-2 font-bold">ارفع صور أو فيديوهات الداتاست</p>
                  <p className="text-xs text-muted-foreground">يُفضّل من 10 إلى 40 صورة واضحة لنفس الشخصية/الأسلوب</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  hidden
                  onChange={(e) => onUpload(e.target.files)}
                />

                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {assets.map((a, i) => (
                    <div key={a.url} className="group relative overflow-hidden rounded-xl border border-border">
                      <img src={a.url} alt={a.name} className="h-24 w-full object-cover" loading="lazy" />
                      <button
                        onClick={() => setAssets((p) => p.filter((_, idx) => idx !== i))}
                        className="absolute left-1 top-1 rounded-md bg-destructive p-1 text-destructive-foreground opacity-0 transition group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {!assets.length && <p className="text-sm text-muted-foreground">لا توجد ملفات بعد.</p>}
              </div>
            )}

            {tab === "train" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-background p-4 text-sm">
                  <p className="font-bold">ملخص المهمة</p>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{configText}</pre>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={launchTraining}
                    disabled={training}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground hover:brightness-110 disabled:opacity-50"
                  >
                    {training ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} ابدأ تدريب LoRA على GPU
                  </button>
                  <button onClick={refreshStatus} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary">
                    تحديث الحالة
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-black/40 p-3 font-mono text-xs" dir="ltr">
                  {jobLog.length ? jobLog.map((l) => <div key={l}>{l}</div>) : <span className="text-muted-foreground">no logs yet…</span>}
                </div>
              </div>
            )}

            {tab === "copilot" && (
              <div className="flex h-[70vh] flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 ${
                        m.role === "user" ? "ms-auto bg-primary text-primary-foreground" : "border border-border bg-background"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                  {thinking && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> الكوبايلوت بيفكر…
                    </div>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && ask(input)}
                    placeholder="اسأل الكوبايلوت: حسّن ردود نموذجي، اكتب كود التدريب، اضبط الباراميترات…"
                    className={inputCls}
                  />
                  <button
                    onClick={() => ask(input)}
                    disabled={thinking}
                    className="rounded-xl bg-primary px-4 text-primary-foreground disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-3">
            <div className="rounded-2xl border border-primary/40 bg-card p-5">
              <div className="flex items-center gap-2 font-black text-primary">
                <Bot className="h-5 w-5" /> مساعد سريع
              </div>
              <div className="mt-3 space-y-2">
                {[
                  "اكتب لي System Prompt احترافي لنموذج مانجا أبيض وأسود",
                  "إزاي أخلي ردود النموذج أقوى وأدق؟",
                  "اقترح داتاست مثالي لتدريب أسلوب أنمي",
                  "اكتب كود inference للنموذج بعد التدريب",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setTab("copilot");
                      ask(q);
                    }}
                    className="w-full rounded-xl border border-border bg-background p-3 text-right text-xs font-bold hover:border-primary"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 text-xs leading-6 text-muted-foreground">
              التدريب يعمل على GPU الخاص بحساب Kaggle المربوط بالموقع. مدة المهمة تعتمد على عدد الـ steps وحجم الداتاست
              (عادة من 20 إلى 90 دقيقة). تقدر تتابع الحالة من تبويب «تدريب LoRA».
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
