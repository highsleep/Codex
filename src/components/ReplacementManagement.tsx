import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Search,
  Plus,
  CheckCircle2,
  FileText,
  Printer,
  ShieldCheck,
  Bed,
  User,
  AlertCircle,
  Clock,
  Award,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Replacement, Product, WarrantyActivation, AppUser } from '../types';

interface ReplacementManagementProps {
  currentUser?: AppUser | null;
  onSelectCustomer360?: (serial: string) => void;
  initialPreloadClaim?: {
    serial_number: string;
    warranty_id: string;
    reason: string;
  } | null;
}

export const ReplacementManagement: React.FC<ReplacementManagementProps> = ({
  currentUser,
  onSelectCustomer360,
  initialPreloadClaim,
}) => {
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [oldSerial, setOldSerial] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [oldWarrantyId, setOldWarrantyId] = useState('');
  const [reason, setReason] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Certificate Modal State
  const [activeCertificate, setActiveCertificate] = useState<Replacement | null>(null);

  const fetchReplacements = async () => {
    setLoading(true);
    try {
      let url = '/api/replacements';
      if (search.trim()) url += `?search=${encodeURIComponent(search.trim())}`;
      const res = await fetch(url);
      const data = await res.json();
      setReplacements(data);
    } catch (err) {
      console.error('Error fetching replacements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplacements();
  }, []);

  useEffect(() => {
    if (initialPreloadClaim) {
      setOldSerial(initialPreloadClaim.serial_number);
      setOldWarrantyId(initialPreloadClaim.warranty_id);
      setReason(initialPreloadClaim.reason);
      setApprovedBy(currentUser ? `${currentUser.name} (${currentUser.role})` : 'د. منى الشريف (مدير رقابة الجودة)');
      setShowModal(true);
    }
  }, [initialPreloadClaim]);

  const handleOpenModal = () => {
    setOldSerial('');
    setNewSerial('');
    setOldWarrantyId('');
    setReason('');
    setApprovedBy(currentUser ? `${currentUser.name} (${currentUser.role})` : 'د. منى الشريف (مدير عام رقابة الجودة)');
    setNotes('');
    setError(null);
    setShowModal(true);
  };

  const handleOldSerialBlur = async () => {
    if (!oldSerial.trim()) return;
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(oldSerial.trim())}`);
      const data = await res.json();
      if (data && data.activation) {
        setOldWarrantyId(data.activation.warranty_id);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldSerial.trim() || !newSerial.trim() || !oldWarrantyId.trim() || !reason.trim() || !approvedBy.trim()) {
      setError('يرجى ملء جميع الحقول الإلزامية');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/replacements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_serial_number: oldSerial.trim().toUpperCase(),
          new_serial_number: newSerial.trim().toUpperCase(),
          old_warranty_id: oldWarrantyId.trim(),
          replacement_reason: reason.trim(),
          approved_by: approvedBy.trim(),
          notes: notes.trim(),
          acting_user: approvedBy.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسجيل إذن الاستبدال');

      setReplacements((prev) => [data.replacement, ...prev]);
      setShowModal(false);
      setActiveCertificate(data.replacement);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-right font-sans">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-[#E5E7EB] flex flex-col md:flex-row gap-4 items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#D62828]" />
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#D62828] text-white flex items-center justify-center shadow-md shadow-[#D62828]/20">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#111111] font-['Cairo'] flex items-center gap-2">
              <span>إدارة استبدال المراتب (Replacement Management)</span>
              <span className="text-xs px-2.5 py-0.5 bg-[#D62828]/10 text-[#D62828] rounded-full font-bold border border-[#D62828]/20">
                {replacements.length} استبدال معتمد
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              ربط المراتب القديمة بالمراتب البديلة وإصدار شهادات استبدال رسمية مطابقة لشروط الضمان
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleOpenModal}
            className="px-4 py-2.5 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-xl text-xs shadow-md shadow-[#D62828]/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إصدار استبدال جديد</span>
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-3xl shadow-xs border border-[#E5E7EB] flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchReplacements()}
            placeholder="بحث برقم إذن الاستبدال، المسلسل القديم، المسلسل الجديد، أو المعتمد..."
            className="w-full px-4 py-2 pr-10 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs focus:bg-white focus:border-[#D62828] focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
        </div>
        <button
          onClick={fetchReplacements}
          className="px-5 py-2 bg-[#111111] hover:bg-[#D62828] text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
        >
          بحث
        </button>
      </div>

      {/* Replacements List */}
      <div className="bg-white rounded-3xl shadow-xs border border-[#E5E7EB] overflow-hidden">
        {replacements.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">لا توجد أذونات استبدال مسجلة حتى الآن</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5F5F5] border-b border-[#E5E7EB] text-slate-600 font-bold">
                <tr>
                  <th className="p-3.5">رقم إذن الاستبدال</th>
                  <th className="p-3.5">المرتبة القديمة (المسترجعة)</th>
                  <th className="p-3.5">المرتبة البديلة (الجديدة)</th>
                  <th className="p-3.5">سبب الاستبدال الفني</th>
                  <th className="p-3.5">المعتمد</th>
                  <th className="p-3.5">تاريخ الاعتماد</th>
                  <th className="p-3.5 text-center">شهادة الاستبدال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {replacements.map((rep) => (
                  <tr key={rep.replacement_id} className="hover:bg-[#F5F5F5]/60 transition">
                    <td className="p-3.5 font-mono font-bold text-[#D62828]">
                      {rep.replacement_id}
                    </td>

                    <td className="p-3.5">
                      <button
                        onClick={() => onSelectCustomer360 && onSelectCustomer360(rep.old_serial_number)}
                        className="font-mono font-bold text-[#111111] hover:text-[#D62828] flex items-center gap-1 group cursor-pointer"
                      >
                        <span>{rep.old_serial_number}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#D62828] opacity-0 group-hover:opacity-100 transition" />
                      </button>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {rep.old_warranty_id}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <button
                        onClick={() => onSelectCustomer360 && onSelectCustomer360(rep.new_serial_number)}
                        className="font-mono font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group cursor-pointer"
                      >
                        <span>{rep.new_serial_number}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-700 opacity-0 group-hover:opacity-100 transition" />
                      </button>
                      {rep.new_warranty_id && (
                        <span className="text-[10px] text-emerald-600 block font-mono">
                          {rep.new_warranty_id}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-700 max-w-[240px]">
                      <span className="line-clamp-2">{rep.replacement_reason}</span>
                    </td>

                    <td className="p-3.5 text-[#111111] font-medium">
                      {rep.approved_by}
                    </td>

                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                      {rep.approval_date}
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setActiveCertificate(rep)}
                        className="px-3 py-1.5 bg-[#111111] hover:bg-[#D62828] text-[#D4AF37] hover:text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 mx-auto shadow-xs cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>عرض الشهادة</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Issue Replacement */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#E5E7EB] overflow-hidden my-8 text-right font-sans">
            <div className="bg-[#111111] text-white px-6 py-4 flex items-center justify-between border-b border-[#E5E7EB]/20 relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#D62828]" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D62828] text-white flex items-center justify-center font-bold shadow-md shadow-[#D62828]/20">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black font-['Cairo']">إصدار وثيقة استبدال مرتبة جديدة</h3>
                  <p className="text-xs text-slate-400">قسم توكيد الجودة - شركة مراتب سليبي (Sleepee)</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#D62828] flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#D62828]" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    الرقم التسلسلي للمرتبة القديمة (المعيبة) *
                  </label>
                  <input
                    type="text"
                    required
                    value={oldSerial}
                    onChange={(e) => setOldSerial(e.target.value)}
                    onBlur={handleOldSerialBlur}
                    placeholder="مثال: SLP-2026-9082"
                    className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs font-mono focus:bg-white focus:border-[#D62828] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    وثيقة الضمان المرتبطة بها *
                  </label>
                  <input
                    type="text"
                    required
                    value={oldWarrantyId}
                    onChange={(e) => setOldWarrantyId(e.target.value)}
                    placeholder="SLP-WRN-XXXX-XXXX"
                    className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs font-mono focus:bg-white focus:border-[#D62828] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  الرقم التسلسلي للمرتبة البديلة (الجديدة من المخزن) *
                </label>
                <input
                  type="text"
                  required
                  value={newSerial}
                  onChange={(e) => setNewSerial(e.target.value)}
                  placeholder="مثال: SLP-2026-9084"
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs font-mono font-bold text-emerald-700 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  سيتم تلقائياً تفعيل وثيقة ضمان جديدة للمرتبة البديلة وربطها بسجل العميل.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  سبب الاستبدال المعتمد (Technical Justification) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: ثبوت عيب مصنعي في كسر نوابض السوست البوكيت بموجب تقرير المعاينة الفنية..."
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs focus:bg-white focus:border-[#D62828] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  معتمد الاستبدال (Approved By) *
                </label>
                <input
                  type="text"
                  required
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="مثال: د. منى الشريف (مدير عام رقابة الجودة)"
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs focus:bg-white focus:border-[#D62828] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  ملاحظات التسليم والاسترجاع (اختياري)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: استلام المرتبة القديمة وإرجاعها للمصنع لفحص الجودة..."
                  className="w-full px-3 py-2 bg-[#F5F5F5] border border-[#E5E7EB] rounded-xl text-xs focus:bg-white focus:border-[#D62828] focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-[#111111] transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-xl text-xs transition disabled:opacity-50 shadow-md shadow-[#D62828]/20 cursor-pointer"
                >
                  {submitting ? 'جاري الاعتماد...' : 'اعتماد الاستبدال وإصدار الشهادة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Replacement Certificate Modal */}
      {activeCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-[#D4AF37] overflow-hidden my-8 text-right font-sans p-8">
            {/* Action buttons top bar */}
            <div className="no-print flex items-center justify-between pb-6 border-b border-[#E5E7EB]">
              <span className="text-xs font-bold text-slate-500">شهادة استبدال رسمية معتمدة</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#111111] text-[#D4AF37] font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-[#D62828] hover:text-white transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الشهادة</span>
                </button>
                <button
                  onClick={() => setActiveCertificate(null)}
                  className="w-8 h-8 rounded-lg bg-[#F5F5F5] text-slate-600 hover:bg-[#E5E7EB] flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Certificate Body */}
            <div className="pt-6 space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B89726] text-white flex items-center justify-center mx-auto shadow-md shadow-[#D4AF37]/20">
                <Award className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-[#111111] font-['Cairo'] tracking-tight">
                  شهادة استبدال معتمدة | Replacement Certificate
                </h3>
                <p className="text-xs text-slate-500 mt-1">شركة مراتب سليبي (Sleepee) - الإدارة العامة للجودة وخدمة ما بعد البيع</p>
                <span className="inline-block mt-2 font-mono font-bold text-sm bg-[#D62828]/10 text-[#D62828] px-3 py-1 rounded-full border border-[#D62828]/20">
                  رقم الإذن: {activeCertificate.replacement_id}
                </span>
              </div>

              <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] grid grid-cols-2 gap-4 text-xs text-right">
                <div className="p-3 bg-white rounded-xl border border-[#E5E7EB]">
                  <span className="text-slate-400 block text-[10px]">المرتبة الأصلية المستبدلة:</span>
                  <span className="font-mono font-bold text-[#111111] block text-sm mt-0.5">
                    {activeCertificate.old_serial_number}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                    وثيقة: {activeCertificate.old_warranty_id}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <span className="text-slate-400 block text-[10px]">المرتبة البديلة المسلمة للعميل:</span>
                  <span className="font-mono font-bold text-emerald-700 block text-sm mt-0.5">
                    {activeCertificate.new_serial_number}
                  </span>
                  {activeCertificate.new_warranty_id && (
                    <span className="text-[10px] text-emerald-600 block font-mono mt-0.5">
                      وثيقة: {activeCertificate.new_warranty_id}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-right space-y-2 bg-[#D4AF37]/10 p-4 rounded-2xl border border-[#D4AF37]/30">
                <div className="flex justify-between">
                  <span className="font-bold text-[#111111]">سبب الاستبدال:</span>
                  <span className="text-slate-700">{activeCertificate.replacement_reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-[#111111]">تاريخ الاعتماد:</span>
                  <span className="font-mono">{activeCertificate.approval_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-[#111111]">جهة الاعتماد والتوقيع:</span>
                  <span className="font-bold text-[#111111]">{activeCertificate.approved_by}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 leading-relaxed">
                تظل هذه الشهادة وثيقة رسمية مكملة لشهادة الضمان الأصلية وتعتمد لكافة الحقوق والخدمات المجانية المنصوص عليها في لائحة ضمان مراتب سليبي.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
