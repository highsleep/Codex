import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  FileCheck,
  Plus,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  ShieldAlert,
  ArrowLeftRight,
} from 'lucide-react';
import { WarrantyClaim, ClaimStatus, ComplaintType, AppUser } from '../types';

interface ClaimsManagementProps {
  currentUser?: AppUser | null;
  onOpenNewClaim?: () => void;
  onOpenReplacementFromClaim?: (claim: WarrantyClaim) => void;
  onSelectCustomer360?: (serial: string) => void;
}

const STATUS_CONFIG: Record<
  ClaimStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  Open: {
    label: 'مفتوح (قيد الانتظار)',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  'Under Inspection': {
    label: 'قيد الفحص والمعاينة',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  Approved: {
    label: 'معتمد (مقبول للاستبدال/الإصلاح)',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  Rejected: {
    label: 'مرفوض (سوء استخدام/خارج الضمان)',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
  },
  Closed: {
    label: 'مغلق (تم الاستبدال/التسوية)',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
};

export const ClaimsManagement: React.FC<ClaimsManagementProps> = ({
  currentUser,
  onOpenNewClaim,
  onOpenReplacementFromClaim,
  onSelectCustomer360,
}) => {
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Active claim for workflow action modal
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<ClaimStatus>('Under Inspection');
  const [assignedTo, setAssignedTo] = useState('');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspectionResult, setInspectionResult] = useState('');
  const [resolution, setResolution] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      let url = `/api/claims?status=${statusFilter}&type=${typeFilter}`;
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setClaims(data);
    } catch (err) {
      console.error('Error fetching claims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClaims();
  };

  const handleOpenWorkflowModal = (claim: WarrantyClaim) => {
    setSelectedClaim(claim);
    setWorkflowStatus(claim.claim_status);
    setAssignedTo(claim.assigned_to || 'فني أحمد راشد (أخصائي الفحص الفني)');
    setInspectionDate(claim.inspection_date || new Date().toISOString().split('T')[0]);
    setInspectionResult(claim.inspection_result || '');
    setResolution(claim.resolution || '');
    setUpdateError(null);
  };

  const handleUpdateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;

    setUpdating(true);
    setUpdateError(null);

    try {
      const res = await fetch(`/api/claims/${selectedClaim.claim_id}/workflow`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_status: workflowStatus,
          assigned_to: assignedTo.trim() || null,
          inspection_date: inspectionDate || null,
          inspection_result: inspectionResult.trim() || null,
          resolution: resolution.trim() || null,
          acting_user: currentUser ? `${currentUser.name} (${currentUser.role})` : 'إدارة الجودة',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث حالة الطلب');

      // Update local state
      setClaims((prev) =>
        prev.map((c) => (c.claim_id === selectedClaim.claim_id ? data.claim : c))
      );
      setSelectedClaim(null);
    } catch (err: any) {
      setUpdateError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 text-right font-sans">
      {/* Top Banner & Actions */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-[#E5E7EB] flex flex-col md:flex-row gap-4 items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#D62828]" />
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#D62828] text-white flex items-center justify-center shadow-md shadow-[#D62828]/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#111111] font-['Cairo'] flex items-center gap-2">
              <span>إدارة طلبات وفحص الضمان (Claims Management)</span>
              <span className="text-xs px-2.5 py-0.5 bg-[#D62828]/10 text-[#D62828] rounded-full font-bold">
                {claims.length} طلب
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              دورة عمل فحص شكاوى العملاء: مفتوح ➔ قيد المعاينة ➔ اعتماد الاستبدال ➔ إغلاق
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => fetchClaims()}
            disabled={loading}
            className="p-2.5 bg-[#F5F5F5] hover:bg-[#E5E7EB] text-slate-700 rounded-xl transition cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {onOpenNewClaim && (
            <button
              onClick={onOpenNewClaim}
              className="px-4 py-2.5 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-xl text-xs shadow-md shadow-[#D62828]/20 transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل شكوى جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-3xl shadow-xs border border-[#E5E7EB] space-y-4">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'Open', label: 'مفتوح (Open)' },
            { id: 'Under Inspection', label: 'قيد المعاينة (Under Inspection)' },
            { id: 'Approved', label: 'معتمد للاستبدال (Approved)' },
            { id: 'Rejected', label: 'مرفوض (Rejected)' },
            { id: 'Closed', label: 'مغلق (Closed)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#D62828] text-white shadow-xs'
                  : 'bg-[#F5F5F5] text-slate-600 hover:bg-[#E5E7EB] hover:text-[#111111]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Secondary filters row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E5E7EB]">
          <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم الشكوى، المسلسل، اسم العميل، أو الهاتف..."
              className="w-full px-4 py-2 pr-10 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs focus:bg-white focus:border-[#D62828] focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          </form>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs focus:bg-white focus:border-[#D62828] focus:outline-none cursor-pointer"
            >
              <option value="ALL">جميع أنواع الشكاوى (All Types)</option>
              <option value="Spring Collapse">هبوط شاسيه السوست (Spring Collapse)</option>
              <option value="Foam Collapse">هبوط طبقات الفوم (Foam Collapse)</option>
              <option value="Fabric Defect">عيب القماش / الكابتونيه (Fabric Defect)</option>
              <option value="Noise">أصوات احتكاك (Noise)</option>
              <option value="Manufacturing Defect">عيب مصنعي عام (Manufacturing Defect)</option>
              <option value="Other">شكوى أخرى (Other)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Claims List Table / Cards */}
      <div className="bg-white rounded-3xl shadow-xs border border-[#E5E7EB] overflow-hidden">
        {claims.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">لا توجد طلبات ضمان مطابقة للتصفية الحالية</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5F5F5] border-b border-[#E5E7EB] text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5">رقم الطلب</th>
                  <th className="p-3.5">المرتبة / المسلسل</th>
                  <th className="p-3.5">العميل</th>
                  <th className="p-3.5">نوع الشكوى</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5">المعاين / الفني</th>
                  <th className="p-3.5">تاريخ الطلب</th>
                  <th className="p-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {claims.map((claim) => {
                  const statusInfo = STATUS_CONFIG[claim.claim_status] || STATUS_CONFIG.Open;
                  return (
                    <tr key={claim.claim_id} className="hover:bg-[#F5F5F5]/60 transition">
                      <td className="p-3.5 font-mono font-bold text-[#D62828]">
                        {claim.claim_id}
                      </td>

                      <td className="p-3.5">
                        <button
                          onClick={() => onSelectCustomer360 && onSelectCustomer360(claim.serial_number)}
                          className="font-mono font-bold text-[#111111] hover:text-[#D62828] flex items-center gap-1 group cursor-pointer"
                        >
                          <span>{claim.serial_number}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#D62828] opacity-0 group-hover:opacity-100 transition" />
                        </button>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {claim.warranty_id}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-[#111111] block">{claim.customer_name}</span>
                        <span className="text-[11px] text-slate-500 font-mono" dir="ltr">
                          {claim.phone}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-700 block">{claim.complaint_type}</span>
                        <span className="text-[11px] text-slate-500 max-w-[200px] truncate block">
                          {claim.complaint_description}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-block ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600">
                        {claim.assigned_to ? (
                          <span className="font-medium">{claim.assigned_to}</span>
                        ) : (
                          <span className="text-slate-400 italic">غير مسند بعد</span>
                        )}
                        {claim.inspection_date && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {claim.inspection_date}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(claim.created_at).toLocaleDateString('ar-EG')}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenWorkflowModal(claim)}
                            className="px-3 py-1.5 bg-[#111111] hover:bg-[#D62828] text-white rounded-lg font-bold text-xs transition flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>معالجة</span>
                          </button>

                          {claim.claim_status === 'Approved' && onOpenReplacementFromClaim && (
                            <button
                              onClick={() => onOpenReplacementFromClaim(claim)}
                              className="px-2.5 py-1.5 bg-[#D62828] hover:bg-[#B71C1C] text-white rounded-lg font-bold text-xs transition flex items-center gap-1 shadow-xs cursor-pointer"
                              title="إصدار استبدال مباشر"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                              <span>استبدال</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Workflow Action Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E5E7EB] overflow-hidden my-8 text-right font-sans">
            {/* Modal Header */}
            <div className="bg-[#111111] text-white px-6 py-4 flex items-center justify-between border-b border-[#E5E7EB]/20 relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#D62828]" />
              <div>
                <h3 className="text-base font-black font-['Cairo'] flex items-center gap-2">
                  <span>تحديث إجراءات الفحص والضمان</span>
                  <span className="text-xs px-2 py-0.5 bg-[#D62828] text-white rounded-full font-mono font-bold">
                    {selectedClaim.claim_id}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  المرتبة: {selectedClaim.serial_number} | العميل: {selectedClaim.customer_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#D62828] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateWorkflow} className="p-6 space-y-4">
              {updateError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
                  {updateError}
                </div>
              )}

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  حالة الطلب الحالية (Claim Workflow Status) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['Open', 'Under Inspection', 'Approved', 'Rejected', 'Closed'] as ClaimStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setWorkflowStatus(st)}
                        className={`p-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                          workflowStatus === st
                            ? 'bg-[#D62828] text-white border-[#D62828] shadow-xs'
                            : 'bg-[#F5F5F5] text-[#111111] border-[#E5E7EB] hover:bg-[#E5E7EB]'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Technician & Inspection Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    إسناد إلى فني / مهندس الفحص (Assigned To)
                  </label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="اسم المهندس أو الفني المعاين"
                    className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs focus:bg-white focus:border-[#D62828] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    تاريخ المعاينة الميدانية (Inspection Date)
                  </label>
                  <input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs focus:bg-white focus:border-[#D62828] focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Inspection Findings */}
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  تقرير ونتيجة المعاينة الفنية (Inspection Findings & Measurements)
                </label>
                <textarea
                  rows={2}
                  value={inspectionResult}
                  onChange={(e) => setInspectionResult(e.target.value)}
                  placeholder="مثال: تمت المعاينة وقياس هبوط الشاسيه بمقدار 3.5 سم، وجود كسر في نابض السوست البوكيت ناتج عن عيب تصنيعي..."
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs focus:bg-white focus:border-[#D62828] focus:outline-none"
                />
              </div>

              {/* Resolution / Decision */}
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  قرار وتوصية إدارة الجودة (Resolution & Action)
                </label>
                <textarea
                  rows={2}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="مثال: الموافقة على استبدال المرتبة بالكامل بمرتبة جديدة من نفس المقاس، وإرجاع المرتبة القديمة للمصنع للفحص..."
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs focus:bg-white focus:border-[#D62828] focus:outline-none"
                />
              </div>

              {/* Customer original complaint review */}
              <div className="p-3 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs text-slate-600 space-y-1">
                <span className="font-bold text-[#111111] block">نص شكوى العميل الأصلية:</span>
                <p>{selectedClaim.complaint_description}</p>
                {selectedClaim.images && selectedClaim.images.length > 0 && (
                  <div className="pt-2 flex gap-2">
                    {selectedClaim.images.map((img, idx) => (
                      <a
                        key={idx}
                        href={img}
                        target="_blank"
                        rel="noreferrer"
                        className="w-16 h-12 rounded-lg border border-[#E5E7EB] overflow-hidden block relative group"
                      >
                        <img src={img} alt="Defect" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 flex items-center justify-between border-t border-[#E5E7EB]">
                {workflowStatus === 'Approved' && onOpenReplacementFromClaim && (
                  <button
                    type="button"
                    onClick={() => {
                      const c = selectedClaim;
                      setSelectedClaim(null);
                      onOpenReplacementFromClaim(c);
                    }}
                    className="px-3 py-2 bg-[#D62828]/10 text-[#D62828] hover:bg-[#D62828]/20 border border-[#D62828]/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>متابعة إجراء الاستبدال الآن</span>
                  </button>
                )}

                <div className="flex items-center gap-2 mr-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedClaim(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-[#111111] transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-6 py-2 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-xl text-xs transition disabled:opacity-50 shadow-md shadow-[#D62828]/20 cursor-pointer"
                  >
                    {updating ? 'جاري الحفظ...' : 'حفظ وتحديث الطلب'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
