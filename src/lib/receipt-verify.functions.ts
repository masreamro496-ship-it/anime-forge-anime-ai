import { createServerFn } from "@tanstack/react-start";

export type ReceiptVerdict = {
  contains_number: boolean;
  found_number: string;
  op_number: string;
  amount: string;
  is_ai_generated: boolean;
  authenticity_confidence: number;
  reason: string;
};

const PROMPT = `أنت مدقق إيصالات فودافون كاش لموقع أنمي فورج. افحص صورة الإيصال بدقة وأجب بـ JSON فقط بدون أي شرح إضافي بالشكل:
{"contains_number":true/false,"found_number":"","op_number":"","amount":"","is_ai_generated":true/false,"authenticity_confidence":0-100,"reason":""}

القواعد:
- contains_number = true فقط لو الرقم 01080390782 ظاهر فعلاً داخل الصورة كرقم المستلم/المحوَّل إليه.
- found_number = الرقم اللي لقيته في الإيصال.
- op_number = رقم العملية / المرجع لو ظاهر.
- amount = المبلغ المحوَّل لو ظاهر.
- is_ai_generated = true لو الصورة مولّدة بالذكاء الاصطناعي أو معدّلة/فوتوشوب (خطوط غير متسقة، حروف مشوهة، ظلال غير طبيعية، بكسلات غريبة حول الأرقام).
- authenticity_confidence = نسبة ثقتك أن الإيصال حقيقي وغير معدّل.
- reason = سبب مختصر بالعربية.`;

export const verifyReceipt = createServerFn({ method: "POST" })
  .inputValidator((d: { imageDataUrl: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("خدمة الفحص الذكي غير مهيأة حالياً");
    if (!data.imageDataUrl?.startsWith("data:image/")) throw new Error("صورة الإيصال غير صالحة");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("الطلبات كثيرة جداً، جرّب بعد قليل.");
    if (res.status === 402) throw new Error("رصيد الفحص الذكي انتهى، تواصل مع الإدارة.");
    if (!res.ok) throw new Error(`فشل فحص الإيصال (${res.status})`);

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("تعذّر قراءة نتيجة الفحص، حاول بصورة أوضح");

    const parsed = JSON.parse(match[0]) as Partial<ReceiptVerdict>;
    const verdict: ReceiptVerdict = {
      contains_number: !!parsed.contains_number,
      found_number: String(parsed.found_number ?? ""),
      op_number: String(parsed.op_number ?? ""),
      amount: String(parsed.amount ?? ""),
      is_ai_generated: !!parsed.is_ai_generated,
      authenticity_confidence: Number(parsed.authenticity_confidence ?? 0),
      reason: String(parsed.reason ?? ""),
    };
    const approved = verdict.contains_number && !verdict.is_ai_generated && verdict.authenticity_confidence >= 60;
    return { verdict, approved };
  });
