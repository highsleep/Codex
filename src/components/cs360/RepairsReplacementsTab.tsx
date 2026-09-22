import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Wrench,
  Plus,
  Award,
  CheckCircle2,
  Calendar,
  User,
  Printer,
  FileText,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Building,
  UserCheck,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Replacement, Product, WarrantyActivation, WarrantyClaim, AppUser } from '../../types';

interface RepairsReplacementsTabProps {
  product: Product;
  activation: WarrantyActivation | null;
  replacements: Replacement[];
  replacementOrigin?: Replacement | null;
  claims: WarrantyClaim[];
  currentUser?: AppUser | null;
  onRefresh: () => void;
  onOpenReplacementModal: () => void;
  onViewReplacementCertificate: (rep: Replacement) => void;
  onLoadCase?: (serialOrWarranty: string) => void;
}

export const RepairsReplacementsTab: React.FC<RepairsReplacementsTabProps> = ({
  product,
  activation,
  replacements,
  replacementOrigin,
  claims,
  currentUser,
  onRefresh,
  onOpenReplacementModal,
  onViewReplacementCertificate,
  onLoadCase,
}) => {
  const [subTab, setSubTab] = useState<'replacements' | 'repairs'>('replacements');
  const [viewScope, setViewScope] = useState<'case' | 'all'>('case');
  const [allReplacements, setAllReplacements] = useState<Replacement[]>([]);
  const [allClaims, setAllClaims] = useState<WarrantyClaim[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAllData = async () => {
    setLoadingAll(true);
    try {
      const [repRes, clmRes] = await Promise.all([
        fetch('/api/replacements'),
        fetch('/api/claims'),
      ]);
      if (repRes.ok) {
        const rData = await repRes.json();
        setAllReplacements(rData);
      }
      if (clmRes.ok) {
        const cData = await clmRes.json();
        setAllClaims(cData);
      }
    } catch (err) {
      console.error('Error fetching all replacements and repairs:', err);
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    if (viewScope === 'all' && allReplacements.length === 0) {
      fetchAllData();
    }
  }, [viewScope]);

  // Filter approved repair claims
  const caseRepairClaims = claims.filter(
    (c) =>
      c.claim_status === 'Approved' &&
      c.resolution &&
      (c.resolution.includes('إصلاح') || c.resolution.includes('صيانة'))
  );

  const allSystemRepairClaims = allClaims.filter(
    (c) =>
      c.claim_status === 'Approved' &&
      c.resolution &&
      (c.resolution.includes('إصلاح') || c.resolution.includes('صيانة'))
  );

  const displayedReplacements = (viewScope === 'case' ? replacements : allReplacements).filter((rep) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rep.replacement_id?.toLowerCase().includes(q) ||
      rep.old_serial_number?.toLowerCase().includes(q) ||
      rep.new_serial_number?.toLowerCase().includes(q) ||
      rep.replacement_reason?.toLowerCase().includes(q) ||
      rep.approved_by?.toLowerCase().includes(q)
    );
  });

  const displayedRepairs = (viewScope === 'case' ? caseRepairClaims : allSystemRepairClaims).filter((rc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rc.claim_id?.toLowerCase().includes(q) ||
      rc.serial_number?.toLowerCase().includes(q) ||
      rc.customer_name?.toLowerCase().includes(q) ||
      rc.resolution?.toLowerCase().includes(q) ||
      rc.assigned_to?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-right font-sans">
      {/* Top Switcher: Replacements vs Repairs */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D62828]/10 text-[#D62828] flex items-center justify-center">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#111111] font-['Cairo']">
                إدارة الإصلاحات والاستبدالات
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                اعتماد أذونات الاستبدال الفوري، إصدار الشهادات الرسمية، ومتابعة ورش الصيانة والإصلاح
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Scope Toggle */}
            <div className="bg-[#F5F5F5] p-1 rounded-2xl flex items-center border border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setViewScope('case')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  viewScope === 'case'
                    ? 'bg-white text-[#111111] shadow-xs'
                    : 'text-slate-600 hover:text-[#111111]'
                }`}
              >
                لهذه الحالة
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewScope('all');
                  if (allReplacements.length === 0) fetchAllData();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  viewScope === 'all'
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#111111]'
                }`}
              >
                <span>كافة الاستبدالات والإصلاحات</span>
                {allReplacements.length > 0 && (
                  <span className="font-mono text-[10px] opacity-80">({allReplacements.length})</span>
                )}
              </button>
            </div>

            {viewScope === 'all' && (
              <button
                type="button"
                onClick={fetchAllData}
                disabled={loadingAll}
                className="p-2 bg-[#F5F5F5] hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAll ? 'animate-spin' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenReplacementModal}
              className="px-4 py-2 bg-[#111111] hover:bg-black text-[#D4AF37] hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>+ إصدار إذن استبدال جديد</span>
            </button>
          </div>
        </div>

        {/* Sub-tab Selection & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSubTab('replacements')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subTab === 'replacements'
                  ? 'bg-[#D62828] text-white shadow-xs'
                  : 'bg-[#F5F5F5] text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>
                إدارة الاستبدال (
                {viewScope === 'case'
                  ? replacements.length + (replacementOrigin ? 1 : 0)
                  : allReplacements.length}
                )
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('repairs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                subTab === 'repairs'
                  ? 'bg-[#D62828] text-white shadow-xs'
                  : 'bg-[#F5F5F5] text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>
                أوامر الإصلاح والصيانة (
                {viewScope === 'case' ? caseRepairClaims.length : allSystemRepairClaims.length})
              </span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالرقم، السيريال، السبب، أو الفني..."
              className="w-full px-3 py-2 pr-9 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs text-[#111111] focus:bg-white focus:border-[#D62828] focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Origin replacement banner if this product was delivered as replacement */}
        {replacementOrigin && (
          <div className="mt-5 p-4 bg-purple-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold block text-sm">هذه المرتبة هي بديل رسمي معتمد تم تسليمه للعميل</span>
                <span className="text-[11px] text-purple-700">
                  استبدلت المرتبة السابقة: <strong className="font-mono">{replacementOrigin.old_serial_number}</strong> بموجب إذن رقم: <strong className="font-mono">{replacementOrigin.replacement_id}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onViewReplacementCertificate(replacementOrigin)}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-end sm:self-auto"
            >
              <Award className="w-3.5 h-3.5" />
              <span>عرض شهادة الاستبدال السابقة</span>
            </button>
          </div>
        )}
      </div>

      {/* Subtab 1: Replacements */}
      {subTab === 'replacements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-[#111111] font-['Cairo'] flex items-center gap-2">
              <span>سجلات وأذونات الاستبدال المسجلة</span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full font-mono text-slate-700">
                {displayedReplacements.length} إذن
              </span>
            </h4>
          </div>

          {displayedReplacements.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#E5E7EB] shadow-xs space-y-3">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-black text-[#111111]">
                {viewScope === 'case'
                  ? 'لم يُصدر إذن استبدال لهذه المرتبة حتى الآن'
                  : 'لا توجد أذونات استبدال مطابقة للبحث'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {viewScope === 'case'
                  ? 'في حال وجود عيب تصنيع هيكلي تم إقراره في تقرير المعاينة، يمكنك إصدار إذن استبدال فوري وطباعة الشهادة الرسمية للعميل.'
                  : 'جرب البحث برقم إذن آخر أو مسح عبارة البحث.'}
              </p>
              {viewScope === 'case' && (
                <button
                  type="button"
                  onClick={onOpenReplacementModal}
                  className="mt-2 px-5 py-2.5 bg-[#D62828] hover:bg-[#B71C1C] text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  إصدار إذن استبدال رسمي الآن
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {displayedReplacements.map((rep) => (
                <div
                  key={rep.replacement_id}
                  className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-4 hover:border-[#D4AF37]/50 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm text-[#D4AF37] bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                        {rep.replacement_id}
                      </span>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                        استبدال معتمد رسمياً
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {new Date(rep.approval_date).toLocaleDateString('ar-EG')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onLoadCase && (rep.new_serial_number || rep.old_serial_number) && (
                        <button
                          type="button"
                          onClick={() => onLoadCase(rep.new_serial_number || rep.old_serial_number)}
                          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                          title="فتح ملف هذه الحالة في خدمة العملاء 360"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>فتح بطاقة الحالة في 360</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onViewReplacementCertificate(rep)}
                        className="px-3.5 py-1.5 bg-[#111111] hover:bg-black text-[#D4AF37] font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>عرض وطباعة شهادة الاستبدال</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Old Serial */}
                    <div className="p-3.5 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] space-y-1">
                      <span className="text-slate-400 text-[10px] block">المرتبة المستبدلة (التالفة):</span>
                      <span className="font-mono font-bold text-[#D62828] text-sm block">
                        {rep.old_serial_number}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono block">
                        وثيقة: {rep.old_warranty_id}
                      </span>
                    </div>

                    {/* New Serial */}
                    <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-1">
                      <span className="text-emerald-700 text-[10px] block">المرتبة البديلة المصروفة:</span>
                      <span className="font-mono font-bold text-emerald-800 text-sm block">
                        {rep.new_serial_number}
                      </span>
                      <span className="text-[11px] text-emerald-600 font-mono block">
                        وثيقة جديدة: {rep.new_warranty_id || 'سارية بترحيل المدة'}
                      </span>
                    </div>

                    {/* Approval details */}
                    <div className="p-3.5 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] space-y-1">
                      <span className="text-slate-400 text-[10px] block">الاعتماد والمسؤول:</span>
                      <span className="font-bold text-[#111111] block">
                        {rep.approved_by}
                      </span>
                      <span className="text-[11px] text-slate-600 block mt-1">
                        السبب: {rep.replacement_reason}
                      </span>
                    </div>
                  </div>

                  {rep.notes && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                      <strong>ملاحظات التسليم والاسترجاع:</strong> {rep.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Repairs */}
      {subTab === 'repairs' && (
        <div className="space-y-4">
          <h4 className="text-sm font-black text-[#111111] font-['Cairo'] flex items-center gap-2">
            <span>أوامر الإصلاح والصيانة المعتمدة</span>
            <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-mono font-bold">
              {displayedRepairs.length} أمر
            </span>
          </h4>

          {displayedRepairs.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#E5E7EB] shadow-xs space-y-3">
              <Wrench className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-black text-[#111111]">
                {viewScope === 'case' ? 'لا توجد أوامر صيانة جارية لهذه الحالة' : 'لا توجد أوامر صيانة مطابقة للبحث'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                عندما يتم اتخاذ قرار &quot;اعتماد الإصلاح&quot; من تبويب المعاينات وقرارات الجودة، ستظهر مهام الورشة وتفاصيل متابعة الإصلاح هنا.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedRepairs.map((rc) => (
                <div
                  key={rc.claim_id}
                  className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
                        {rc.claim_id}
                      </span>
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-full text-xs font-bold">
                        أمر صيانة معتمد
                      </span>
                      {rc.serial_number && (
                        <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded-xl text-slate-700">
                          سيريال: {rc.serial_number}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {onLoadCase && rc.serial_number && (
                        <button
                          type="button"
                          onClick={() => onLoadCase(rc.serial_number)}
                          className="px-3 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                          title="فتح ملف هذه الحالة في خدمة العملاء 360"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>فتح بطاقة الحالة في 360</span>
                        </button>
                      )}
                      <span className="text-xs font-mono text-slate-500">
                        تاريخ الاعتماد: {new Date(rc.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] text-xs space-y-2">
                    <span className="font-bold text-[#111111] block">توجيهات الورشة الفنية:</span>
                    <p className="text-slate-700">{rc.resolution}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-[#E5E7EB]">
                      <span className="text-slate-400 block text-[10px]">الفني المسؤول:</span>
                      <span className="font-bold text-[#111111] block mt-0.5">
                        {rc.assigned_to || 'فريق صيانة المصنع الرئيسي'}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-[#E5E7EB]">
                      <span className="text-slate-400 block text-[10px]">حالة التسليم للعميل:</span>
                      <span className="font-bold text-emerald-700 block mt-0.5">
                        {rc.claim_status === 'Closed' ? 'تمت الصيانة والتسليم وإغلاق الحالة' : 'جاري العمل بالورشة'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
