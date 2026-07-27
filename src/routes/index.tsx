import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execPromise = util.promisify(exec);
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // تكبير الحجم لاستقبال طلبات ضخمة

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ANIME_FORGE_KEY = process.env.ANIME_FORGE_API_KEY;
const API_URL = "https://anime-key-forge.lovable.app/api/public/anime-forge-proxy";

/**
 * دالة الاتصال الحقيقي وتوجيه الذكاء الاصطناعي لمشاريع React/3D الضخمة
 */
async function callAI(userRequest: string) {
    const systemPrompt = `
    أنت مهندس برمجيات ومهندس ألعاب 3D محترف. أنت تعمل كالمحرك الأساسي لمنصة برمجة ذكية.
    
    مهمتك: بناء مشاريع ويب كاملة وألعاب 3D معقدة تعتمد على بيئة React و Vite.
    
    التقنيات الإجبارية المتاحة لك:
    - React 18, TypeScript, Vite
    - Tailwind CSS لتصميم الواجهات
    - Three.js, @react-three/fiber, @react-three/drei (لإنشاء بيئات وألعاب 3D)
    - @react-three/rapier (لمحرك الفيزياء في الألعاب)
    - lucide-react (للأيقونات)
    
    شروط كتابة الكود:
    1. اكتب كوداً نظيفاً، مقسماً إلى مكونات (Components) داخل مجلد 'src/components'.
    2. استخدم TypeScript بشكل صارم (Interfaces & Types).
    3. إذا طلب المستخدم لعبة 3D، قم ببناء المشهد بالكامل باستخدام Canvas و fiber.
    
    مهم جداً: يجب أن تكون إجابتك عبارة عن نص JSON نقي فقط يمثل شجرة ملفات المشروع (File Tree)، ويجب أن يحتوي على ملف package.json صحيح:
    {
      "files": {
        "package.json": "يجب أن يحتوي على جميع المكتبات المذكورة",
        "vite.config.ts": "إعدادات vite مع plugin react",
        "index.html": "ملف الـ HTML الأساسي بمجلد الروت",
        "src/main.tsx": "نقطة إدخال React",
        "src/App.tsx": "المكون الرئيسي",
        "src/index.css": "استيراد Tailwind",
        "src/components/GameScene.tsx": "مثال لمكون في حال كانت اللعبة 3D"
      },
      "ai_message": "شرح تفصيلي للمستخدم باللغة العربية: ماذا برمجت، كيف تعمل الآليات (مثل محرك الفيزياء أو الواجهات)، وكيف يمكنه التفاعل مع النتيجة."
    }
    
    تحذير: لا تقم بإضافة أي نصوص أو Markdown خارج كائن الـ JSON.
    `;

    console.log("جاري توليد المشروع المعقد وبناء الملفات...");

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANIME_FORGE_KEY}`
        },
        body: JSON.stringify({
            model: "anime-forge-latest",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userRequest }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`فشل الاتصال: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content;

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("لم يرجع الذكاء الاصطناعي استجابة بصيغة JSON صالحة.");
    }

    return JSON.parse(jsonMatch[0]);
}

/**
 * الـ Endpoint المخصص للمشاريع الضخمة وبناء الألعاب
 */
app.post('/api/publish-to-cloudflare', async (req: Request, res: Response): Promise<void> => {
    try {
        const { prompt, projectName = `app-${Date.now()}` } = req.body;

        if (!prompt) {
            res.status(400).json({ error: "الرجاء إرسال تفاصيل المشروع." });
            return;
        }

        // 1. استلام شجرة الملفات من الذكاء الاصطناعي
        const aiResult = await callAI(prompt);
        
        const buildDir = path.join(__dirname, 'temp_builds', projectName);
        await fs.mkdir(buildDir, { recursive: true });

        // 2. كتابة المشروع الكامل بالملفات والمجلدات الفرعية
        for (const [filename, content] of Object.entries(aiResult.files)) {
            const filePath = path.join(buildDir, filename);
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, content as string);
        }
        console.log(`تم إنشاء بنية المشروع في: ${buildDir}`);

        // 3. بناء المشروع الفعلي (Build Step) استعداداً للرفع
        console.log("جاري تثبيت الحزم (npm install) وبناء المشروع (npm run build)... قد يستغرق هذا بعض الوقت للمشاريع الكبيرة.");
        
        // تشغيل التثبيت والبناء داخل مجلد المشروع
        await execPromise(`npm install && npm run build`, { cwd: buildDir });

        console.log("اكتمل بناء المشروع. جاري الرفع إلى Cloudflare Pages...");
        
        // 4. الرفع إلى Cloudflare (نرفع مجلد dist الذي ينتجه Vite)
        const env = {
            ...process.env,
            CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT_ID,
            CLOUDFLARE_API_TOKEN: CF_API_TOKEN,
        };

        const safeProjectName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        
        // لاحظ تغيير المسار إلى buildDir/dist
        const deployCommand = `npx wrangler pages deploy "${path.join(buildDir, 'dist')}" --project-name="${safeProjectName}" --branch="main" --commit-dirty=true`;

        const { stdout } = await execPromise(deployCommand, { env });

        const urlMatch = stdout.match(/https:\/\/[a-zA-Z0-9-]+\.pages\.dev/);
        const deployUrl = urlMatch ? urlMatch[0] : `https://${safeProjectName}.pages.dev`;

        // 5. إرجاع النتيجة
        res.json({
            success: true,
            message: "تم برمجة وبناء ونشر المشروع بنجاح!",
            ai_explanation: aiResult.ai_message,
            site_url: deployUrl,
            // نرسل الملفات بالكامل للواجهة الأمامية حتى تتمكن من تشغيل الـ Preview
            files: aiResult.files 
        });

        // اختياري: تنظيف المجلد بعد النشر
        await fs.rm(buildDir, { recursive: true, force: true });

    } catch (error: any) {
        console.error("حدث خطأ:", error);
        res.status(500).json({ 
            error: "فشل في بناء أو نشر المشروع", 
            details: error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`خادم منصة البرمجة يعمل على البورت ${PORT}`);
    console.log(`مستعد لبناء ألعاب الـ 3D وتطبيقات React الضخمة والنشر على Cloudflare!`);
});
