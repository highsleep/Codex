import React, { useState } from 'react';
import { Plus, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ComplaintType } from '../../../types';

interface NewClaimModalProps {
  serialNumber: string;
  warrantyId?: string;
  customerName?: string;
  phone?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewClaimModal: React.FC<NewClaimModalProps> = ({
  serialNumber,
  warrantyId,
  customerName,
  phone,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [complaintType, setComplaintType] = useState<ComplaintType>('Spring Collapse');
  const [description, setDescription] = useState('');
  const [custName, setCustName] = useState(customerName || '');
  const [custPhone, setCustPhone] = useState(phone || '');
  const [wId, setWId] = useState(warrantyId || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (customerName) setCustName(customerName);
    if (phone) setCustPhone(phone);
    if (warrantyId) setWId(warrantyId);
  }, [customerName, phone, warrantyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !custName.trim() || !custPhone.trim()) {
      setError('يرجى ملء كافة الحقول الإلزامية');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number: serialNumber.trim().toUpperCase(),
          warranty_id: wId.trim() || 'W-DIRECT',
          customer_name: custName.trim(),
          phone: custPhone.trim(),
          complaint_type: complaintType,
          complaint_description: description.trim(),
          images: [],
          acting_user: 'خدمة العملاء 360',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسجيل الشكوى');

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
            <div className="w-9 h-9 rounded-xl bg-[#D62828] text-white flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#111111] font-['Cairo']">
                إنشاء شكوى / بلاغ ضمان جديد
              </h3>
              <p className="text-[11px] text-slate-500">
                تسجيل بلاغ العميل وربطه فورياً بالرقم التسلسلي وملف 360
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
              <label className="block font-bold text-[#111111] mb-1">الرقم التسلسلي (Serial):</label>
              <input
                type="text"
                disabled
                value={serialNumber}
                className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs font-mono font-bold text-[#D62828]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#111111] mb-1">رقم وثيقة الضمان:</label>
              <input
                type="text"
                value={wId}
                onChange={(e) => setWId(e.target.value)}
                placeholder="رقم الوثيقة..."
                className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#111111] mb-1">اسم العميل:</label>
              <input
                type="text"
                required
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="اسم العميل الرباعي..."
                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:border-[#D62828] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#111111] mb-1">رقم الهاتف:</label>
              <input
                type="tel"
                required
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-mono focus:border-[#D62828] focus:outline-none text-right"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#111111] mb-1">نوع العيب المشكو منه:</label>
            <select
              value={complaintType}
              onChange={(e) => setComplaintType(e.target.value as ComplaintType)}
              className="w-full px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:border-[#D62828] focus:outline-none"
            >
              <option value="Spring Collapse">هبوط / كسر في شاسيه السوست</option>
              <option value="Foam Collapse">هبوط موضعي في طبقات الإسفنج / الفوم</option>
              <option value="Fabric Defect">عيب في القماش الخارجي أو الكابتونيه</option>
              <option value="Noise">أصوات احتكاك أو طقطقة غير طبيعية</option>
              <option value="Manufacturing Defect">عيب مصنعي عام أو تشطيب</option>
              <option value="Other">شكوى أو عيب آخر</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#111111] mb-1">تفاصيل الشكوى (وصف العميل):</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب تفاصيل الشكوى وموقع العيب بدقة..."
              className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs leading-relaxed focus:border-[#D62828] focus:outline-none"
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
              className="px-5 py-2 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-xl text-xs transition disabled:opacity-50 shadow-md shadow-[#D62828]/20 cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? 'جاري التسجيل...' : 'تسجيل الشكوى وفتح البلاغ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
