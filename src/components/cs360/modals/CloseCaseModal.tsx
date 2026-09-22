import React, { useState } from 'react';
import { CheckCircle2, X, FileCheck } from 'lucide-react';
import { WarrantyClaim, AppUser } from '../../../types';

interface CloseCaseModalProps {
  claim: WarrantyClaim | null;
  isOpen: boolean;
  currentUser?: AppUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CloseCaseModal: React.FC<CloseCaseModalProps> = ({
  claim,
  isOpen,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [closingResolution, setClosingResolution] = useState(
    'تم إغلاق البلاغ بنجاح بعد استلام العميل للمرتبة والتأكد من مطابقتها ورضا العميل التام'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !claim) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/claims/${claim.claim_id}/workflow`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_status: 'Closed',
          resolution: closingResolution.trim(),
          acting_user: currentUser ? `${currentUser.name} (${currentUser.role})` : 'خدمة العملاء 360',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إغلاق الحالة');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E5E7EB] overflow-hidden my-8 text-right font-sans p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#111111] font-['Cairo']">
                إغلاق الحالة وإنهاء التذكرة
              </h3>
              <p className="text-[11px] text-slate-500">
                تسجيل إتمام الخدمة بنجاح وأرشفة البلاغ في السجل التاريخي
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#F5F5F5] hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
            <div className="flex justify-between">
              <span className="text-emerald-800">رقم البلاغ:</span>
              <span className="font-mono font-bold text-emerald-900">{claim.claim_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-800">الرقم التسلسلي:</span>
              <span className="font-mono font-bold text-emerald-900">{claim.serial_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-emerald-800">العميل:</span>
              <span className="font-bold text-emerald-900">{claim.customer_name}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#111111] mb-1">
              ملاحظات الإغلاق النهائي والتسليم:
            </label>
            <textarea
              rows={4}
              required
              value={closingResolution}
              onChange={(e) => setClosingResolution(e.target.value)}
              placeholder="اكتب خلاصة إنهاء الحالة، تأكيد استلام العميل، ورضا الخدمة..."
              className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs leading-relaxed focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-[#111111] transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'جاري الحفظ...' : 'تأكيد إغلاق الحالة نهائياً'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
