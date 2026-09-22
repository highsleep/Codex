import React, { useState } from 'react';
import {
  Calendar,
  User,
  CheckCircle2,
  Clock,
  Wrench,
  ShieldCheck,
  Truck,
  Factory,
  FileCheck,
  AlertCircle,
  Package,
  Plus,
  ArrowDownCircle,
  Sparkles,
} from 'lucide-react';
import { ProductLifecycle, LifecycleEventType } from '../types';

interface LifecycleTimelineProps {
  serialNumber: string;
  timeline: ProductLifecycle[];
  onAddEvent?: (newEvent: Omit<ProductLifecycle, 'id' | 'created_at'>) => Promise<void>;
  readOnly?: boolean;
  currentUser?: string;
}

export const LifecycleTimeline: React.FC<LifecycleTimelineProps> = ({
  serialNumber,
  timeline,
  onAddEvent,
  readOnly = false,
  currentUser = 'إدارة الجودة',
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ProductLifecycle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formType, setFormType] = useState<LifecycleEventType>('Quality Approved');
  const [formNotes, setFormNotes] = useState('');
  const [formRefId, setFormRefId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Format and sort chronological
  const sortedTimeline = [...timeline].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  const getEventMeta = (type: LifecycleEventType) => {
    switch (type) {
      case 'Produced':
        return {
          label: 'تم الإنتاج والتصنيع',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          dotColor: 'bg-blue-600',
          icon: Factory,
        };
      case 'Quality Approved':
        return {
          label: 'معتمد من فحص الجودة',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dotColor: 'bg-emerald-600',
          icon: CheckCircle2,
        };
      case 'Packed':
        return {
          label: 'التغليف الميكانيكي',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          dotColor: 'bg-purple-600',
          icon: Package,
        };
      case 'Shipped':
        return {
          label: 'الشحن للمستودعات المركزية',
          color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          dotColor: 'bg-indigo-600',
          icon: Truck,
        };
      case 'Sold':
        return {
          label: 'البيع وإصدار الفاتورة',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          dotColor: 'bg-amber-600',
          icon: FileCheck,
        };
      case 'Delivered':
        return {
          label: 'تسليم العميل النهائي',
          color: 'bg-teal-100 text-teal-800 border-teal-200',
          dotColor: 'bg-teal-600',
          icon: Truck,
        };
      case 'Warranty Activated':
        return {
          label: 'تفعيل وثيقة الضمان',
          color: 'bg-green-100 text-green-800 border-green-200',
          dotColor: 'bg-green-600',
          icon: ShieldCheck,
        };
      case 'Claim Opened':
        return {
          label: 'فتح بلاغ ضمان',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          dotColor: 'bg-orange-600',
          icon: AlertCircle,
        };
      case 'Inspection Scheduled':
        return {
          label: 'جدولة موعد المعاينة الفنية',
          color: 'bg-sky-100 text-sky-800 border-sky-200',
          dotColor: 'bg-sky-600',
          icon: Calendar,
        };
      case 'Inspection Completed':
        return {
          label: 'اكتمال المعاينة الفنية الميدانية',
          color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
          dotColor: 'bg-cyan-600',
          icon: CheckCircle2,
        };
      case 'Repair Approved':
        return {
          label: 'الموافقة على الإصلاح',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          dotColor: 'bg-yellow-600',
          icon: Wrench,
        };
      case 'Repair Completed':
        return {
          label: 'اكتمال الإصلاح الفني',
          color: 'bg-lime-100 text-lime-800 border-lime-200',
          dotColor: 'bg-lime-600',
          icon: CheckCircle2,
        };
      case 'Replacement Approved':
        return {
          label: 'اعتماد قرار الاستبدال',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
          dotColor: 'bg-rose-600',
          icon: Sparkles,
        };
      case 'Replacement Completed':
        return {
          label: 'إتمام تسليم البديل وسحب القديم',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          dotColor: 'bg-purple-600',
          icon: CheckCircle2,
        };
      case 'Warranty Expired':
        return {
          label: 'انتهاء صلاحية الضمان',
          color: 'bg-stone-200 text-stone-700 border-stone-300',
          dotColor: 'bg-stone-500',
          icon: Clock,
        };
      case 'Archived':
      default:
        return {
          label: 'أرشفة السجل التاريخي',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          dotColor: 'bg-gray-500',
          icon: Clock,
        };
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddEvent) return;
    try {
      setIsSubmitting(true);
      await onAddEvent({
        lifecycle_id: `LC-${Date.now().toString().slice(-6)}`,
        serial_number: serialNumber,
        event_type: formType,
        event_date: new Date(formDate).toISOString(),
        performed_by: currentUser,
        notes: formNotes,
        reference_id: formRefId || null,
      });
      setShowAddModal(false);
      setFormNotes('');
      setFormRefId('');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تسجيل الحدث في سجل دورة الحياة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-[#E5E7EB] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#D62828]" />
            <h3 className="text-lg font-bold text-[#111111] font-['Cairo']">
              سجل دورة حياة المنتج (Product Lifecycle Timeline)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تسلسل زمني غير قابل للتعديل يوثق جميع المراحل من التصنيع حتى انتهاء الضمان للرقم التسلسلي{' '}
            <span className="font-mono font-bold text-[#D62828]">{serialNumber}</span>
          </p>
        </div>

        {!readOnly && onAddEvent && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#D62828] hover:bg-[#B71C1C] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل حدث دورة حياة</span>
          </button>
        )}
      </div>

      {sortedTimeline.length === 0 ? (
        <div className="text-center py-10 text-slate-400 bg-[#F5F5F5] rounded-2xl border border-dashed border-[#E5E7EB]">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
          <p className="font-semibold text-sm text-[#111111]">لا توجد أحداث مسجلة في دورة حياة هذه المرتبة حتى الآن</p>
          <p className="text-xs text-slate-500 mt-1">
            يتم تسجيل الأحداث تلقائياً عند الإنتاج، التفعيل، الشكاوى، والاستبدال.
          </p>
        </div>
      ) : (
        <div className="relative border-r-2 border-[#D62828]/20 pr-6 mr-3 space-y-8">
          {sortedTimeline.map((item, index) => {
            const meta = getEventMeta(item.event_type);
            const Icon = meta.icon;
            const isLast = index === sortedTimeline.length - 1;

            return (
              <div key={item.id || item.lifecycle_id} className="relative group">
                {/* Timeline node dot */}
                <div
                  className={`absolute -right-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow ${meta.dotColor} group-hover:scale-125 transition-transform`}
                />

                {/* Event Card */}
                <div className="bg-stone-50 hover:bg-stone-100/80 border border-stone-200 rounded-xl p-4 transition shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.color}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </span>

                      {item.reference_id && (
                        <span className="text-[11px] font-mono bg-white text-stone-600 px-2 py-0.5 rounded border border-stone-200">
                          مرجع: {item.reference_id}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        {new Date(item.event_date).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-sm text-stone-700 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-stone-100">
                      {item.notes}
                    </p>
                  )}

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-200/60 pt-2">
                    <span className="flex items-center gap-1 font-medium text-stone-600">
                      <User className="w-3 h-3 text-stone-400" />
                      المسؤول / الجهة: {item.performed_by}
                    </span>
                    <span className="font-mono text-stone-400">كود الحدث: {item.lifecycle_id}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Lifecycle Event */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in">
            <h4 className="text-lg font-bold text-stone-900 mb-2">
              تسجيل حدث في دورة حياة المرتبة
            </h4>
            <p className="text-xs text-stone-500 mb-4">
              الرقم التسلسلي: <span className="font-mono font-bold text-indigo-600">{serialNumber}</span>
            </p>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  نوع الحدث (Event Type)
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as LifecycleEventType)}
                  className="w-full text-sm p-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Produced">Produced (اكتمال الإنتاج)</option>
                  <option value="Quality Approved">Quality Approved (اعتماد الجودة)</option>
                  <option value="Packed">Packed (التغليف الفني)</option>
                  <option value="Shipped">Shipped (الشحن والتوزيع)</option>
                  <option value="Delivered">Delivered (التسليم للعميل)</option>
                  <option value="Sold">Sold (البيع بالمعرض)</option>
                  <option value="Warranty Activated">Warranty Activated (تفعيل الضمان)</option>
                  <option value="Claim Opened">Claim Opened (فتح بلاغ صيانة)</option>
                  <option value="Inspection Scheduled">Inspection Scheduled (جدولة معاينة)</option>
                  <option value="Inspection Completed">Inspection Completed (اكتمال المعاينة)</option>
                  <option value="Repair Approved">Repair Approved (اعتماد إصلاح)</option>
                  <option value="Repair Completed">Repair Completed (اكتمال الإصلاح)</option>
                  <option value="Replacement Approved">Replacement Approved (اعتماد استبدال)</option>
                  <option value="Replacement Completed">Replacement Completed (إتمام الاستبدال)</option>
                  <option value="Warranty Expired">Warranty Expired (انتهاء الضمان)</option>
                  <option value="Archived">Archived (أرشفة السجل)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  تاريخ وتوقيت الحدث
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full text-sm p-2.5 border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#D62828]/20 focus:border-[#D62828] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الرقم المرجعي (إن وجد: رقم الفاتورة / أمر التشغيل / كود البلاغ)
                </label>
                <input
                  type="text"
                  placeholder="مثال: ORD-2026-101 أو CLM-2026-001"
                  value={formRefId}
                  onChange={(e) => setFormRefId(e.target.value)}
                  className="w-full text-sm p-2.5 border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#D62828]/20 focus:border-[#D62828] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات وتفاصيل الحدث الفنية
                </label>
                <textarea
                  rows={3}
                  placeholder="اكتب وصفاً دقيقاً لما تم إنجازه في هذه المرحلة..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-sm p-2.5 border border-[#E5E7EB] rounded-xl focus:ring-2 focus:ring-[#D62828]/20 focus:border-[#D62828] outline-none"
                  required
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
                <span className="font-bold">تنبيه أمان وحوكمة:</span> بموجب لوائح الجودة القياسية لشركة سليبي، جميع أحداث دورة الحياة غير قابلة للحذف أو التعديل بعد تسجيلها وتُسجل في سجل التدقيق غير القابل للتلاعب.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#D62828] hover:bg-[#B71C1C] text-white rounded-xl text-sm font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'جاري الحفظ في السجل...' : 'تثبيت الحدث في دورة الحياة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
