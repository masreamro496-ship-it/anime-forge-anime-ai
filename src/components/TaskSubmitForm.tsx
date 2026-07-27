import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client'; // تأكد من مسار استيراد supabase
import { useToast } from '@/hooks/use-toast'; // أو مكتبة التنبيهات المستعملة عندك

interface TaskSubmissionProps {
  taskId: string;
  onSuccess?: () => void;
}

export const TaskSubmitForm = ({ taskId, onSuccess }: TaskSubmissionProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalProofUrl = proofUrl.trim();

      // 1. رفع الصورة إلى Supabase Storage في حال تم اختيار ملف
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `proofs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('task-proofs') // اسم الـ Bucket في Supabase
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          throw new Error("فشل رفع صورة الإثبات، يرجى التأكد من حجم الصورة أو المحاولة مجدداً.");
        }

        // الحصول على رابط الصورة المرفوعة
        const { data: urlData } = supabase.storage
          .from('task-proofs')
          .getPublicUrl(filePath);

        finalProofUrl = urlData.publicUrl;
      }

      if (!finalProofUrl) {
        throw new Error("يرجى إرفاق صورة الإثبات أو وضع رابط المنشور.");
      }

      // 2. إدخال الإثبات في جدول قاعدة البيانات
      const { error: dbError } = await supabase
        .from('task_submissions') // اسم جدول الإثباتات لديك
        .insert([
          {
            task_id: taskId,
            proof_url: finalProofUrl,
            status: 'pending',
          },
        ]);

      if (dbError) {
        console.error("Database insert error:", dbError);
        throw new Error("تعذر حفظ الإثبات في قاعدة البيانات. حاول مرة أخرى.");
      }

      // 3. النجاح
      toast({
        title: "تم الإرسال بنجاح!",
        description: "سيتم مراجعة إثباتك وإضافة الكريديت لحسابك فور الاعتماد.",
      });

      setFile(null);
      setProofUrl('');
      if (onSuccess) onSuccess();

    } catch (err: any) {
      // إظهار الخطأ للمستخدم دون كسر الصفحة أو إغلاقها
      const message = err.message || "حدث خطأ غير متوقع أثناء الإرسال.";
      setErrorMessage(message);
      toast({
        variant: "destructive",
        title: "فشل الإرسال",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* مدخل الرابط */}
      <input
        type="text"
        placeholder="ضع رابط المنشور أو الإثبات هنا..."
        value={proofUrl}
        onChange={(e) => setProofUrl(e.target.value)}
        className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700"
      />

      {/* مدخل رفع الصورة */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="w-full text-sm text-gray-400"
      />

      {/* زر الإرسال */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded transition disabled:opacity-50"
      >
        {isSubmitting ? "جاري الرفع والإرسال..." : "إرسال"}
      </button>
    </form>
  );
};

