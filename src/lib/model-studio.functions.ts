import { createServerFn } from "@tanstack/react-start";

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

const COPILOT_SYSTEM = `أنت "كوبايلوت أنمي فورج" — مساعد خبير في بناء وتدريب نماذج الذكاء الاصطناعي مفتوحة المصدر (Stable Diffusion / SDXL / Flux / AnimateDiff / LoRA).
مهامك:
1. مساعدة المستخدم في كتابة وتحسين الـ System Prompt الخاص بنموذجه.
2. ضبط الباراميترات تلقائياً (learning rate, steps, rank, batch size, resolution) واقتراح أفضل القيم حسب نوع البيانات (مانجا / صور / فيديو).
3. تحسين جودة وكفاءة ردود النموذج واقتراح تحسينات على الداتاست.
4. كتابة أكواد التدريب أو الاستدلال عند الطلب.
اكتب بالعربية بأسلوب عملي ومختصر، واستخدم نقاط وعناوين. عند اقتراح باراميترات اعرضها في جدول أو قائمة واضحة.`;

/** مساعد ذكي داخل استوديو النماذج */
export const copilotChat = createServerFn({ method: "POST" })
  .inputValidator((d: { messages: ChatMsg[]; context?: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("خدمة الذكاء الاصطناعي غير مهيأة حالياً");

    const messages: ChatMsg[] = [
      { role: "system", content: COPILOT_SYSTEM + (data.context ? `\n\nإعدادات النموذج الحالية:\n${data.context}` : "") },
      ...data.messages.slice(-14),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({ model: "google/gemini-3.7-flash", messages }),
    });

    if (res.status === 429) throw new Error("الطلبات كثيرة جداً، جرّب بعد قليل.");
    if (res.status === 402) throw new Error("رصيد الذكاء الاصطناعي انتهى، برجاء شحن الرصيد.");
    if (!res.ok) throw new Error(`فشل الاتصال بالذكاء الاصطناعي (${res.status})`);

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { text: json.choices?.[0]?.message?.content ?? "" };
  });

type TrainInput = {
  modelName: string;
  baseModel: string;
  domain: "manga" | "image" | "video";
  steps: number;
  learningRate: number;
  rank: number;
  resolution: number;
  datasetUrls: string[];
  triggerWord: string;
  systemPrompt?: string;
};

function kaggleAuthHeaders(slug: string) {
  const token = process.env["KAGGLE_API_TOKEN"] ?? "";
  const username = process.env["KAGGLE_USERNAME"] ?? slug.split("/")[0] ?? "";
  const basic = Buffer.from(`${username}:${token}`).toString("base64");
  return {
    "Content-Type": "application/json",
    Authorization: token.startsWith("KGAT_") ? `Bearer ${token}` : `Basic ${basic}`,
    "X-Kaggle-Auth": `Basic ${basic}`,
  };
}

function buildNotebook(input: TrainInput) {
  const cfg = JSON.stringify(
    {
      model_name: input.modelName,
      base_model: input.baseModel,
      domain: input.domain,
      trigger_word: input.triggerWord,
      steps: input.steps,
      learning_rate: input.learningRate,
      lora_rank: input.rank,
      resolution: input.resolution,
      dataset_urls: input.datasetUrls,
      system_prompt: input.systemPrompt ?? "",
    },
    null,
    2,
  );

  return `# Anime Forge — LoRA fine-tuning job (auto-generated)
import json, os, subprocess, urllib.request

CONFIG = json.loads(r'''${cfg}''')
print("Anime Forge LoRA job:", CONFIG["model_name"])

os.makedirs("/kaggle/working/dataset", exist_ok=True)
for i, url in enumerate(CONFIG["dataset_urls"]):
    try:
        ext = url.split("?")[0].split(".")[-1][:4] or "jpg"
        urllib.request.urlretrieve(url, f"/kaggle/working/dataset/{i:04d}.{ext}")
    except Exception as e:
        print("skip", url, e)

subprocess.run(["pip", "-q", "install", "diffusers[training]", "peft", "accelerate", "transformers", "safetensors"], check=False)

cmd = [
    "accelerate", "launch", "-m", "diffusers_lora_train",
    "--pretrained_model_name_or_path", CONFIG["base_model"],
    "--instance_data_dir", "/kaggle/working/dataset",
    "--instance_prompt", f"a photo of {CONFIG['trigger_word']}",
    "--resolution", str(CONFIG["resolution"]),
    "--max_train_steps", str(CONFIG["steps"]),
    "--learning_rate", str(CONFIG["learning_rate"]),
    "--rank", str(CONFIG["lora_rank"]),
    "--output_dir", "/kaggle/working/lora_out",
]
print("running:", " ".join(cmd))
subprocess.run(cmd, check=False)
print("done")
`;
}

