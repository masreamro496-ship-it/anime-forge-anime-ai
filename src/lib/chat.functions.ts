import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_WORDS = 1000;

const sendChatSchema = z.object({
  message: z.string().trim().min(1).max(8000),
  imageDataUrl: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      }),
    )
    .max(40)
    .default([]),
});

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => sendChatSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Word-count gate (Arabic + Latin friendly)
    const words = data.message.trim().split(/\s+/).filter(Boolean);
    if (words.length > MAX_WORDS) {
      return {
        ok: false as const,
        error: "يرجى تقسيم النص لمعالجة أدق.",
      };
    }

    // Image-type gate (reject video/audio data URLs upfront)
    if (data.imageDataUrl) {
      if (!data.imageDataUrl.startsWith("data:image/")) {
        return {
          ok: false as const,
          error: "عذراً، هذا الموقع مخصص للصور والأكواد فقط.",
        };
      }
    }

    // Credit gateway — RPC throws if balance < 5
    const { error: spendErr } = await supabase.rpc("spend_chat_credits");
    if (spendErr) {
      const msg = spendErr.message.includes("insufficient")
        ? "رصيد الكريدت غير كافٍ. يرجى الشحن."
        : spendErr.message;
      return { ok: false as const, error: msg };
    }

    // Persist user message
    await supabase.from("chat_messages").insert({
      user_id: userId,
      role: "user",
      content: data.message,
      image_url: data.imageDataUrl ? "[inline-image]" : null,
    });

    // Call Groq
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "GROQ_API_KEY غير مُهيّأ" };
    }

    const userContent: Array<Record<string, unknown>> = [
      { type: "text", text: data.message },
    ];
    if (data.imageDataUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: data.imageDataUrl },
      });
    }

    const model = data.imageDataUrl
      ? "meta-llama/llama-4-scout-17b-16e-instruct"
      : "llama-3.3-70b-versatile";

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are the Ultimate Coding Architect. Reply in the user's language (Arabic if they write Arabic). For non-code images, reply exactly: 'هذه صورة ليست برمجية'. Be precise, complete, and wrap risky code in try/catch.",
            },
            ...data.history.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: data.imageDataUrl ? userContent : data.message },
          ],
          max_tokens: 4096,
          temperature: 0.4,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        return {
          ok: false as const,
          error: `Groq API error [${res.status}]: ${body.slice(0, 200)}`,
        };
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = json.choices?.[0]?.message?.content ?? "";

      await supabase.from("chat_messages").insert({
        user_id: userId,
        role: "assistant",
        content: reply,
      });

      return { ok: true as const, reply };
    } catch (err) {
      return {
        ok: false as const,
        error: (err as Error).message || "فشل الاتصال بالخدمة",
      };
    }
  });

export const loadChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);
    return { messages: data ?? [] };
  });

export const clearChatHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("chat_messages").delete().eq("user_id", userId);
    return { ok: true };
  });
