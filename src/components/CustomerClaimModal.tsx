import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2, ShieldAlert, Camera, Upload, Bed, Phone, User, FileText, Clock } from 'lucide-react';
import { ComplaintType, WarrantyClaim } from '../types';

interface CustomerClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSerialNumber?: string;
  defaultWarrantyId?: string;
  defaultCustomerName?: string;
  defaultPhone?: string;
  onClaimCreated?: (claim: WarrantyClaim) => void;
}

const COMPLAINT_TYPES: { type: ComplaintType; label: string; desc: string }[] = [
  { type: 'Spring Collapse', label: 'هبوط / كسر في شاسيه السوست', desc: 'هبوط في نوابض السوست أو بروزها أو صدور أصوات تزييق عند الحركة' },
  { type: 'Foam Collapse', label: 'هبوط موضعي في طبقات الإسفنج / الفوم', desc: 'انخساف دائم في طبقة الميموري فوم أو الإسفنج يتجاوز 2 سم' },
  { type: 'Fabric Defect', label: 'عيب في القماش الخارجي أو الكابتونيه', desc: 'تنسيل، تمزق في الخياطة، أو فك خيوط الكابتونيه الخارجي' },
  { type: 'Noise', label: 'أصوات احتكاك أو طقطقة غير طبيعية', desc: 'أصوات صادرة من داخل الشاسيه أثناء الاستلقاء أو التقلب' },
  { type: 'Manufacturing Defect', label: 'عيب مصنعي عام أو تشطيب', desc: 'عدم تماثل في الأبعاد أو عيب في شريط الحزام المحيط بالمرتبة' },
  { type: 'Other', label: 'شكوى أو عيب آخر', desc: 'أي ملاحظة أخرى تتعلق بجودة المرتبة وراحتها' },
];

