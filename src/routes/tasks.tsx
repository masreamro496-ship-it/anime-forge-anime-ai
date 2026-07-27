import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trophy, Video, Share2, MessageSquare, Bug, Star, Calendar, HelpCircle, FileText, Send, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const [proofs, setProofs] = useState<{ [key: string]: string }>({});
  const [submitted, setSubmitted] = useState<{ [key: string]: boolean }>({});

  const tasks = [
    { id: "video", title: "صناعة فيديو (TikTok / Shorts)", reward: "25 - 30 كريدت", icon: Video, color: "from-red-500/20 to-purple-500/10", desc: "عمل فيديو قصير (15-30 ثانية) يستعرض ميزة بالذكاء الاصطناعي مع رابط الموقع." },
    { id: "affiliate", title: "دعوة صديق للشراء", reward: "50 كريدت + 10%", icon: Share2, color: "from-green-500/20 to-emerald-500/10", desc: "شارك رابط إحالتك وخذ المكافأة عند شراء صديقك لأول باقة." },
    { id: "social", title: "النشر في مجتمعات الأنمي", reward: "10 - 15 كريدت", icon: MessageSquare, color: "from-blue-500/20 to-cyan-500/10", desc: "انشر بوست توصية بموقعك في جروب أنمي أو ذكاء اصطناعي (أكثر من 5000 عضو)." },
    { id: "bugs", title: "اكتشاف الأخطاء والـ Bugs", reward: "15 - 20 كريدت", icon: Bug, color: "from-yellow-500/20 to-amber-500/10", desc: "إذا وجدت مشكلة برمجية، أرسل خطوات تكرارها بالتفصيل للأدمن." },
    { id: "showcase", title: "مشاركة الإبداع (Showcase)", reward: "10 - 15 كريدت", icon: Star, color: "from-pink-500/20 to-purple-500/10", desc: "ولد صورة 4K أو شخصية وشاركها على حسابك مع هاشتاج الموقع ورابط البايو." },
    { id: "streak", title: "سلسلة الدخول اليومي (5 أيام)", reward: "5 - 10 كريدت", icon: Calendar, color: "from-orange-500/20 to-red-500/10", desc: "سجل الدخول للموقع واصنع تصميماً لمدة 5 أيام متتالية." },
    { id: "feedback", title: "استبيان التحديث القادم", reward: "3 - 5 كريدت", icon: FileText, color: "from-teal-500/20 to-green-500/10", desc: "أجب على 3 أسئلة قصيرة حول رأيك وتطويرات الموقع القادمة." },
    { id: "helper", title: "البطل المساعد (Community Helper)", reward: "10 كريدت", icon: HelpCircle, color: "from-indigo-500/20 to-purple-500/10", desc: "ساعد زائر جديد في جروب الدعم أو الديسكورد وأرسل سكرين شوت." },
    { id: "seo", title: "كتابة مقال أو تقييم SEO", reward: "20 - 25 كريدت", icon: FileText, color: "from-violet-500/20 to-fuchsia-500/10", desc: "اكتب منشوراً من فقرتين تشرح تجربتك مع الموقع في مجتمع تقني مع رابط الموقع." },
  ];

  const handleSubmit = (taskId: string) => {
    if (!proofs[taskId]) return;
    // هنا يتم ربط إرسال البيانات بـ Supabase
    setSubmitted({ ...submitted, [taskId]: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 border-b border-border/40 pb-4">
        <Link to="/" className="p-2 rounded-xl bg-card border border-border">
          <ArrowRight className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-purple-400 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-400" /> مركز المهمات والمكافآت
          </h1>
          <p className="text-xs text-muted-foreground">أكمل المهمات وأرسل الرابط/الإثبات للأدمن للحصول على الكريدت!</p>
        </div>
      </div>

      {/* Task List */}
      <div className="grid gap-4">
        {tasks.map((task) => {
          const IconComponent = task.icon;
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

              {/* Form Input */}
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="ضع رابط المنشور / الإثبات / الرسالة هنا..."
                  className="flex-1 bg-black/40 border border-border/60 rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-purple-500"
                  value={proofs[task.id] || ""}
                  onChange={(e) => setProofs({ ...proofs, [task.id]: e.target.value })}
                  disabled={submitted[task.id]}
                />
                <button
                  onClick={() => handleSubmit(task.id)}
                  disabled={submitted[task.id] || !proofs[task.id]}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitted[task.id] ? "تم الإرسال" : "إرسال"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
