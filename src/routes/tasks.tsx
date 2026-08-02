import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trophy, Video, Share2, MessageSquare, Bug, Star, Calendar, HelpCircle, FileText, Send, ArrowRight, CheckCircle2, Image as ImageIcon, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadUserFile } from "@/lib/storage";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const [proofs, setProofs] = useState<{ [key: string]: string }>({});
  const [files, setFiles] = useState<{ [key: string]: File | null }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [submitted, setSubmitted] = useState<{ [key: string]: boolean }>({});

  const tasks = [
    { id: "video", title: "صناعة فيديو (TikTok / Shorts)", reward: "25 - 30 كريدت", icon: Video, color: "from-red-500/20 to-purple-500/10", desc: "عمل فيديو قصير (15-30 ثانية) يستعرض ميزة بالذكاء الاصطناعي مع رابط الموقع." },
    { id: "affiliate", title: "دعوة صديق للشراء", reward: "50 كريدت + 10%", icon: Share2, color: "from-green-500/20 to-emerald-500/10", desc: "شارك رابط إحالتك وخذ المكافأة عند شراء صديقك لأول باقة." },
    { id: "social", title: "النشر في مجتمعات الأنمي", reward: "10 - 15 كريدت", icon: MessageSquare, color: "from-blue-500/20 to-cyan-500/10", desc: "انشر بوست توصية بموقعك في جروب أنمي أو ذكاء اصطناعي (أكثر من 5000 عضو)." },
    { id: "bugs", title: "اكتشاف الأخطاء والـ Bugs", reward: "15 - 20 كريدت", icon: Bug, color: "from-yellow-500/20 to-amber-500/10", desc: "إذا وجد المشكلة، أرسل سكرين شوت وخطوات تكرارها بالتفصيل للأدمن." },
    { id: "showcase", title: "مشاركة الإبداع (Showcase)", reward: "10 - 15 كريدت", icon: Star, color: "from-pink-500/20 to-purple-500/10", desc: "ولد صورة 4K أو شخصية وشاركها على حسابك مع هاشتاج الموقع ورابط البايو." },
    { id: "streak", title: "سلسلة الدخول اليومي (5 أيام)", reward: "5 - 10 كريدت", icon: Calendar, color: "from-orange-500/20 to-red-500/10", desc: "سجل الدخول للموقع واصنع تصميماً لمدة 5 أيام متتالية وارفق سكرين شوت." },
    { id: "feedback", title: "استبيان التحديث القادم", reward: "3 - 5 كريدت", icon: FileText, color: "from-teal-500/20 to-green-500/10", desc: "أجب على 3 أسئلة قصيرة حول رأيك وتطويرات الموقع القادمة." },
    { id: "helper", title: "البطل المساعد (Community Helper)", reward: "10 كريدت", icon: HelpCircle, color: "from-indigo-500/20 to-purple-500/10", desc: "ساعد زائر جديد في جروب الدعم أو الديسكورد وأرسل سكرين شوت." },
    { id: "seo", title: "كتابة مقال أو تقييم SEO", reward: "20 - 25 كريدت", icon: FileText, color: "from-violet-500/20 to-fuchsia-500/10", desc: "اكتب منشوراً من فقرتين تشرح تجربتك مع الموقع في مجتمع تقني مع رابط الموقع." },
  ];

  const handleFileChange = (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [taskId]: e.target.files[0] });
    }
  };

  const handleSubmit = async (taskId: string, taskTitle: string) => {
    const selectedFile = files[taskId];
    const textProof = (proofs[taskId] || "").trim();

    if (!selectedFile && !textProof) {
      alert("يرجى إرفاق صورة الإثبات أو وضع رابط المنشور أولاً.");
      return;
    }

    setLoading({ ...loading, [taskId]: true });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        alert("سجّل دخولك أولاً حتى نتمكن من إضافة الكريدت لحسابك.");
        return;
      }

      let proofPath: string | null = null;
      let finalProofUrl: string = textProof;

      if (selectedFile) {
        if (selectedFile.size > 10 * 1024 * 1024) {
          alert("حجم الصورة كبير جداً (الحد الأقصى 10 ميجا).");
          return;
        }
        try {
          proofPath = await uploadUserFile("task-proofs", user.id, selectedFile, `${taskId}-`);
          if (!finalProofUrl) finalProofUrl = `[صورة مرفقة] ${selectedFile.name}`;
        } catch (uploadError) {
          console.error("Storage upload error:", uploadError);
          alert("تعذّر رفع صورة الإثبات. جرّب صورة أصغر أو ضع رابط الإثبات بدلاً منها.");
          return;
        }
      }

      const { error: dbError } = await (supabase as any).from("task_submissions").insert({
        user_id: user.id,
        user_email: user.email ?? null,
        task_id: taskId,
        task_title: taskTitle,
        proof_link: finalProofUrl,
        proof_path: proofPath,
        status: "pending",
      });

      if (dbError) {
        console.error("Database insert error:", dbError);
        alert(`تعذّر حفظ الإثبات: ${dbError.message}`);
      } else {
        setSubmitted({ ...submitted, [taskId]: true });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("حدث خطأ غير متوقع أثناء إرسال المهمة.");
    } finally {
      setLoading({ ...loading, [taskId]: false });
    }
  };


  return (
    <div className="min-h-screen bg-background text-foreground p-4 max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-3 mb-6 border-b border-border/40 pb-4">
        <Link to="/" className="p-2 rounded-xl bg-card border border-border">
          <ArrowRight className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-purple-400 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-400" /> مركز المهمات والمكافآت
          </h1>
          <p className="text-xs text-muted-foreground">أكمل المهمات وارفق صورة/سكرين شوت أو رابط الإثبات للحصول على الكريدت!</p>
        </div>
      </div>

      <div className="grid gap-4">
        {tasks.map((task) => {
          const IconComponent = task.icon;
          const isDone = submitted[task.id];
          const isLoading = loading[task.id];
          const currentFile = files[task.id];

          return (
            <div key={task.id} className={`rounded-2xl border border-purple-500/30 bg-gradient-to-r ${task.color} p-4 transition-all`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-purple-200">{task.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.desc}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 whitespace-nowrap">
                  +{task.reward}
                </span>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                {/* مدخل النص/الرابط */}
                <input
                  type="text"
                  placeholder="ضع رابط المنشور أو الإثبات هنا..."
                  className="flex-1 bg-black/40 border border-border/60 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-purple-500"
                  value={proofs[task.id] || ""}
                  onChange={(e) => setProofs({ ...proofs, [task.id]: e.target.value })}
                  disabled={isDone || isLoading}
                />

                {/* زر رفع ملف / سكرين شوت (PNG, JPG, JPEG, WEBP) */}
                <label className={`cursor-pointer bg-card hover:bg-accent border border-purple-500/40 px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all ${currentFile ? "border-green-500/80 text-green-400" : "text-purple-300"}`}>
                  <Upload className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[120px]">
                    {currentFile ? currentFile.name : "ارفاق سكرين شوت"}
                  </span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(task.id, e)}
                    disabled={isDone || isLoading}
                  />
                </label>

                {/* زر الإرسال */}
                <button
                  onClick={() => handleSubmit(task.id, task.title)}
                  disabled={isDone || isLoading || (!proofs[task.id] && !files[task.id])}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 disabled:text-gray-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      تم الإرسال
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      {isLoading ? "جاري الرفع..." : "إرسال"}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
