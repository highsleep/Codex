import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Factory,
  Truck,
  ShoppingBag,
  ShieldCheck,
  AlertTriangle,
  ClipboardCheck,
  Wrench,
  ArrowLeftRight,
  CheckCircle2,
  Search,
  Filter,
  ArrowUpDown,
  Hash,
  User,
  Copy,
  Check,
  FileText,
  Sparkles,
} from 'lucide-react';
import { UnifiedTimelineEvent, UnifiedEventType } from '../types';

interface UnifiedTimelineProps {
  events: UnifiedTimelineEvent[];
  serialNumber?: string;
  productModel?: string;
  customerName?: string;
  compact?: boolean;
}

const EVENT_TYPE_CONFIG: Record<
  UnifiedEventType,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    dotColor: string;
    ringColor: string;
  }
> = {
  الإنتاج: {
    icon: Factory,
    label: 'الإنتاج',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-600',
    ringColor: 'ring-blue-100',
  },
  الشحن: {
    icon: Truck,
    label: 'الشحن',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-800',
    borderColor: 'border-indigo-200',
    dotColor: 'bg-indigo-600',
    ringColor: 'ring-indigo-100',
  },
  البيع: {
    icon: ShoppingBag,
    label: 'البيع',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-600',
    ringColor: 'ring-amber-100',
  },
  'تفعيل الضمان': {
    icon: ShieldCheck,
    label: 'تفعيل الضمان',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-200',
    dotColor: 'bg-emerald-600',
    ringColor: 'ring-emerald-100',
  },
  'فتح شكوى': {
    icon: AlertTriangle,
    label: 'فتح شكوى',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
    dotColor: 'bg-orange-600',
    ringColor: 'ring-orange-100',
  },
  المعاينة: {
    icon: ClipboardCheck,
    label: 'المعاينة',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-800',
    borderColor: 'border-sky-200',
    dotColor: 'bg-sky-600',
    ringColor: 'ring-sky-100',
  },
  الإصلاح: {
    icon: Wrench,
    label: 'الإصلاح',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-300',
    dotColor: 'bg-amber-500',
    ringColor: 'ring-amber-100',
  },
  الاستبدال: {
    icon: ArrowLeftRight,
    label: 'الاستبدال',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-200',
    dotColor: 'bg-purple-600',
    ringColor: 'ring-purple-100',
  },
  'إغلاق الطلب': {
    icon: CheckCircle2,
    label: 'إغلاق الطلب',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-800',
    borderColor: 'border-teal-200',
    dotColor: 'bg-teal-600',
    ringColor: 'ring-teal-100',
  },
};

