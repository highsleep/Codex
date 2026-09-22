import React from 'react';
import {
  Bed,
  ShieldCheck,
  Award,
  FileText,
  Calendar,
  Layers,
  Maximize2,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Barcode,
  ExternalLink,
} from 'lucide-react';
import { Product, WarrantyActivation } from '../../types';

interface ProductWarrantyTabProps {
  product: Product;
  activation: WarrantyActivation | null;
  onViewCertificate?: (activation: WarrantyActivation, product: Product) => void;
}

export const ProductWarrantyTab: React.FC<ProductWarrantyTabProps> = ({
  product,
  activation,
  onViewCertificate,
}) => {
  const calculateDaysRemaining = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = activation ? calculateDaysRemaining(activation.expiry_date) : 0;
  const isWarrantyValid = daysRemaining > 0;

  return (
    <div className="space-y-6 text-right font-sans">
      {/* 1. Warranty Validity & Certificate Action Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D62828]/10 text-[#D62828] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#111111] font-['Cairo']">
                حالة التغطية والضمان الإلكتروني
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                فحص فترات التغطية وسريان الضمان والشهادة الإلكترونية الصادرة
              </p>
            </div>
          </div>

          {activation && onViewCertificate && (
            <button
              onClick={() => onViewCertificate(activation, product)}
              className="px-4 py-2.5 bg-[#111111] hover:bg-black text-[#D4AF37] hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Award className="w-4 h-4 text-[#D4AF37]" />
              <span>عرض وطباعة شهادة الضمان المعتمدة</span>
            </button>
          )}
        </div>

        {activation ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
            {/* Status Highlight */}
            <div
              className={`p-5 rounded-2xl border flex flex-col justify-between ${
                isWarrantyValid
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/70 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {isWarrantyValid ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-600" />
                  )}
                  <span className="font-bold text-sm">
                    {isWarrantyValid ? 'الضمان ساري ومفعل (Active)' : 'الضمان منتهي الصلاحية'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-1">المدة المتبقية في التغطية:</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono">
                    {isWarrantyValid ? daysRemaining : 0}
                  </span>
                  <span className="text-xs font-bold text-slate-600">يوم متبقي</span>
                </div>
              </div>
            </div>

            {/* Warranty Terms */}
            <div className="p-5 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] space-y-3 text-xs">
              <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                محددات التغطية
              </span>
              <div className="flex justify-between items-center py-1 border-b border-[#E5E7EB]">
                <span className="text-slate-500">رقم الوثيقة:</span>
                <span className="font-mono font-bold text-[#D62828]">{activation.warranty_id}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#E5E7EB]">
                <span className="text-slate-500">مدة الضمان المقررة:</span>
                <span className="font-bold text-[#111111]">{product.warranty_years} سنوات شاملة</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">تاريخ انتهاء الصلاحية:</span>
                <span className="font-mono font-bold text-slate-800">{activation.expiry_date}</span>
              </div>
            </div>

            {/* Scope of Coverage */}
            <div className="p-5 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                نطاق التغطية المصنعية
              </span>
              <ul className="space-y-1.5 text-slate-700 text-[11px]">
                <li className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D62828]" />
                  <span>سلامة شاسيه السوست الفولاذية ضد الكسر أو الخلع</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D62828]" />
                  <span>هبوط طبقات الإسفنج والفوم الدائم المتجاوز لنسبة 2 سم</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D62828]" />
                  <span>عيوب الخياطة والكابتونيه وتثبيت الحزام المحيط</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D62828]" />
                  <span>استبدال مجاني في حال ثبوت عيب تصنيعي غير قابل للإصلاح</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] mt-6 text-xs text-slate-500">
            لم تُفعل شهادة الضمان لهذا المنتج بعد من قبل العميل.
          </div>
        )}
      </div>

      {/* 2. Factory Production Specifications & Traceability */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center gap-3 pb-5 border-b border-[#E5E7EB]">
          <div className="w-12 h-12 rounded-2xl bg-[#D62828]/10 text-[#D62828] flex items-center justify-center">
            <Bed className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#111111] font-['Cairo']">
              المواصفات الفنية وبيانات التتبع المصنعي
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              بيانات خط الإنتاج، أمر التشغيل، الأبعاد، والمواصفات التركيبية للمرتبة
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 text-xs">
          {/* Serial Number */}
          <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">الرقم التسلسلي (Serial):</span>
            <span className="text-sm font-black font-mono text-[#D62828] block">
              {product.serial_number}
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1 pt-1">
              <Barcode className="w-3.5 h-3.5" />
              <span>مشفر في باركود المصنع</span>
            </span>
          </div>

          {/* Model Name */}
          <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">الموديل التجاري:</span>
            <span className="text-sm font-black text-[#111111] block truncate">
              {product.model}
            </span>
            <span className="text-[10px] text-slate-500 block pt-1">
              فئة النوابض المتصلة / المنفصلة
            </span>
          </div>

          {/* Size */}
          <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">الأبعاد والمقاس:</span>
            <span className="text-sm font-black text-[#111111] font-mono block">
              {product.size}
            </span>
            <span className="text-[10px] text-slate-500 block pt-1">
              ارتفاع قياسي مطابق للمواصفات
            </span>
          </div>

          {/* Production Order */}
          <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] space-y-1">
            <span className="text-[11px] font-bold text-slate-400 block">أمر الإنتاج (Batch Order):</span>
            <span className="text-sm font-black text-slate-800 font-mono block">
              {product.production_order || 'ORD-2026-105'}
            </span>
            <span className="text-[10px] text-slate-500 block pt-1 font-mono">
              رقم التشغيلة: {product.batch_no || 'BATCH-92A'}
            </span>
          </div>
        </div>

        {/* Manufacturing Technical Stack */}
        <div className="mt-6 p-5 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 text-[10px] block">تاريخ التصنيع بالمصنع:</span>
            <span className="font-mono font-bold text-[#111111] block mt-0.5">
              {product.production_date}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">نظام السوست والشاسيه:</span>
            <span className="font-bold text-[#111111] block mt-0.5">
              صلب معالج حرارياً مضاد للصدأ والهبوط
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">القماش الخارجي والكابتونيه:</span>
            <span className="font-bold text-[#111111] block mt-0.5">
              قماش دبل نت معالج ضد البكتيريا وحشرات الفراش
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