/** إطلاق مهمة تدريب LoRA على GPU الخاص بـ Kaggle */
export const startLoraTraining = createServerFn({ method: "POST" })
  .inputValidator((d: TrainInput) => d)
  .handler(async ({ data }) => {
    const slug = process.env["KAGGLE_NOTEBOOK_SLUG"];
    const token = process.env["KAGGLE_API_TOKEN"];
    if (!slug || !token) {
      return { ok: false as const, status: "unconfigured", message: "بيانات Kaggle غير موجودة في إعدادات السيرفر." };
    }
    if (!data.datasetUrls.length) {
      return { ok: false as const, status: "no_data", message: "ارفع صور/فيديوهات الداتاست أولاً." };
    }

    const body = {
      id: undefined,
      slug,
      newTitle: `AF LoRA — ${data.modelName}`.slice(0, 60),
      text: buildNotebook(data),
      language: "python",
      kernelType: "script",
      isPrivate: true,
      enableGpu: true,
      enableInternet: true,
      datasetDataSources: [],
      competitionDataSources: [],
      kernelDataSources: [],
      categoryIds: [],
    };

    try {
      const res = await fetch("https://www.kaggle.com/api/v1/kernels/push", {
        method: "POST",
        headers: kaggleAuthHeaders(slug),
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) {
        return { ok: false as const, status: "kaggle_error", message: `Kaggle رفض الطلب (${res.status})`, detail: text.slice(0, 300) };
      }
      let ref = slug;
      try {
        const j = JSON.parse(text) as { ref?: string; url?: string };
        ref = j.ref ?? j.url ?? slug;
      } catch {
        /* ignore */
      }
      return { ok: true as const, status: "queued", ref, url: `https://www.kaggle.com/${slug}` };
    } catch (e) {
      return { ok: false as const, status: "network", message: e instanceof Error ? e.message : "فشل الاتصال بـ Kaggle" };
    }
  });

/** متابعة حالة التدريب على Kaggle */
export const getTrainingStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { slug?: string }) => d)
  .handler(async ({ data }) => {
    const slug = data.slug || process.env["KAGGLE_NOTEBOOK_SLUG"];
    if (!slug) return { status: "unknown", message: "لا يوجد notebook مرتبط" };
    const [userName, kernelSlug] = slug.split("/");
    try {
      const res = await fetch(
        `https://www.kaggle.com/api/v1/kernels/status?userName=${encodeURIComponent(userName ?? "")}&kernelSlug=${encodeURIComponent(kernelSlug ?? "")}`,
        { headers: kaggleAuthHeaders(slug) },
      );
      const text = await res.text();
      if (!res.ok) return { status: "error", message: `(${res.status})`, detail: text.slice(0, 200) };
      const j = JSON.parse(text) as { status?: string; failureMessage?: string };
      return { status: j.status ?? "unknown", message: j.failureMessage ?? "" };
    } catch (e) {
      return { status: "error", message: e instanceof Error ? e.message : "خطأ" };
    }
  });