export const UnifiedTimeline: React.FC<UnifiedTimelineProps> = ({
  events = [],
  serialNumber,
  productModel,
  customerName,
  compact = false,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // Strictly newest first by default
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Available filter options based on events present
  const availableTypes = useMemo(() => {
    const types = new Set<UnifiedEventType>();
    events.forEach((e) => types.add(e.event_type));
    return Array.from(types);
  }, [events]);

  // Filter & Sort
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Filter by type
    if (filterType !== 'ALL') {
      result = result.filter((e) => e.event_type === filterType);
    }

    // Filter by search text
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.short_description.toLowerCase().includes(q) ||
          e.event_type.toLowerCase().includes(q) ||
          e.date.toLowerCase().includes(q) ||
          (e.reference_id && e.reference_id.toLowerCase().includes(q)) ||
          (e.performed_by && e.performed_by.toLowerCase().includes(q))
      );
    }

    // Sort order: default desc (newest to oldest)
    result.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [events, filterType, searchQuery, sortOrder]);

  const handleCopyRef = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'اليوم';
      if (diffDays === 1) return 'أمس';
      if (diffDays > 0 && diffDays < 30) return `منذ ${diffDays} يوم`;
      if (diffDays >= 30 && diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} شهر`;
      if (diffDays >= 365) return `منذ ${Math.floor(diffDays / 365)} سنة`;
      return '';
    } catch {
      return '';
    }
  };

  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Clock className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-[#111111]">لا توجد أحداث مسجلة في السجل الزمني</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          لم يتم تسجيل أي وقائع إنتاجية أو بيعية أو ضمانية لهذه المرتبة حتى الآن.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-[#E5E7EB] overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 border-b border-[#E5E7EB] bg-gradient-to-r from-slate-50 via-white to-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#D62828]/10 text-[#D62828]">
              <Clock className="w-5 h-5" />
            </span>
            <h3 className="text-base font-black text-[#111111] font-['Cairo'] flex items-center gap-2">
              <span>السجل الزمني الموحد</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {events.length} حدث
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-['Cairo']">
            مسار المنتج والضمان الموحد من مرحلة التصنيع حتى إغلاق الطلبات (مرتب من الأحدث إلى الأقدم)
          </p>
        </div>

        {/* Controls: Search, Filter, Sort Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[190px]">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث في الأحداث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-hidden focus:border-[#D62828] transition"
            />
          </div>

          {/* Sort Toggle Button */}
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            title={sortOrder === 'desc' ? 'الترتيب: من الأحدث إلى الأقدم' : 'الترتيب: من الأقدم إلى الأحدث'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-[#E5E7EB] rounded-xl transition cursor-pointer shadow-2xs"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>{sortOrder === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="px-5 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 flex-shrink-0">
          <Filter className="w-3 h-3" />
          <span>تصفية:</span>
        </span>

        <button
          type="button"
          onClick={() => setFilterType('ALL')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer ${
            filterType === 'ALL'
              ? 'bg-[#111111] text-white shadow-2xs'
              : 'bg-white text-slate-600 border border-[#E5E7EB] hover:bg-slate-100'
          }`}
        >
          الكل ({events.length})
        </button>

        {availableTypes.map((type) => {
          const count = events.filter((e) => e.event_type === type).length;
          const conf = EVENT_TYPE_CONFIG[type];
          const Icon = conf?.icon || Clock;
          const isSelected = filterType === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 flex-shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#D62828] text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-[#E5E7EB] hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{type}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline Stream */}
      <div className="p-6">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            لا توجد أحداث مطابقة لمعايير البحث أو التصفية الحالية.
          </div>
        ) : (
          <div className="relative">
            {/* Continuous Vertical Guide Line */}
            <div className="absolute top-4 bottom-4 right-[23px] w-0.5 bg-slate-200" />

            <div className="space-y-6">
              {filteredEvents.map((event, index) => {
                const conf = EVENT_TYPE_CONFIG[event.event_type] || {
                  icon: Clock,
                  label: event.event_type,
                  bgColor: 'bg-slate-50',
                  textColor: 'text-slate-800',
                  borderColor: 'border-slate-200',
                  dotColor: 'bg-slate-500',
                  ringColor: 'ring-slate-100',
                };
                const Icon = conf.icon;
                const isFirst = index === 0;
                const relativeTime = getRelativeTime(event.date);

                return (
                  <div key={event.id || `${event.event_type}-${index}`} className="relative flex items-start gap-4">
                    {/* Node Dot / Icon Circle */}
                    <div
                      className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border ${
                        conf.bgColor
                      } ${conf.borderColor} ${conf.textColor} shadow-xs ${
                        isFirst ? 'ring-4 ring-[#D62828]/10' : ''
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {isFirst && sortOrder === 'desc' && (
                        <span
                          title="أحدث حدث"
                          className="absolute -top-1.5 -right-1.5 flex h-3 w-3"
                        >
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D62828] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D62828]"></span>
                        </span>
                      )}
                    </div>

                    {/* Content Card */}
                    <div className="flex-1 bg-[#F9FAFB] hover:bg-white transition-all rounded-2xl border border-[#E5E7EB] hover:border-slate-300 p-4 shadow-2xs space-y-2">
                      {/* Top Row: Type Badge + Date + Relative Time */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 ${conf.bgColor} ${conf.textColor} ${conf.borderColor}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{event.event_type}</span>
                          </span>

                          {event.status_badge && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                              {event.status_badge}
                            </span>
                          )}
                        </div>

                        {/* Date & Time */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-700">
                            {event.formatted_date || event.date.slice(0, 10)}
                          </span>
                          {relativeTime && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600 font-sans">
                              {relativeTime}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle: Short Description (وصف مختصر) */}
                      <p className="text-xs text-[#111111] leading-relaxed font-['Cairo'] font-medium">
                        {event.short_description}
                      </p>

                      {/* Bottom Row: Metadata & Performed By */}
                      {(event.performed_by || event.reference_id) && (
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                          {event.performed_by && (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-600 font-semibold">{event.performed_by}</span>
                            </div>
                          )}

                          {event.reference_id && (
                            <div className="flex items-center gap-1.5 font-mono">
                              <Hash className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-600 font-bold">{event.reference_id}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyRef(event.id, event.reference_id!)}
                                title="نسخ المرجع"
                                className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                              >
                                {copiedId === event.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Insight Summary */}
      <div className="px-6 py-3 bg-[#F5F5F5] border-t border-[#E5E7EB] flex flex-wrap items-center justify-between text-xs text-slate-500 font-['Cairo']">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D62828]" />
          <span>
            سجل التدقيق موثق رقمياً ومتوافق مع منظومة تتبع الجودة ومسار العميل 360.
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span>إجمالي الوقائع: {events.length}</span>
          <span>المعروض حالياً: {filteredEvents.length}</span>
        </div>
      </div>
    </div>
  );
};
