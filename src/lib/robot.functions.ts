import { createServerFn } from "@tanstack/react-start";

type Msg = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM = `أنت "مساعد الروبوت" في موقع أنمي فورج. المستخدم يتحكم في روبوت متصل بلوحة ESP32 عبر الواي فاي.
مهامك:
1. اشرح حالة الروبوت (الاتصال، آخر أمر، السرعة، الكاميرا) بلغة بسيطة.
2. أجب على الأسئلة البسيطة عن التحكم، الأسلاك، أكواد ESP32، ومشاكل الاتصال.
3. لو المستخدم كتب بلغة معينة، رد بنفس اللغة (عربي/إنجليزي/فرنسي/إسباني/ألماني/تركي...).
اكتب ردود قصيرة وعملية.`;

export const robotAssistant = createServerFn({ method: "POST" })
  .inputValidator((d: { messages: Msg[]; state?: string; lang?: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("خدمة الذكاء الاصطناعي غير مهيأة حالياً");

    const messages: Msg[] = [
      {
        role: "system",
        content:
          SYSTEM +
          (data.state ? `\n\nحالة الروبوت الحالية:\n${data.state}` : "") +
          (data.lang ? `\n\nلغة واجهة المستخدم: ${data.lang}` : ""),
      },
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
