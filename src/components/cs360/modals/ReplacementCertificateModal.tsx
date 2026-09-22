import React from 'react';
import { Award, Printer, X, ShieldCheck, CheckCircle2, QrCode } from 'lucide-react';
import { Replacement } from '../../../types';

interface ReplacementCertificateModalProps {
  replacement: Replacement | null;
  onClose: () => void;
}

export const ReplacementCertificateModal: React.FC<ReplacementCertificateModalProps> = ({
  replacement,
  onClose,
}) => {
  if (!replacement) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-[#D4AF37] overflow-hidden my-8 text-right font-sans p-8">
        {/* Action buttons top bar */}
        <div className="no-print flex items-center justify-between pb-6 border-b border-[#E5E7EB]">
          <span className="text-xs font-bold text-slate-500">شهادة استبدال رسمية معتمدة</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#111111] text-[#D4AF37] font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-[#D62828] hover:text-white transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الشهادة الرسمية</span>
            </button>
            <button
              type="button"
              onClick={onClose}
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
            <p className="text-xs text-slate-600 mt-1 font-bold">
              الشركة العربية لتصنيع مراتب السوست والإسفنج - مصانع مراتب سليبي (Sleepee)
            </p>
            <p className="text-[11px] text-slate-500">الإدارة العامة لرقابة الجودة وخدمة ما بعد البيع</p>
            <span className="inline-block mt-2 font-mono font-bold text-sm bg-[#D62828]/10 text-[#D62828] px-4 py-1 rounded-full border border-[#D62828]/20">
              رقم الإذن: {replacement.replacement_id}
            </span>
          </div>

          <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] grid grid-cols-2 gap-4 text-xs text-right">
            <div className="p-3.5 bg-white rounded-xl border border-[#E5E7EB] space-y-1">
              <span className="text-slate-400 block text-[10px]">المرتبة الأصلية المستبدلة:</span>
              <span className="font-mono font-bold text-[#111111] block text-sm">
                {replacement.old_serial_number}
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">
                وثيقة: {replacement.old_warranty_id}
              </span>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-emerald-300 space-y-1">
              <span className="text-slate-400 block text-[10px]">المرتبة البديلة المسلمة للعميل:</span>
              <span className="font-mono font-bold text-emerald-700 block text-sm">
                {replacement.new_serial_number}
              </span>
              <span className="text-[10px] text-emerald-600 block font-mono">
                وثيقة جديدة: {replacement.new_warranty_id || 'سارية بترحيل المدة'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#E5E7EB] text-xs text-right space-y-2">
            <div className="flex justify-between border-b border-[#E5E7EB] pb-2">
              <span className="text-slate-500">تاريخ اعتماد الاستبدال:</span>
              <span className="font-mono font-bold text-[#111111]">
                {new Date(replacement.approval_date).toLocaleDateString('ar-EG')}
              </span>
            </div>
            <div className="flex justify-between border-b border-[#E5E7EB] pb-2">
              <span className="text-slate-500">سبب الاستبدال المعتمد:</span>
              <span className="font-bold text-[#D62828]">{replacement.replacement_reason}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">المسؤول المعتمد:</span>
              <span className="font-bold text-[#111111]">{replacement.approved_by}</span>
            </div>
          </div>

          {replacement.notes && (
            <div className="p-3 bg-[#F5F5F5] rounded-xl text-right text-xs text-slate-600 border border-[#E5E7EB]">
              <strong className="text-[#111111]">ملاحظات:</strong> {replacement.notes}
            </div>
          )}

          {/* Signatures & Seal */}
          <div className="pt-6 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-slate-500 px-4">
            <div className="text-center">
              <span className="block font-bold text-[#111111]">إدارة خدمة العملاء</span>
              <span className="text-[10px] block text-slate-400 mt-1">توقيع الموظف المختص</span>
              <div className="w-24 h-0.5 bg-slate-300 mx-auto mt-4" />
            </div>

            <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#D4AF37] flex items-center justify-center text-[#D4AF37] font-bold text-[10px] uppercase rotate-12">
              ختم الجودة
            </div>

            <div className="text-center">
              <span className="block font-bold text-[#111111]">مدير عام رقابة الجودة</span>
              <span className="text-[10px] block text-slate-400 mt-1">اعتماد نهائي</span>
              <div className="w-24 h-0.5 bg-slate-300 mx-auto mt-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