export const CustomerClaimModal: React.FC<CustomerClaimModalProps> = ({
  isOpen,
  onClose,
  defaultSerialNumber = '',
  defaultWarrantyId = '',
  defaultCustomerName = '',
  defaultPhone = '',
  onClaimCreated,
}) => {
  const [serialNumber, setSerialNumber] = useState(defaultSerialNumber);
  const [warrantyId, setWarrantyId] = useState(defaultWarrantyId);
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [phone, setPhone] = useState(defaultPhone);
  const [complaintType, setComplaintType] = useState<ComplaintType>('Spring Collapse');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successClaim, setSuccessClaim] = useState<WarrantyClaim | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber.trim() || !customerName.trim() || !phone.trim() || !complaintDescription.trim()) {
      setError('يرجى ملء جميع الحقول الإلزامية');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number: serialNumber.trim().toUpperCase(),
          warranty_id: warrantyId.trim() || undefined,
          customer_name: customerName.trim(),
          phone: phone.trim(),
          complaint_type: complaintType,
          complaint_description: complaintDescription.trim(),
          images: imageUrl ? [imageUrl] : [
            'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80'
          ],
          acting_user: customerName.trim() + ' (بوابة العملاء)',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إرسال الشكوى');
      }

      setSuccessClaim(data.claim);
      if (onClaimCreated) {
        onClaimCreated(data.claim);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccessClaim(null);
    setError(null);
    setComplaintDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 text-right font-sans">
        {/* Header */}
        <div className="bg-white text-[#111111] px-6 py-5 flex items-center justify-between border-b border-[#E5E7EB] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D62828] flex items-center justify-center text-white shadow-md shadow-[#D62828]/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black font-['Cairo'] text-[#111111]">تقديم طلب ضمان وفحص فني</h3>
              <p className="text-xs text-[#D62828] font-bold">قسم رقابة وتوكيد الجودة — مصانع مراتب سليبي</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="w-8 h-8 rounded-lg bg-[#F5F5F5] hover:bg-[#E5E7EB] flex items-center justify-center text-slate-500 hover:text-[#111111] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {successClaim ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                تم تسجيل الشكوى بنجاح
              </span>
              <h4 className="text-2xl font-black text-[#111111] font-['Cairo']">
                رقم المتابعة: {successClaim.claim_id}
              </h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                عزيزي العميل <span className="font-bold text-[#111111]">{successClaim.customer_name}</span>، تم تسجيل طلب الضمان الخاص بالمرتبة رقم <span className="font-mono font-bold text-[#D62828]">{successClaim.serial_number}</span> بنجاح.
              </p>
            </div>

            <div className="bg-[#F5F5F5] border border-[#E5E7EB] rounded-2xl p-4 text-xs text-slate-700 text-right space-y-2">
              <div className="flex items-center gap-2 text-[#D62828] font-bold mb-1">
                <Clock className="w-4 h-4" />
                <span>خطوات المعالجة والمعاينة الفنية:</span>
              </div>
              <p>• سيقوم أحد مهندسي الفحص الفني بالتواصل معك هاتفياً على <span className="font-mono font-bold text-[#111111]">{successClaim.phone}</span> خلال 24-48 ساعة عمل لتحديد موعد المعاينة المنزلية المجانية.</p>
              <p>• في حال ثبوت عيب مصنعي في الشاسيه أو الفوم، يتم اعتماد الاستبدال الفوري بمرتبة جديدة وتوليد شهادة استبدال معتمدة.</p>
            </div>

            <button
              onClick={handleReset}
              className="px-8 py-3 bg-[#D62828] text-white font-bold rounded-xl hover:bg-[#B71C1C] transition cursor-pointer shadow-md shadow-[#D62828]/25"
            >
              إغلاق ومتابعة
            </button>
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">الرقم التسلسلي للمرتبة *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="مثال: SLP-2026-9081"
                    className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-sm font-mono focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20 focus:outline-none transition"
                  />
                  <Bed className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">رقم وثيقة الضمان (اختياري)</label>
                <input
                  type="text"
                  value={warrantyId}
                  onChange={(e) => setWarrantyId(e.target.value)}
                  placeholder="مثال: SLP-WRN-2601-8192"
                  className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-sm font-mono focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">اسم العميل بالكامل *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="الاسم المسجل في الفاتورة أو الضمان"
                    className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-sm focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20 focus:outline-none transition"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">رقم الهاتف للتواصل *</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-sm font-mono focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20 focus:outline-none transition"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>

            {/* Complaint Type Selector */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-2">نوع العيب أو الشكوى الفنية *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMPLAINT_TYPES.map((ct) => (
                  <button
                    key={ct.type}
                    type="button"
                    onClick={() => setComplaintType(ct.type)}
                    className={`p-3 rounded-xl border text-right transition flex flex-col justify-between cursor-pointer ${
                      complaintType === ct.type
                        ? 'border-[#D62828] bg-[#D62828]/5 text-[#111111] ring-2 ring-[#D62828]/20'
                        : 'border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block mb-0.5">{ct.label}</span>
                    <span className="text-[11px] text-slate-500 leading-tight">{ct.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">وصف العيب الفني وموقعه بالتفصيل *</label>
              <textarea
                required
                rows={3}
                value={complaintDescription}
                onChange={(e) => setComplaintDescription(e.target.value)}
                placeholder="يرجى ذكر تفاصيل المشكلة (مثال: هبوط في الجانب الأيمن، صوت احتكاك عند الاستلقاء، إلخ)..."
                className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-sm focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20 focus:outline-none transition"
              />
            </div>

            {/* Photo upload preview */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1">رابط صورة العيب أو بطاقة الضمان (اختياري)</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... (رابط صورة توضح العيب)"
                  className="flex-1 px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-mono focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80')}
                  className="px-3 py-2 bg-[#F5F5F5] hover:bg-[#E5E7EB] text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>إرفاق نموذج</span>
                </button>
              </div>
              {imageUrl && (
                <div className="mt-2 w-24 h-16 rounded-lg overflow-hidden border border-[#E5E7EB] shadow-xs relative group">
                  <img src={imageUrl} alt="Defect" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Submit Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-[#111111] transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-xl text-xs shadow-md shadow-[#D62828]/20 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
              >
                {loading ? 'جاري الإرسال...' : 'إرسال طلب المعاينة والضمان'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
