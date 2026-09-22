import React, { useState, useMemo } from 'react';
import {
  PhoneCall,
  MessageCircle,
  Mail,
  MapPin,
  StickyNote,
  Plus,
  Search,
  Calendar,
  Clock,
  User,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  MessageSquare,
  Shield,
  FileText,
} from 'lucide-react';
import { CustomerCommunication, CustomerCommunicationType } from '../types';

interface CustomerCommunicationsSectionProps {
  communications: CustomerCommunication[];
  serialNumber: string;
  warrantyId?: string;
  customerName?: string;
  customerPhone?: string;
  claimIds?: string[];
  onRefresh: () => void;
  currentUser?: string;
}

const COMMUNICATION_TYPE_CONFIG: Record<
  CustomerCommunicationType,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    badgeBg: string;
    iconColor: string;
    description: string;
  }
> = {
  'مكالمة هاتفية': {
    icon: PhoneCall,
    label: 'مكالمة هاتفية',
    bgColor: 'bg-blue-50/80',
    textColor: 'text-blue-900',
    borderColor: 'border-blue-200',
    badgeBg: 'bg-blue-100 text-blue-800',
    iconColor: 'text-blue-600',
    description: 'مكالمة واردة أو صادرة مع العميل لمتابعة الشكوى أو تفعيل الضمان',
  },
  'واتساب': {
    icon: MessageCircle,
    label: 'واتساب',
    bgColor: 'bg-emerald-50/80',
    textColor: 'text-emerald-900',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    iconColor: 'text-emerald-600',
    description: 'محادثة عبر الواتساب الرسمي واستلام صور وفيديوهات الفحص الفني',
  },
  'بريد إلكتروني': {
    icon: Mail,
    label: 'بريد إلكتروني',
    bgColor: 'bg-purple-50/80',
    textColor: 'text-purple-900',
    borderColor: 'border-purple-200',
    badgeBg: 'bg-purple-100 text-purple-800',
    iconColor: 'text-purple-600',
    description: 'إرسال شهادة الضمان الرقمية، التقارير المعتمدة، أو إشعارات الاستبدال',
  },
  'زيارة': {
    icon: MapPin,
    label: 'زيارة',
    bgColor: 'bg-amber-50/80',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800',
    iconColor: 'text-amber-600',
    description: 'زيارة فنية ميدانية لمعاينة المرتبة بموقع العميل أو زيارة المعرض',
  },
  'ملاحظة داخلية': {
    icon: StickyNote,
    label: 'ملاحظة داخلية',
    bgColor: 'bg-rose-50/70',
    textColor: 'text-rose-950',
    borderColor: 'border-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800',
    iconColor: 'text-[#D62828]',
    description: 'ملاحظة وتوصية فنية داخلية بين أقسام الجودة وخدمة العملاء',
  },
};

const SUGGESTED_USERS = [
  'د. منى الشريف (خدمة العملاء)',
  'ريم السيد (الدعم الفني والعملاء)',
  'فني محمد فتحي (فحص وضمان الجودة)',
  'فني طارق المنشاوي (الصيانة السريعة)',
  'م. إبراهيم الجوهري (مدير الجودة)',
  'أحمد فهمي (خدمة ما بعد البيع)',
];

