import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Wrench,
  ArrowLeftRight,
  ChevronRight,
  Calendar,
  AlertCircle,
  Eye,
  FileCheck,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { WarrantyClaim, ClaimStatus, ComplaintType } from '../../types';

interface ClaimsHistoryTabProps {
  claims: WarrantyClaim[];
  currentSerial: string;
  warrantyId?: string;
  customerName?: string;
  phone?: string;
  onOpenNewClaim: () => void;
  onSelectClaimForInspection: (claim: WarrantyClaim) => void;
  onApproveRepair: (claim: WarrantyClaim) => void;
  onApproveReplacement: (claim: WarrantyClaim) => void;
  onCloseClaim: (claim: WarrantyClaim) => void;
  onLoadCase?: (query: string) => void;
}

const STATUS_CONFIG: Record<
  ClaimStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  Open: {
    label: 'مفتوح (بانتظار المعاينة)',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  'Under Inspection': {
    label: 'قيد الفحص والمعاينة الفنية',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  Approved: {
    label: 'معتمد (للإصلاح / الاستبدال)',
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
    label: 'مغلق (تم الاستبدال / الصيانة)',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
};

const COMPLAINT_LABELS: Record<ComplaintType, string> = {
  'Spring Collapse': 'هبوط / كسر في شاسيه السوست',
  'Foam Collapse': 'هبوط موضعي في طبقات الإسفنج / الفوم',
  'Fabric Defect': 'عيب في القماش الخارجي أو الكابتونيه',
  Noise: 'أصوات احتكاك أو طقطقة غير طبيعية',
  'Manufacturing Defect': 'عيب مصنعي عام أو تشطيب',
  Other: 'شكوى أو عيب آخر',
};

export const ClaimsHistoryTab: React.FC<ClaimsHistoryTabProps> = ({
  claims,
  currentSerial,
  warrantyId,
  customerName,
  phone,
  onOpenNewClaim,
  onSelectClaimForInspection,
  onApproveRepair,
  onApproveReplacement,
  onCloseClaim,
  onLoadCase,
}) => {
  const [viewScope, setViewScope] = useState<'current' | 'all'>('current');
  const [allSystemClaims, setAllSystemClaims] = useState<WarrantyClaim[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  const fetchAllClaims = async () => {
    setLoadingAll(true);
    try {
      const res = await fetch('/api/claims');
      if (res.ok) {
        const data = await res.json();
        setAllSystemClaims(data);
      }
    } catch (err) {
      console.error('Error fetching all claims:', err);
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    if (viewScope === 'all' && allSystemClaims.length === 0) {
      fetchAllClaims();
    }
  }, [viewScope]);

  const activeClaimsList = (viewScope === 'current' ? claims : allSystemClaims) || [];

  const filteredClaims = (activeClaimsList || []).filter((claim) => {
    if (statusFilter !== 'ALL' && claim.claim_status !== statusFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchId = claim.claim_id?.toLowerCase().includes(q);
      const matchDesc = claim.complaint_description?.toLowerCase().includes(q);
      const matchCust = claim.customer_name?.toLowerCase().includes(q);
      const matchSerial = claim.serial_number?.toLowerCase().includes(q);
      const matchPhone = claim.phone?.toLowerCase().includes(q);
      if (!matchId && !matchDesc && !matchCust && !matchSerial && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 text-right font-sans">
      {/* 1. Header & Actions */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D62828]/10 text-[#D62828] flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#111111] font-['Cairo'] flex items-center gap-2">
                <span>مركز طلبات الضمان والشكاوى</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D62828] text-white font-mono font-bold">
                  {activeClaimsList.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مراجعة الشكاوى وطلبات الضمان، مؤشرات زمن الحل (SLA)، واتخاذ الإجراءات المباشرة وإصدار قرارات الفحص
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Scope Switcher */}
            <div className="bg-[#F5F5F5] p-1 rounded-2xl flex items-center border border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setViewScope('current')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  viewScope === 'current'
                    ? 'bg-white text-[#111111] shadow-xs'
                    : 'text-slate-600 hover:text-[#111111]'
                }`}
              >
                شكاوى هذه الحالة ({(claims || []).length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewScope('all');
                  if (allSystemClaims.length === 0) fetchAllClaims();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  viewScope === 'all'
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#111111]'
                }`}
              >
                <span>كافة طلبات الضمان في النظام</span>
                {allSystemClaims.length > 0 && (
                  <span className="font-mono text-[10px] opacity-80">({allSystemClaims.length})</span>
                )}
              </button>
            </div>

            {viewScope === 'all' && (
              <button
                type="button"
                onClick={fetchAllClaims}
                disabled={loadingAll}
                className="p-2.5 bg-[#F5F5F5] hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAll ? 'animate-spin' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenNewClaim}
              className="px-4 py-2.5 bg-[#D62828] hover:bg-[#B71C1C] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-[#D62828]/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء شكوى / بلاغ جديد</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 pt-5 items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 text-xs">
            {['ALL', 'Open', 'Under Inspection', 'Approved', 'Rejected', 'Closed'].map((st) => {
              const count =
                st === 'ALL'
                  ? activeClaimsList.length
                  : activeClaimsList.filter((c) => c.claim_status === st).length;
              const labels: Record<string, string> = {
                ALL: 'كافة الحالات',
                Open: 'مفتوح',
                'Under Inspection': 'قيد الفحص',
                Approved: 'معتمد',
                Rejected: 'مرفوض',
                Closed: 'مغلق',
              };
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === st
                      ? 'bg-[#111111] text-white shadow-xs'
                      : 'bg-[#F5F5F5] text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{labels[st]}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      statusFilter === st ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="بحث بالرقم، العميل، الهاتف، أو السيريال..."
              className="w-full px-3 py-2 pr-9 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs text-[#111111] focus:bg-white focus:border-[#D62828] focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. Claims Cards List */}
      {filteredClaims.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-[#E5E7EB] shadow-xs space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h4 className="text-base font-black text-[#111111]">لا توجد شكاوى مطابقة لمعايير البحث</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {claims.length === 0
              ? 'سجل العميل نظيف ولا توجد عليه أي بلاغات مسجلة حتى الآن. يمكنك إنشاء بلاغ جديد متى لزم الأمر.'
              : 'جرب تغيير فلتر الحالة للوصول إلى الشكاوى المطلوبة.'}
          </p>
          {claims.length === 0 && (
            <button
              onClick={onOpenNewClaim}
              className="mt-2 px-4 py-2 bg-[#D62828] text-white rounded-xl text-xs font-bold transition hover:bg-[#B71C1C] cursor-pointer"
            >
              إنشاء شكوى أولى لهذا المنتج
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim) => {
            const st = STATUS_CONFIG[claim.claim_status] || STATUS_CONFIG.Open;
            const now = new Date();
            const created = new Date(claim.created_at);
            const daysOpen = Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
            const targetDays = claim.target_resolution_days || 7;
            const isClosed = claim.claim_status === 'Closed' || claim.claim_status === 'Approved';
            const isBreached = !isClosed && daysOpen > targetDays;

            return (
              <div
                key={claim.claim_id}
                className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs hover:border-[#D62828]/40 transition space-y-4"
              >
                {/* Top Row: IDs, Dates, Badges & Load Case Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono font-black text-sm text-[#D62828] bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                      {claim.claim_id}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${st.bg} ${st.text} ${st.border}`}
                    >
                      {st.label}
                    </span>
                    {claim.serial_number && (
                      <span className="text-xs px-2.5 py-1 bg-slate-100 rounded-xl font-mono text-slate-700">
                        سيريال: {claim.serial_number}
                      </span>
                    )}
                    {claim.customer_name && (
                      <span className="text-xs font-bold text-[#111111] bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                        العميل: {claim.customer_name} {claim.phone ? `(${claim.phone})` : ''}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(claim.created_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>

                  {/* SLA Indicator & Load Case Button */}
                  <div className="flex items-center gap-2">
                    {onLoadCase && claim.serial_number && (
                      <button
                        type="button"
                        onClick={() => onLoadCase(claim.serial_number)}
                        className="px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition flex items-center gap-1 cursor-pointer shadow-xs"
                        title="فتح ملف هذه الحالة في خدمة العملاء 360"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>فتح بطاقة الحالة</span>
                      </button>
                    )}
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl border font-mono flex items-center gap-1.5 ${
                        isBreached
                          ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                          : isClosed
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {daysOpen} يوم منذ الفتح (المستهدف: {targetDays} أيام)
                      </span>
                    </span>
                  </div>
                </div>

                {/* Complaint Body */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#111111]">
                      <span className="px-2 py-0.5 bg-[#F5F5F5] rounded-md text-slate-700">
                        نوع العيب المشكو منه:
                      </span>
                      <span className="text-[#D62828]">
                        {COMPLAINT_LABELS[claim.complaint_type] || claim.complaint_type}
                      </span>
                    </div>

                    <p className="text-slate-700 bg-[#F5F5F5] p-3.5 rounded-2xl border border-[#E5E7EB] leading-relaxed">
                      {claim.complaint_description}
                    </p>

                    {claim.resolution && (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                        <span className="font-bold block text-[11px] mb-0.5">القرار والتسوية المعتمدة:</span>
                        <p className="text-xs">{claim.resolution}</p>
                      </div>
                    )}
                  </div>

                  {/* Inspector / Technical Side Info */}
                  <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] space-y-2 text-xs flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">
                        متابعة الفحص والمعاينة
                      </span>
                      <div>
                        <span className="text-slate-500 block text-[11px]">الفني أو المهندس المعاين:</span>
                        <span className="font-bold text-[#111111] block mt-0.5">
                          {claim.assigned_to || 'لم يتم تعيين فني بعد'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">تاريخ المعاينة الفنية:</span>
                        <span className="font-mono text-slate-800 block mt-0.5">
                          {claim.inspection_date
                            ? new Date(claim.inspection_date).toLocaleDateString('ar-EG')
                            : 'بانتظار تحديد موعد الزيارة'}
                        </span>
                      </div>
                    </div>

                    {/* Direct Quick Action Buttons */}
                    <div className="pt-3 border-t border-[#E5E7EB] flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectClaimForInspection(claim)}
                        className="flex-1 px-2.5 py-1.5 bg-[#111111] hover:bg-black text-white font-bold rounded-xl text-[11px] transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-[#D4AF37]" />
                        <span>المعاينة والجودة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onApproveRepair(claim)}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[11px] transition flex items-center gap-1 cursor-pointer"
                        title="اعتماد الإصلاح والصيانة"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>إصلاح</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onApproveReplacement(claim)}
                        className="px-2.5 py-1.5 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-xl text-[11px] transition flex items-center gap-1 cursor-pointer"
                        title="اعتماد وإصدار استبدال رسمي"
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>استبدال</span>
                      </button>

                      {claim.claim_status !== 'Closed' && (
                        <button
                          type="button"
                          onClick={() => onCloseClaim(claim)}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-[11px] transition flex items-center gap-1 cursor-pointer"
                          title="إغلاق التذكرة نهائياً"
                        >
                          <FileCheck className="w-3 h-3" />
                          <span>إغلاق</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
