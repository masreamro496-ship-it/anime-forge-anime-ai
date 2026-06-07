import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SubmitInput = {
  prompt: string;
  startImagePath: string; // path inside gen-inputs (private) — we'll sign a URL
  endImagePath: string;
  startImageBucket?: string;
  endImageBucket?: string;
  durationSeconds: number;
};

type SubmitResult = {
  requestId: string;
  status: "processing" | "failed";
  message: string;
  taskId?: string;
};

const NOVITA_ENDPOINT = "https://api.novita.ai/v3/async/seedance-v1.5-pro-i2v";

export const submitNovitaVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SubmitInput) => {
    if (!input || typeof input !== "object") throw new Error("invalid input");
    if (!input.prompt || input.prompt.trim().length < 5) throw new Error("prompt too short");
    if (input.prompt.length > 4000) throw new Error("prompt too long");
    if (!input.startImagePath) throw new Error("startImagePath required");
    if (!input.endImagePath) throw new Error("endImagePath required");
    const d = Number(input.durationSeconds);
    if (!Number.isFinite(d) || d < 1 || d > 15) throw new Error("invalid duration");
    return {
      prompt: input.prompt.trim(),
      startImagePath: String(input.startImagePath),
      endImagePath: String(input.endImagePath),
      startImageBucket: input.startImageBucket || "gen-inputs",
      endImageBucket: input.endImageBucket || "gen-inputs",
      durationSeconds: Math.round(d),
    };
  })
  .handler(async ({ data, context }): Promise<SubmitResult> => {
    const { supabase } = context;
    const apiKey = process.env.NOVITA_API_KEY;

    // Best-effort: get a signed URL for the start image (Novita needs a public URL)
    let imageUrl: string | undefined;
    try {
      const { data: signed } = await supabase.storage
        .from(data.startImageBucket)
        .createSignedUrl(data.startImagePath, 60 * 60 * 24 * 2); // 48h
      imageUrl = signed?.signedUrl;
    } catch {
      imageUrl = undefined;
    }

    // Map duration to Novita allowed values (5 or 10 commonly; clamp)
    const novitaDuration = data.durationSeconds <= 5 ? 5 : data.durationSeconds <= 8 ? 8 : 10;

    let status: "processing" | "failed" = "failed";
    let taskId: string | undefined;
    let adminNotes = "";

    if (!apiKey) {
      adminNotes = "NOVITA_API_KEY غير مُهيّأ على الخادم";
    } else if (!imageUrl) {
      adminNotes = "تعذّر إنشاء رابط موقّع لصورة البداية";
    } else {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30_000);
        const resp = await fetch(NOVITA_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            fps: 24,
            seed: 42,
            image: imageUrl,
            ratio: "adaptive",
            prompt: data.prompt,
            duration: novitaDuration,
            watermark: false,
            resolution: "720p",
            camera_fixed: false,
            service_tier: "default",
            generate_audio: true,
            execution_expires_after: 172800,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        const text = await resp.text();
        if (!resp.ok) {
          adminNotes = `Novita HTTP ${resp.status}: ${text.slice(0, 500)}`;
        } else {
          try {
            const json = JSON.parse(text);
            taskId = json?.task_id || json?.task?.task_id || json?.id;
            if (taskId) {
              status = "processing";
            } else {
              adminNotes = `Novita: response without task_id — ${text.slice(0, 300)}`;
            }
          } catch {
            adminNotes = `Novita: invalid JSON — ${text.slice(0, 300)}`;
          }
        }
      } catch (err) {
        adminNotes = `Novita fetch error: ${(err as Error).message}`;
      }
    }

    const { data: rid, error } = await supabase.rpc("submit_novita_video", {
      _prompt: data.prompt,
      _start_image: data.startImagePath,
      _end_image: data.endImagePath,
      _duration: data.durationSeconds,
      _provider_task_id: taskId ?? null,
      _status: status,
      _admin_notes: adminNotes || null,
    });
    if (error) throw new Error(error.message);

    return {
      requestId: String(rid),
      status,
      taskId,
      message:
        status === "processing"
          ? "جار العمل — سيتم تجهيز الفيديو خلال دقائق"
          : "جار العمل — تم استلام طلبك وسيراجعه الأدمن",
    };
  });
