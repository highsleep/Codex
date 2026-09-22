import React, { useState } from 'react';
import { Wrench, X, CheckCircle2 } from 'lucide-react';
import { WarrantyClaim, AppUser } from '../../../types';

interface ApproveRepairModalProps {
  claim: WarrantyClaim | null;
  isOpen: boolean;
  currentUser?: AppUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApproveRepairModal: React.FC<ApproveRepairModalProps> = ({
  claim,
  isOpen,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [assignedWorkshop, setAssignedWorkshop] = useState(
    claim?.assigned_to || 'ورشة الصيانة المركزية - مصنع سليبي'
  );
  const [repairNotes, setRepairNotes] = useState(
    claim?.resolution || 'اعتماد صيانة وإصلاح: تدعيم شاسيه السوست واستبدال طبقات الفوم العازل المتضررة وإعادة التنجيد'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !claim) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repairNotes.trim()) {
      setError('يرجى كتابة تعليمات الصيانة');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/claims/${claim.claim_id}/workflow`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_status: 'Approved',
          assigned_to: assignedWorkshop.trim() || null,
          resolution: repairNotes.trim(),
          acting_user: currentUser ? `${currentUser.name} (${currentUser.role})` : 'قسم الجودة والصيانة',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل اعتماد أمر الإصلاح');

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
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#111111] font-['Cairo']">
                اعتماد أمر الإصلاح والصيانة
              </h3>
              <p className="text-[11px] text-slate-500">
                إصدار توجيهات الصيانة بالورشة واعتماد التكفل ضمن الضمان
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
          <div className="p-3.5 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">رقم البلاغ / الشكوى:</span>
              <span className="font-mono font-bold text-indigo-600">{claim.claim_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">الرقم التسلسلي:</span>
              <span className="font-mono font-bold text-[#111111]">{claim.serial_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">اسم العميل:</span>
              <span className="font-bold text-[#111111]">{claim.customer_name}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#111111] mb-1">الورشة الفنية / الفني المكلف:</label>
            <input
              type="text"
              required
              value={assignedWorkshop}
              onChange={(e) => setAssignedWorkshop(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-[#111111] mb-1">تعليمات الصيانة وتفاصيل الأعمال المطلوبة:</label>
            <textarea
              rows={4}
              required
              value={repairNotes}
              onChange={(e) => setRepairNotes(e.target.value)}
              placeholder="اكتب تفاصيل إصلاح الشاسيه، قطع الغيار، ومدة العمل المتوقعة..."
              className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs leading-relaxed focus:border-indigo-600 focus:outline-none"
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
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-1.5"
            >
              <Wrench className="w-4 h-4" />
              <span>{submitting ? 'جاري الاعتماد...' : 'اعتماد أمر الإصلاح والصيانة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
