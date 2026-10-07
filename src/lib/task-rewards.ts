// المكافأة الثابتة لكل مهمة (بالكريدت) — بتتضاف للحساب بعد موافقة الإدارة
export const TASK_REWARDS: Record<string, { title: string; reward: number }> = {
  video: { title: "صناعة فيديو (TikTok / Shorts)", reward: 30 },
  affiliate: { title: "دعوة صديق للشراء", reward: 50 },
  social: { title: "النشر في مجتمعات الأنمي", reward: 15 },
  bugs: { title: "اكتشاف الأخطاء والـ Bugs", reward: 20 },
  showcase: { title: "مشاركة الإبداع (Showcase)", reward: 15 },
  streak: { title: "سلسلة الدخول اليومي (5 أيام)", reward: 10 },
  feedback: { title: "استبيان التحديث القادم", reward: 5 },
  helper: { title: "البطل المساعد (Community Helper)", reward: 10 },
  seo: { title: "كتابة مقال أو تقييم SEO", reward: 25 },
};
