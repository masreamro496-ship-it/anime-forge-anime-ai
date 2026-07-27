import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Upload, CheckCircle, ArrowRight } from 'lucide-react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/donate')({
  component: Donate,
});

const TIERS = [
  { amount: 30, title: 'داعم أنمي مبتدئ 🧪', color: 'from-blue-600 to-cyan-500' },
  { amount: 60, title: 'داعم برونزي 🥉', color: 'from-amber-600 to-orange-500' },
  { amount: 90, title: 'داعم فضي 🥈', color: 'from-slate-400 to-slate-200 text-black' },
  { amount: 120, title: 'داعم ذهبي خارق 🥇', color: 'from-yellow-500 to-amber-300 text-black font-bold' },
];

function Donate() {
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [txNumber, setTxNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [approvedDonation, setApprovedDonation] = useState(false);

  useEffect(() => {
    checkApprovedStatus();
  }, []);

  const checkApprovedStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('donations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .maybeSingle();
      if (data) setApprovedDonation(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAmount || !txNumber) {
      alert('يرجى اختيار قيمة التبرع وإدخال رقم العملية.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let receipt_url = '';

      // رفع صورة الإيصال إن وجدت
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const filePath = `${Date.now()}_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('donation-receipts')
          .upload(filePath, receiptFile);

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('donation-receipts')
            .getPublicUrl(filePath);
          receipt_url = publicUrlData.publicUrl;
        }
      }

      // حفظ بيانات التبرع
      const { error } = await supabase.from('donations').insert({
        user_id: user?.id || null,
        user_email: user?.email || 'زائر',
        amount: selectedAmount,
        transaction_number: txNumber,
        receipt_url: receipt_url,
        status: 'pending'
      });

      if (error) throw error;

      alert('شكراً للتبرع على تعبنا! ❤️ سيتم مراجعة إيصال التحويل وتأكيده من قبل الأدمن قريباً.');
      setSelectedAmount(null);
      setTxNumber('');
      setReceiptFile(null);
    } catch (err: any) {
      alert('حدث خطأ أثناء الإرسال: ' + (err.message || 'حاول مرة أخرى'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 dir-rtl font-sans">
      <button 
        onClick={() => navigate('/')} 
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowRight className="w-5 h-5" /> العودة للموقع
      </button>

      {approvedDonation && (
        <div className="max-w-xl mx-auto mb-6 p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center gap-3 text-emerald-300">
          <CheckCircle className="w-6 h-6 shrink-0" />
          <p className="font-semibold">شكراً لك ❤️ تم تأكيد تبرعك المسبق وتقديراً لتعبنا!</p>
        </div>
      )}

      <div className="max-w-2xl mx-auto bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-2xl p-6 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-rose-500/10 text-rose-500 rounded-full mb-3">
            <Heart className="w-8 h-8 fill-rose-500" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">دعم منصة أنمي فورج ❤️</h1>
          <p className="text-slate-400 text-sm mt-2">دعمك يساعدنا على استمرار وتطوير المنصة بدقة عالية</p>
        </div>

        {/* فئات التبرع */}
        <label className="block text-sm font-medium mb-3 text-slate-300">اختر قيمة التبرع (جنيه):</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {TIERS.map((tier) => (
            <button
              key={tier.amount}
              type="button"
              onClick={() => setSelectedAmount(tier.amount)}
              className={`p-4 rounded-xl border text-center transition-all duration-200 ${
                selectedAmount === tier.amount 
                  ? 'border-rose-500 ring-2 ring-rose-500/50 scale-105' 
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
              }`}
            >
              <span className="block text-2xl font-black mb-1">{tier.amount} ج.م</span>
              <span className="text-xs text-slate-400">{tier.title}</span>
            </button>
          ))}
        </div>

        {selectedAmount && (
          <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-800 pt-6 animate-fade-in">
            <div>
              <label className="block text-sm font-medium mb-1">رقم العملية / رقم التحويل:</label>
              <input
                type="text"
                required
                value={txNumber}
                onChange={(e) => setTxNumber(e.target.value)}
                placeholder="أدخل رقم العملية الهاتفي أو المرجعي"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">إرفاق صورة الإيصال (اختياري):</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold p-3 rounded-xl shadow-lg transition duration-200 flex justify-center items-center gap-2"
            >
              {loading ? 'جاري الإرسال...' : `تأكيد التبرع بـ ${selectedAmount} جنيه ❤️`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
