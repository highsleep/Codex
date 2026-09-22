import React, { useState } from 'react';
import {
  Award,
  Search,
  CheckCircle2,
  XCircle,
  Wrench,
  ArrowLeftRight,
  User,
  Calendar,
  FileText,
  AlertTriangle,
  Camera,
  Layers,
  Save,
  Clock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { WarrantyClaim, AppUser, ClaimStatus } from '../../types';

interface InspectionsQualityTabProps {
  claims: WarrantyClaim[];
  selectedClaimId?: string;
  currentUser?: AppUser | null;
  onRefresh: () => void;
  onApproveReplacement: (claim: WarrantyClaim) => void;
}

export const InspectionsQualityTab: React.FC<InspectionsQualityTabProps> = ({
  claims,
  selectedClaimId,
  currentUser,
  onRefresh,
  onApproveReplacement,
}) => {
  const [activeClaimId, setActiveClaimId] = useState<string>(
    selectedClaimId || (claims.length > 0 ? claims[0].claim_id : '')
  );

  const activeClaim = claims.find((c) => c.claim_id === activeClaimId) || claims[0] || null;

  // Form states for inspection & quality decisions
  const [assignedTo, setAssignedTo] = useState(
    activeClaim?.assigned_to || 'م. حسام الدين (مهندس مراقبة الجودة وفحص الضمان)'
  );
  const [inspectionDate, setInspectionDate] = useState(
    activeClaim?.inspection_date || new Date().toISOString().split('T')[0]
  );
  const [inspectionResult, setInspectionResult] = useState(
    activeClaim?.inspection_result ||
      'تم الفحص الميداني بواسطة المسطرة القياسية وثبت وجود هبوط غير متماثل في شاسيه السوست مع تآكل موضعي في الفوم العازل.'
  );
  const [resolution, setResolution] = useState(activeClaim?.resolution || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync if selected claim changes
  React.useEffect(() => {
    if (activeClaim) {
      setAssignedTo(activeClaim.assigned_to || 'م. حسام الدين (مهندس مراقبة الجودة وفحص الضمان)');
      setInspectionDate(activeClaim.inspection_date || new Date().toISOString().split('T')[0]);
      setInspectionResult(
        activeClaim.inspection_result ||
          'تم الفحص الميداني بواسطة المسطرة القياسية وثبت وجود هبوط غير متماثل في شاسيه السوست مع تآكل موضعي في الفوم العازل.'
      );
      setResolution(activeClaim.resolution || '');
    }
  }, [activeClaim?.claim_id]);

  const handleUpdateDecision = async (status: ClaimStatus, defaultResolution?: string) => {
    if (!activeClaim) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const finalResolution = defaultResolution !== undefined ? defaultResolution : resolution;

    try {
      const res = await fetch(`/api/claims/${activeClaim.claim_id}/workflow`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_status: status,
          assigned_to: assignedTo.trim() || null,
          inspection_date: inspectionDate || null,
          inspection_result: inspectionResult.trim() || null,
          resolution: finalResolution.trim() || null,
          acting_user: currentUser ? `${currentUser.name} (${currentUser.role})` : 'إدارة الجودة والمعاينات',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ قرار الجودة');

      setSaveSuccess(
        status === 'Approved'
          ? 'تم اعتماد القرار بنجاح وتحديث حالة الضمان ودورة حياة المنتج'
          : status === 'Rejected'
          ? 'تم تسجيل قرار الرفض وتوثيق الأسباب الفنية'
          : 'تم تحديث بيانات المعاينة الفنية بنجاح'
      );
      onRefresh();
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!activeClaim) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-[#E5E7EB] shadow-xs space-y-3 font-sans">
        <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
        <h4 className="text-base font-black text-[#111111]">لا توجد شكاوى مسجلة تتطلب معاينة فنية</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          عندما يتم فتح شكوى أو بلاغ ضمان جديد، سيتم تفعيل شاشة الفحص الفني وإصدار قرارات الجودة هنا تلقائياً.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right font-sans">
      {/* 1. Claim Selector if multiple */}
      {claims.length > 1 && (
        <div className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span>اختر البلاغ المطلوب معاينته:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {claims.map((c) => (
              <button
                key={c.claim_id}
                onClick={() => setActiveClaimId(c.claim_id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                  activeClaim.claim_id === c.claim_id
                    ? 'bg-[#D62828] text-white shadow-xs'
                    : 'bg-[#F5F5F5] text-slate-700 hover:bg-slate-200'
                }`}
              >
                {c.claim_id} ({c.complaint_type})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Main Inspection & Quality Decision Center */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D62828]/10 text-[#D62828] flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-[#111111] font-['Cairo']">
                  مركز المعاينات وقرارات الجودة الفنية
                </h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold border border-slate-200">
                  {activeClaim.claim_id}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                توثيق نتائج الكشف الميداني، قياسات الهبوط، واتخاذ قرار الصيانة أو الاستبدال الفوري
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">حالة الشكوى الحالية:</span>
            <span className="font-bold text-xs px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
              {activeClaim.claim_status}
            </span>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {saveError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-bold flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Complaint Summary Card */}
        <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] text-xs grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-slate-400 block text-[11px]">الرقم التسلسلي المفحوص:</span>
            <span className="font-mono font-bold text-[#D62828] block text-sm mt-0.5">
              {activeClaim.serial_number}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">نوع الشكوى المبلغ عنها:</span>
            <span className="font-bold text-[#111111] block mt-0.5">
              {activeClaim.complaint_type}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">نص الشكوى المسجل:</span>
            <span className="text-slate-700 block mt-0.5 line-clamp-2">
              {activeClaim.complaint_description}
            </span>
          </div>
        </div>

        {/* Inspection Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Col 1: Inspector & Visit Date */}
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#111111] mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#D62828]" />
                <span>مهندس الجودة / الفني المعاين المكلف:</span>
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="اسم الفني أو أخصائي فحص الجودة..."
                className="w-full px-4 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs focus:bg-white focus:border-[#D62828] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-[#111111] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#D62828]" />
                <span>تاريخ الزيارة والمعاينة الميدانية:</span>
              </label>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs font-mono focus:bg-white focus:border-[#D62828] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block font-bold text-[#111111] mb-1.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#D62828]" />
                <span>نتائج القياسات والفحص الفني (تقرير المعاينة):</span>
              </label>
              <textarea
                rows={4}
                value={inspectionResult}
                onChange={(e) => setInspectionResult(e.target.value)}
                placeholder="سجل قياس نسبة الهبوط بالسنتيمتر، حالة شاسيه السوست، سلامة القماش والكابوتنيه، وفحص سوء الاستخدام..."
                className="w-full px-4 py-3 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs leading-relaxed focus:bg-white focus:border-[#D62828] focus:outline-none transition"
              />
            </div>
          </div>

          {/* Col 2: Decision Resolution & Action Hub */}
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#111111] mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#D62828]" />
                <span>منطوق قرار الجودة والتسوية المعتمدة:</span>
              </label>
              <textarea
                rows={4}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="مثال: تم اعتماد استبدال فوري لثبوت عيب مصنعي في الشاسيه، أو اعتماد صيانة بالورشة وتدعيم فوم..."
                className="w-full px-4 py-3 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs leading-relaxed focus:bg-white focus:border-[#D62828] focus:outline-none transition"
              />
            </div>

            {/* The 4 Clear Decision Action Buttons */}
            <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] space-y-3">
              <span className="font-bold text-[#111111] block text-xs">
                اتخاذ قرار الجودة المباشر (Quality Actions):
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. اعتماد الإصلاح */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    const resNote = resolution || 'معتمد للإصلاح والصيانة: صيانة شاسيه السوست وتدعيم طبقات الفوم وإعادتها للعميل';
                    setResolution(resNote);
                    handleUpdateDecision('Approved', resNote);
                  }}
                  className="px-3 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex flex-col items-center justify-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <Wrench className="w-4 h-4" />
                    <span>اعتماد الإصلاح والصيانة</span>
                  </div>
                  <span className="text-[10px] text-indigo-200">تحويل لورشة الصيانة بالمصنع</span>
                </button>

                {/* 2. اعتماد الاستبدال */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    const resNote = resolution || 'معتمد للاستبدال الفوري: عيب تصنيع هيكلي يستوجب إصدار مرتبة بديلة جديدة';
                    setResolution(resNote);
                    handleUpdateDecision('Approved', resNote);
                    onApproveReplacement(activeClaim);
                  }}
                  className="px-3 py-3 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-xl text-xs transition flex flex-col items-center justify-center gap-1 shadow-md shadow-[#D62828]/20 disabled:opacity-50 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>اعتماد الاستبدال الفوري</span>
                  </div>
                  <span className="text-[10px] text-red-200">إصدار إذن وشهادة استبدال</span>
                </button>

                {/* 3. قيد الفحص */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleUpdateDecision('Under Inspection')}
                  className="px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs border border-[#E5E7EB] transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>تأكيد موعد المعاينة</span>
                </button>

                {/* 4. رفض الطلب */}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    const resNote = resolution || 'مرفوض: الفحص أثبت سوء استخدام ناتج عن بلل أو قاعدة غير مستوية خارج شروط الضمان';
                    setResolution(resNote);
                    handleUpdateDecision('Rejected', resNote);
                  }}
                  className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>رفض الشكوى مع السبب</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
