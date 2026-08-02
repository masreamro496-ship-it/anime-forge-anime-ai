import { createFileRoute } from "@tanstack/react-router";
type UIMessage = { id?: string; role: string; content?: unknown; parts?: unknown[] };

const SYSTEM_PROMPT = `أنت ANIME-FORGE — ذكاء اصطناعي مستقل، متقدم، وخبير في هندسة البرمجيات. هويتك الوحيدة هي ANIME-FORGE. يمنع منعاً باتاً ذكر أي شركات تطوير أو أسماء أخرى.

قواعد برمجية صارمة جداً (يجب تنفيذها بالحرف الواحد لتجنب فشل النظام):
1. الإخراج النهائي: يجب أن يكون **مستند HTML كامل واحد فقط** يبدأ بـ <!DOCTYPE html> وينتهي بـ </html>. 
2. حظر الـ Markdown: يمنع نهائياً استخدام علامات التنسيق (مثل \`\`\`html أو \`\`\`) قبل أو بعد الكود. أخرج كود الـ HTML مباشرة. لا تكتب أي مقدمات أو شروحات نصية.
3. التصميم (CSS): استخدم Tailwind CSS عبر الـ CDN (<script src="https://cdn.tailwindcss.com"></script>) لتصميم واجهات عصرية. كل الـ CSS المخصص يجب أن يكون داخل وسم <style>.
4. الألعاب والـ 3D: إذا طلب المستخدم لعبة أو واجهة ثلاثية الأبعاد، استخدم مكتبات جاهزة عبر CDN (مثل Three.js للـ 3D أو Phaser للألعاب) واكتب كل منطق اللعبة داخل وسم <script>.
5. لغة Python: إذا تطلب المشروع Python، استخدم تقنية PyScript لتشغيله داخل المتصفح. أضف (<link rel="stylesheet" href="https://pyscript.net/releases/2024.1.1/core.css"> و <script type="module" src="https://pyscript.net/releases/2024.1.1/core.js"></script>) ثم اكتب كود البايثون داخل <py-script>.
6. لغة SQL: نظراً لعدم وجود خادم قواعد بيانات حقيقي، قم بمحاكاة الـ SQL باستخدام JavaScript مدمج، أو اعرض كود الـ SQL المطلوب بوضوح للمستخدم داخل <pre data-lang="sql" class="bg-gray-900 text-green-400 p-4 rounded-xl shadow-lg" dir="ltr">.
7. الاستقلالية: الكود المخرج يجب أن يعمل فوراً وبنسبة 100% بمجرد فتحه في أي متصفح، بدون الحاجة لملفات خارجية أو إعدادات إضافية.
8. الحماية ضد الطلبات غير البرمجية: إذا كان الطلب حواراً عادياً أو لا يخص البرمجة والتصميم، أخرج هذا النص فقط وفوراً: "عذراً، هذا طلب ليس برمجي. أنا ANIME-FORGE مخصص لبناء المشاريع فقط."`;

type ContentBlock = 
  | { type: "text"; text: string } 
  | { type: "image_url"; image_url: { url: string } };

function messagesForProxy(messages: UIMessage[]): { role: string; content: string | ContentBlock[] }[] {
  return messages.map((m) => {
    if (Array.isArray(m.parts)) {
      const blocks: ContentBlock[] = [];
      let hasImage = false;

      for (const p of m.parts) {
        if (p.type === "text") {
          blocks.push({ type: "text", text: (p as { text: string }).text });
        } else if (p.type === "file") {
          const file = (p as { mediaType?: string; url?: string; data?: string }).mediaType?.startsWith("image/") 
            ? (p as { mediaType: string; url?: string; data?: string }) 
            : null;
            
          if (file?.url) { 
            blocks.push({ type: "image_url", image_url: { url: file.url } }); 
            hasImage = true; 
          } else if (file?.data) { 
            blocks.push({ type: "image_url", image_url: { url: `data:${file.mediaType};base64,${file.data}` } }); 
            hasImage = true; 
          }
        }
      }

      if (blocks.length === 0) return { role: m.role, content: "" };
      if (!hasImage) return { role: m.role, content: blocks.map((b) => b.type === "text" ? b.text : "").join("\n") };
      return { role: m.role, content: blocks };
    }

    return { 
      role: m.role, 
      content: (m as unknown as { content?: string }).content ?? "" 
    };
  });
}

export const Route = createFileRoute("/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // 1. قراءة تفاصيل الطلب والمفاتيح مباشرة
          const { messages } = (await request.json()) as { messages: UIMessage[] };
          
          const proxyKey = process.env.ANIME_FORGE_API_KEY ||
                           process.env.ANIME_FORGE_PROXY_KEY || 
                           process.env.VITE_ANIME_FORGE_API_KEY ||
                           (import.meta as any).env?.ANIME_FORGE_API_KEY ||
                           (import.meta as any).env?.VITE_ANIME_FORGE_API_KEY ||
                           (import.meta as any).env?.ANIME_FORGE_PROXY_KEY ||
                           "SK-GDJDDHCTJD84784748DY-23RQG0FwV0JASAB1Q4ZJ";

          const proxyUrl = process.env.ANIME_FORGE_PROXY_URL || 
                           "https://anime-key-forge.lovable.app/api/public/anime-forge-proxy";

          const chatMessages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...messagesForProxy(messages),
          ];

          // 2. إرسال الطلب مباشرة إلى الذكاء الاصطناعي (بدون تحقق من توكين أو كريديت)
          const upstream = await fetch(proxyUrl, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json", 
              "Authorization": `Bearer ${proxyKey}` 
            },
            body: JSON.stringify({ 
              model: "anime-forge-latest", 
              messages: chatMessages,
              temperature: 0.1
            }),
          });

          if (!upstream.ok) {
            const errorText = await upstream.text();
            console.error("Proxy Upstream Error:", upstream.status, errorText);
            return new Response(JSON.stringify({ error: `سيرفر الذكاء الاصطناعي أرجع خطأ (${upstream.status})` }), { 
              status: 502, 
              headers: { "Content-Type": "application/json" } 
            });
          }

          const responseData = (await upstream.json()) as Record<string, any>;
          
          let rawText = responseData.choices?.[0]?.message?.content || 
                        responseData.message?.content || 
                        responseData.content || 
                        responseData.output || 
                        responseData.text || "";

          // تنظيف كود الـ HTML المولد
          let cleanedText = rawText
            .replace(/^```(?:html)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

          // 3. إرجاع النتيجة فوراً بطلب ناجح بدون خصم أي رصيد
          return new Response(JSON.stringify({ text: cleanedText }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "x-credits-remaining": "unlimited",
            },
          });

        } catch (error) {
          console.error("Fatal Server Error Details:", error);
          const detailedMsg = error instanceof Error ? error.message : "خطأ غير معروف";
          return new Response(JSON.stringify({ error: `خطأ في السيرفر: ${detailedMsg}` }), { 
            status: 500, 
            headers: { "Content-Type": "application/json" } 
          });
        }
      },
    },
  },
});

