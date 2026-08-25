'use server';

import { supabase } from '@/integrations/supabase/client';

export async function startLoraTraining(userId: string, modelName: string, imageUrls: string[]) {
  try {
    // 1. تسجيل طلب التدريب في Supabase
    const { data: modelRecord, error } = await supabase
      .from('user_models')
      .insert({
        user_id: userId,
        name: modelName,
        status: 'training',
        images: imageUrls,
      })
      .select()
      .single();

    if (error) throw error;

    // 2. قراءة بيانات Kaggle من متغيرات البيئة
    const token = process.env.KAGGLE_API_TOKEN;
    const slug = process.env.KAGGLE_NOTEBOOK_SLUG;

    // 3. إرسال أمر التشغيل لـ Kaggle
    const response = await fetch('https://www.kaggle.com/api/v1/kernels/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: slug,
        newTitle: `LoRA Training - ${modelRecord.id}`,
        codeUrl: `https://www.kaggle.com/${slug}`,
        enableGpu: true,
        enableInternet: true,
      }),
    });

    const result = await response.json();
    return { success: true, modelId: modelRecord.id, result };
  } catch (err: any) {
    console.error('Error starting LoRA training:', err);
    return { success: false, error: err.message };
  }
}

