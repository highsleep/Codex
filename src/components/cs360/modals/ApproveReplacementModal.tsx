import React, { useState } from 'react';
import { ArrowLeftRight, X, Award, AlertTriangle } from 'lucide-react';
import { Replacement, AppUser } from '../../../types';

interface ApproveReplacementModalProps {
  isOpen: boolean;
  oldSerial: string;
  oldWarrantyId?: string;
  defaultReason?: string;
  currentUser?: AppUser | null;
  onClose: () => void;
  onSuccess: (replacement: Replacement) => void;
}

export const ApproveReplacementModal: React.FC<ApproveReplacementModalProps> = ({
  isOpen,
  oldSerial,
  oldWarrantyId,
  defaultReason,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [oldS, setOldS] = useState(oldSerial || '');
  const [newS, setNewS] = useState('');
  const [oldWId, setOldWId] = useState(oldWarrantyId || '');
  const [reason, setReason] = useState(
    defaultReason || 'عيب تصنيع هيكلي في الشاسيه غير قابل للإصلاح الميداني يستوجب استبدال فوري'
  );
  const [approvedBy, setApprovedBy] = useState(
    currentUser ? `${currentUser.name} (${currentUser.role})` : 'د. منى الشريف (مدير عام رقابة الجودة)'
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (oldSerial) setOldS(oldSerial);
    if (oldWarrantyId) setOldWId(oldWarrantyId);
    if (defaultReason) setReason(defaultReason);
  }, [oldSerial, oldWarrantyId, defaultReason]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldS.trim() || !newS.trim() || !reason.trim() || !approvedBy.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة واعتماد الرقم التسلسلي الجديد');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/replacements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_serial_number: oldS.trim().toUpperCase(),
          new_serial_number: newS.trim().toUpperCase(),
          old_warranty_id: oldWId.trim() || 'W-DIRECT',
          replacement_reason: reason.trim(),
          approved_by: approvedBy.trim(),
          notes: notes.trim(),
          acting_user: approvedBy.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسجيل إذن الاستبدال');

      onSuccess(data.replacement);
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
            <div className="w-9 h-9 rounded-xl bg-[#D62828] text-white flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#111111] font-['Cairo']">
                اعتماد الاستبدال وإصدار إذن جديد
              </h3>
              <p className="text-[11px] text-slate-500">
                تسجيل استبدال رسمي، صرف الرقم البديل، وإصدار الشهادة الإلكترونية
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#111111] mb-1">المرتبة الأصلية المستبدلة:</label>
              <input
                type="text"
                disabled
                value={oldS}
                className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs font-mono font-bold text-[#D62828]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#111111] mb-1">وثيقة الضمان الحالية:</label>
              <input
                type="text"
                value={oldWId}
                onChange={(e) => setOldWId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#111111] mb-1">
              الرقم التسلسلي الجديد للمرتبة البديلة (New Serial):
            </label>
            <input
              type="text"
              required
              value={newS}
              onChange={(e) => setNewS(e.target.value)}
              placeholder="مثال: SLP-2026-9999"
              className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-300 rounded-xl text-xs font-mono font-bold text-emerald-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              يتم استلام الرقم التسلسلي الجديد من مستودع مراتب الاستبدال بالمصنع
            </span>
          </div>

          <div>
            <label className="block font-bold text-[#111111] mb-1">سبب الاستبدال المعتمد:</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:border-[#D62828] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-[#111111] mb-1">المسؤول المعتمد للاستبدال:</label>
            <input
              type="text"
              required
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:border-[#D62828] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-[#111111] mb-1">ملاحظات التسليم والاسترجاع (اختياري):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: استلام المرتبة القديمة وإعادتها لقسم الفحص بالمصنع..."
              className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:border-[#D62828] focus:outline-none"
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
              className="px-6 py-2 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-xl text-xs transition disabled:opacity-50 shadow-md shadow-[#D62828]/20 cursor-pointer flex items-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              <span>{submitting ? 'جاري الاعتماد...' : 'اعتماد الاستبدال وإصدار الشهادة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