export const CustomerCommunicationsSection: React.FC<CustomerCommunicationsSectionProps> = ({
  communications = [],
  serialNumber,
  warrantyId,
  customerName,
  customerPhone,
  claimIds = [],
  onRefresh,
  currentUser = 'د. منى الشريف (خدمة العملاء)',
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formType, setFormType] = useState<CustomerCommunicationType>('مكالمة هاتفية');
  const [formDateTime, setFormDateTime] = useState<string>(() => {
    const now = new Date();
    // format as YYYY-MM-DDTHH:mm for datetime-local input
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [formResponsibleUser, setFormResponsibleUser] = useState(currentUser);
  const [formDetails, setFormDetails] = useState('');
  const [formReference, setFormReference] = useState<string>(
    claimIds.length > 0 ? claimIds[0] : warrantyId || ''
  );

  // Filtered & sorted communications
  const filteredCommunications = useMemo(() => {
    return [...communications]
      .filter((c) => {
        if (selectedTypeFilter !== 'ALL' && c.communication_type !== selectedTypeFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchDetails = c.details?.toLowerCase().includes(q);
          const matchUser = c.responsible_user?.toLowerCase().includes(q);
          const matchRef = c.related_reference?.toLowerCase().includes(q);
          const matchType = c.communication_type?.toLowerCase().includes(q);
          return matchDetails || matchUser || matchRef || matchType;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());
  }, [communications, selectedTypeFilter, searchQuery]);

  // Statistics counts
  const stats = useMemo(() => {
    const counts = {
      total: communications.length,
      'مكالمة هاتفية': 0,
      'واتساب': 0,
      'بريد إلكتروني': 0,
      'زيارة': 0,
      'ملاحظة داخلية': 0,
    };
    for (const c of communications) {
      if (counts[c.communication_type] !== undefined) {
        counts[c.communication_type]++;
      }
    }
    return counts;
  }, [communications]);

  const handleOpenAddModal = (presetType?: CustomerCommunicationType) => {
    if (presetType) {
      setFormType(presetType);
    }
    const now = new Date();
    setFormDateTime(
      new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    );
    setFormDetails('');
    setSubmitError(null);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDetails.trim()) {
      setSubmitError('يرجى كتابة تفاصيل أو ملاحظات التواصل');
      return;
    }
    if (!formResponsibleUser.trim()) {
      setSubmitError('يرجى تحديد اسم المستخدم المسؤول');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        serial_number: serialNumber,
        warranty_id: warrantyId,
        customer_name: customerName,
        customer_phone: customerPhone,
        communication_type: formType,
        date_time: new Date(formDateTime).toISOString(),
        responsible_user: formResponsibleUser.trim(),
        details: formDetails.trim(),
        related_reference: formReference.trim() || null,
      };

      const res = await fetch('/api/customer-service/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'فشل تسجيل التواصل');
      }

      setIsAddModalOpen(false);
      setFormDetails('');
      onRefresh();
    } catch (err: any) {
      setSubmitError(err.message || 'حدث خطأ أثناء حفظ التواصل');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/customer-service/communications/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'فشل حذف سجل التواصل');
      setDeleteId(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateTimeArabic = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;

      const datePart = date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });

      const timePart = date.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return `${datePart} - ${timePart}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Top Banner & Action Header */}
      <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#D62828]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#111111] font-['Cairo'] flex items-center gap-2">
                <span>سجل التواصل مع العميل</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-[#D62828] font-mono font-bold">
                  {communications.length} تفاعلات
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                توثيق فوري وموحد لكافة المكالمات ورسائل الواتساب والزيارات الميدانية والملاحظات الداخلية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            id="btn-add-customer-comm"
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 bg-[#D62828] hover:bg-[#B71C1C] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة تواصل جديد</span>
          </button>
        </div>
      </div>

      {/* Metrics & Channel Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* All filter */}
        <button
          type="button"
          onClick={() => setSelectedTypeFilter('ALL')}
          className={`p-3.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
            selectedTypeFilter === 'ALL'
              ? 'bg-[#111111] text-white border-[#111111] shadow-xs'
              : 'bg-white text-slate-700 border-[#E5E7EB] hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] font-bold block opacity-80">كل التفاعلات</span>
          <span className="text-xl font-black font-mono mt-1">{stats.total}</span>
        </button>

        {/* 1. مكالمة هاتفية */}
        <button
          type="button"
          onClick={() => setSelectedTypeFilter('مكالمة هاتفية')}
          className={`p-3.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
            selectedTypeFilter === 'مكالمة هاتفية'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold">مكالمات هاتفية</span>
            <PhoneCall className="w-3.5 h-3.5" />
          </div>
          <span className="text-xl font-black font-mono mt-1">{stats['مكالمة هاتفية']}</span>
        </button>

        {/* 2. واتساب */}
        <button
          type="button"
          onClick={() => setSelectedTypeFilter('واتساب')}
          className={`p-3.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
            selectedTypeFilter === 'واتساب'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold">واتساب</span>
            <MessageCircle className="w-3.5 h-3.5" />
          </div>
          <span className="text-xl font-black font-mono mt-1">{stats['واتساب']}</span>
        </button>

        {/* 3. بريد إلكتروني */}
        <button
          type="button"
          onClick={() => setSelectedTypeFilter('بريد إلكتروني')}
          className={`p-3.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
            selectedTypeFilter === 'بريد إلكتروني'
              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
              : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold">بريد إلكتروني</span>
            <Mail className="w-3.5 h-3.5" />
          </div>
          <span className="text-xl font-black font-mono mt-1">{stats['بريد إلكتروني']}</span>
        </button>

        {/* 4. زيارة */}
        <button
          type="button"
          onClick={() => setSelectedTypeFilter('زيارة')}
          className={`p-3.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
            selectedTypeFilter === 'زيارة'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold">زيارات ميدانية</span>
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <span className="text-xl font-black font-mono mt-1">{stats['زيارة']}</span>
        </button>

        {/* 5. ملاحظة داخلية */}
        <button
          type="button"
          onClick={() => setSelectedTypeFilter('ملاحظة داخلية')}
          className={`p-3.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
            selectedTypeFilter === 'ملاحظة داخلية'
              ? 'bg-[#D62828] text-white border-[#D62828] shadow-xs'
              : 'bg-white text-rose-900 border-rose-200 hover:bg-rose-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold">ملاحظات داخلية</span>
            <StickyNote className="w-3.5 h-3.5" />
          </div>
          <span className="text-xl font-black font-mono mt-1">{stats['ملاحظة داخلية']}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="بحث في تفاصيل التواصل أو اسم المسؤول..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#D62828] transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-xs text-slate-500">
            عرض {filteredCommunications.length} من أصل {communications.length} تواصل
          </span>
          {selectedTypeFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('ALL')}
              className="text-xs text-[#D62828] hover:underline font-bold mr-2 cursor-pointer"
            >
              إلغاء التصفية
            </button>
          )}
        </div>
      </div>

      {/* Chronological Communications List */}
      {filteredCommunications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h4 className="text-sm font-bold text-[#111111]">لا توجد سجلات تواصل مطابقة</h4>
            <p className="text-xs text-slate-500">
              {searchQuery || selectedTypeFilter !== 'ALL'
                ? 'لم يتم العثور على نتائج تطابق معايير البحث والتصفية المحددة.'
                : 'لم يتم تسجيل أي تواصل مع هذا العميل حتى الآن. يمكنك بدء تسجيل أول مكالمة أو رسالة الآن.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2 bg-[#D62828] hover:bg-[#B71C1C] text-white rounded-xl text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل أول تواصل</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-y-0 before:right-6 before:w-0.5 before:bg-[#E5E7EB] pr-2">
          {filteredCommunications.map((comm) => {
            const config = COMMUNICATION_TYPE_CONFIG[comm.communication_type] || COMMUNICATION_TYPE_CONFIG['مكالمة هاتفية'];
            const Icon = config.icon;

            return (
              <div
                key={comm.id}
                id={`comm-${comm.id}`}
                className="relative pr-12 transition group"
              >
                {/* Timeline Icon Node */}
                <div
                  className={`w-9 h-9 rounded-xl ${config.badgeBg} border ${config.borderColor} absolute right-1.5 top-3 flex items-center justify-center z-10 shadow-xs group-hover:scale-105 transition`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Communication Card */}
                <div className={`bg-white rounded-2xl border ${config.borderColor} p-5 shadow-xs hover:shadow-md transition space-y-3`}>
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${config.borderColor} ${config.badgeBg} flex items-center gap-1.5`}>
                        <Icon className="w-3.5 h-3.5" />
                        <span>{comm.communication_type}</span>
                      </span>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateTimeArabic(comm.date_time)}</span>
                      </div>

                      {comm.related_reference && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-mono rounded border border-slate-200">
                          مرجع: {comm.related_reference}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-[#111111] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                        <User className="w-3.5 h-3.5 text-[#D62828]" />
                        <span className="font-bold">{comm.responsible_user}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeleteId(comm.id)}
                        className="text-slate-300 hover:text-rose-600 transition p-1 rounded cursor-pointer"
                        title="حذف سجل التواصل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Details Body */}
                  <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans bg-[#FAF7F5] p-3.5 rounded-xl border border-orange-100/60">
                    {comm.details}
                  </div>

                  {/* Card Footer Info */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>كود العملية: {comm.id}</span>
                    {comm.customer_phone && (
                      <span dir="ltr">هاتف العميل: {comm.customer_phone}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: إضافة تواصل جديد */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-[#E5E7EB] shadow-2xl p-6 text-right space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#D62828]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-[#111111] font-['Cairo']">
                    إضافة تواصل جديد مع العميل
                  </h4>
                  <p className="text-xs text-slate-500">
                    توثيق تفاصيل الاتصال والاتفاق الفني لضمان المتابعة وحفظ السجل
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Customer & Product Quick Context */}
            <div className="p-3 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">العميل:</span>
                <span className="font-bold text-[#111111]">{customerName || 'عميل غير مسجل'}</span>
                {customerPhone && <span className="block font-mono text-slate-600 text-[11px]" dir="ltr">{customerPhone}</span>}
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">المرتبة:</span>
                <span className="font-mono font-bold text-[#D62828]">{serialNumber}</span>
                {warrantyId && <span className="block font-mono text-slate-600 text-[11px]">وثيقة: {warrantyId}</span>}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  نوع التواصل <span className="text-[#D62828]">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      'مكالمة هاتفية',
                      'واتساب',
                      'بريد إلكتروني',
                      'زيارة',
                      'ملاحظة داخلية',
                    ] as CustomerCommunicationType[]
                  ).map((type) => {
                    const cfg = COMMUNICATION_TYPE_CONFIG[type];
                    const TypeIcon = cfg.icon;
                    const isSelected = formType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormType(type)}
                        className={`p-3 rounded-xl border text-right transition flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-[#111111] text-white border-[#111111] shadow-xs'
                            : 'bg-white text-slate-700 border-[#E5E7EB] hover:border-slate-300'
                        }`}
                      >
                        <TypeIcon className={`w-4 h-4 ${isSelected ? 'text-white' : cfg.iconColor}`} />
                        <span className="text-xs font-bold">{type}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time + Responsible User */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    التاريخ والوقت <span className="text-[#D62828]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={formDateTime}
                      onChange={(e) => setFormDateTime(e.target.value)}
                      required
                      className="w-full pr-10 pl-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-mono focus:outline-none focus:border-[#D62828]"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    المستخدم المسؤول <span className="text-[#D62828]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="responsible-users-list"
                      value={formResponsibleUser}
                      onChange={(e) => setFormResponsibleUser(e.target.value)}
                      required
                      placeholder="اسم الموظف أو أخصائي الخدمة"
                      className="w-full pr-10 pl-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:outline-none focus:border-[#D62828]"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <datalist id="responsible-users-list">
                      {SUGGESTED_USERS.map((u) => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Related Reference (optional) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  المرجع المرتبط (اختياري)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    placeholder="رقم الشكوى (CLM-...)، رقم الضمان، أو إذن الاستبدال"
                    className="flex-1 px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-mono focus:outline-none focus:border-[#D62828]"
                  />
                  {claimIds.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) setFormReference(e.target.value);
                      }}
                      className="px-3 py-2 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs text-slate-700 font-mono"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        اختر من الشكاوى
                      </option>
                      {claimIds.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Details & Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  تفاصيل أو ملاحظات التواصل <span className="text-[#D62828]">*</span>
                </label>
                <textarea
                  rows={4}
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  required
                  placeholder="سجل ملخص المكالمة أو ما دار في محادثة الواتساب أو تقرير الزيارة الميدانية، والخطوات المتفق عليها مع العميل..."
                  className="w-full p-3 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:outline-none focus:border-[#D62828] leading-relaxed"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#F5F5F5] hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#D62828] hover:bg-[#B71C1C] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>جاري الحفظ...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>حفظ التواصل في السجل</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-right space-y-4 border border-[#E5E7EB] shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-[#111111]">تأكيد حذف سجل التواصل؟</h4>
              <p className="text-xs text-slate-500">
                سيتم حذف هذا التفاعل من سجل العميل بشكل نهائي.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 bg-[#F5F5F5] hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {isDeleting ? 'جاري الحذف...' : 'نعم، حذف السجل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
