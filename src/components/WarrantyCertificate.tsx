import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Award, Printer, CheckCircle2, ShieldCheck, PhoneCall, Calendar, MapPin, Hash, User, FileText, Bed, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { WarrantyActivation, Product, ProductLifecycle } from '../types';
import { LifecycleTimeline } from './LifecycleTimeline';

interface WarrantyCertificateProps {
  activation: WarrantyActivation | null;
  product: Product | null;
  onNavigateToSearch?: () => void;
}

export const WarrantyCertificate: React.FC<WarrantyCertificateProps> = ({
  activation,
  product,
  onNavigateToSearch,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [lifecycleEvents, setLifecycleEvents] = useState<ProductLifecycle[]>([]);
  const [loadingLifecycle, setLoadingLifecycle] = useState(false);

  useEffect(() => {
    if (activation && product) {
      const verifyUrl = `${window.location.origin}/?verify=${encodeURIComponent(activation.warranty_id)}`;
      QRCode.toDataURL(verifyUrl, {
        width: 180,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR generation failed:', err));

      // Fetch lifecycle events
      setLoadingLifecycle(true);
      fetch(`/api/lifecycle?serial=${encodeURIComponent(product.serial_number)}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setLifecycleEvents(data);
        })
        .catch((err) => console.error('Error fetching lifecycle:', err))
        .finally(() => setLoadingLifecycle(false));
    }
  }, [activation, product]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (!activation) return;
    const verifyUrl = `${window.location.origin}/?verify=${encodeURIComponent(activation.warranty_id)}`;
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!activation || !product) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-20 h-20 bg-[#D62828]/10 text-[#D62828] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#D62828]/20">
          <Award className="w-10 h-10" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#111111] mb-3 font-['Cairo']">
          لا توجد شهادة ضمان معروضة حالياً
        </h2>
        <p className="text-slate-600 max-w-md mx-auto mb-8 text-base leading-relaxed">
          يرجى البحث برقم المرتبة التسلسلي لتفعيل الضمان أو إدخال رقم وثيقة الضمان لعرض الشهادة المعتمدة وطباعتها.
        </p>
        <button
          onClick={onNavigateToSearch}
          className="inline-flex items-center gap-2 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold px-7 py-3.5 rounded-xl shadow-md shadow-[#D62828]/20 transition cursor-pointer"
        >
          <ShieldCheck className="w-5 h-5 text-white" />
          <span>البحث عن مرتبة وتفعيل الضمان</span>
        </button>
      </div>
    );
  }

  const isExpired = new Date(activation.expiry_date) < new Date();

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Action Bar (Hidden on print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold">
            تم توثيق الشهادة رقم: <strong className="font-mono text-[#D62828]">{activation.warranty_id}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold bg-[#F5F5F5] hover:bg-[#E5E7EB] text-slate-800 rounded-xl transition border border-[#E5E7EB] cursor-pointer"
          >
            <span>{copied ? '✓ تم نسخ رابط التحقق' : 'نسخ رابط التحقق'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold bg-[#D62828] hover:bg-[#B71C1C] text-white rounded-xl shadow-md shadow-[#D62828]/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>طباعة الشهادة الرسمية</span>
          </button>
        </div>
      </div>

      {/* Official Printable Certificate */}
      <div className="certificate-print-area bg-white rounded-3xl border-4 border-[#D4AF37] p-6 sm:p-10 shadow-xl relative overflow-hidden text-right">
        {/* Decorative Luxury Frame */}
        <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-[#D62828] via-[#D4AF37] to-[#D62828]" />
        <div className="absolute inset-2 sm:inset-3 border border-[#D4AF37]/50 rounded-2xl pointer-events-none" />
        <div className="absolute inset-3 sm:inset-4 border border-dashed border-[#D4AF37]/30 rounded-xl pointer-events-none" />

        {/* Certificate Header */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between border-b-2 border-[#E5E7EB] pb-6 mb-8 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-2xl bg-[#D62828] flex items-center justify-center shadow-lg shadow-[#D62828]/25 border-2 border-[#D4AF37]">
              <Bed className="w-8 h-8 text-white" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black text-[#111111] tracking-tight font-['Cairo']">سليبي</h1>
                <span className="text-[#D62828] font-mono font-black text-xl tracking-widest">SLEEPEE</span>
              </div>
              <p className="text-xs font-bold text-slate-500">الشركة العربية لتصنيع مراتب السوست والإسفنج</p>
              <p className="text-[11px] text-[#D4AF37] font-bold">شهادة ضمان الجودة والصلابة الأصلية المعتمدة</p>
            </div>
          </div>

          <div className="text-center sm:text-left bg-[#F5F5F5] border border-[#D4AF37]/40 px-5 py-3 rounded-2xl">
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">رقم وثيقة الضمان المعتمدة</div>
            <div className="text-lg font-mono font-black text-[#D62828] tracking-wide">
              {activation.warranty_id}
            </div>
            <div className="text-[11px] font-bold mt-1 flex items-center justify-center sm:justify-start gap-1">
              <span className={`w-2 h-2 rounded-full inline-block ${isExpired ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              <span className={isExpired ? 'text-rose-700' : 'text-emerald-700'}>
                {isExpired ? 'شهادة منتهية الصلاحية' : 'شهادة سارية ومسجلة رسمياً'}
              </span>
            </div>
          </div>
        </div>

        {/* Certificate Title Badge */}
        <div className="relative z-10 text-center mb-8">
          <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#111111] text-xs sm:text-sm font-black mb-3">
            <Award className="w-4 h-4 text-[#D4AF37]" />
            <span className="tracking-wide">شهادة ضمان الجودة الأصلية المعتمدة | OFFICIAL WARRANTY CERTIFICATE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#111111] font-['Cairo']">
            تشهد شركة سليبي للمراتب بضمان هذا المنتج الأصلي
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto mt-2 leading-relaxed">
            صنعت هذه المرتبة وفقاً لأعلى المعايير والمواصفات الطبية العالمية مع الالتزام الكامل بخدمات الصيانة والاستبدال.
          </p>
        </div>

        {/* Main Details Grid */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Customer & Invoice Information */}
          <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs">
            <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2.5 mb-3 text-[#111111] font-bold text-sm">
              <User className="w-4 h-4 text-[#D62828]" />
              <span>بيانات العميل وفاتورة الشراء</span>
            </div>
            <dl className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">اسم العميل:</dt>
                <dd className="font-bold text-[#111111]">{activation.customer_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">رقم الهاتف المسجل:</dt>
                <dd className="font-mono font-bold text-[#111111]">{activation.phone}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">المحافظة والمدينة:</dt>
                <dd className="font-semibold text-slate-800">
                  {activation.governorate} - {activation.city}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">رقم الفاتورة الأصلية:</dt>
                <dd className="font-mono font-bold text-[#D62828]">{activation.invoice_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">تاريخ الشراء:</dt>
                <dd className="font-mono font-bold text-slate-800">{activation.purchase_date}</dd>
              </div>
            </dl>
          </div>

          {/* Product Specifications & Warranty Duration */}
          <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] shadow-xs">
            <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2.5 mb-3 text-[#111111] font-bold text-sm">
              <Bed className="w-4 h-4 text-[#D62828]" />
              <span>مواصفات المرتبة وفترة الضمان</span>
            </div>
            <dl className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">موديل المرتبة:</dt>
                <dd className="font-bold text-[#111111]">{product.model}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">المقاس والأبعاد:</dt>
                <dd className="font-semibold text-slate-800">{product.size}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">الرقم التسلسلي (Serial No):</dt>
                <dd className="font-mono font-black text-[#D62828] tracking-wider">{product.serial_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 font-semibold">رقم التشغيلة / أمر الإنتاج:</dt>
                <dd className="font-mono font-semibold text-slate-700">
                  {product.batch_no} | {product.production_order}
                </dd>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#E5E7EB]">
                <dt className="text-[#111111] font-bold">مدة الضمان الإجمالية:</dt>
                <dd className="px-3 py-1 rounded-full bg-[#D62828] text-white font-black text-xs font-mono shadow-xs">
                  {product.warranty_years} سنوات ضمان شامل
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Validity Period Ribbon */}
        <div className="relative z-10 bg-[#111111] text-white rounded-2xl p-4 sm:p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-[#D4AF37]/50 shadow-md">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-[#D4AF37] shrink-0" />
            <div>
              <div className="text-xs text-[#D4AF37] font-bold">فترة سريان الضمان المعتمد:</div>
              <div className="text-base font-black font-mono mt-0.5 tracking-wide">
                من: {activation.purchase_date} &nbsp;وحتى:&nbsp; {activation.expiry_date}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-right sm:border-r sm:border-slate-700 sm:pr-4">
            <div>
              <span className="text-xs text-slate-400 block">تاريخ التفعيل بالنظام:</span>
              <span className="text-xs font-mono font-bold text-slate-200">
                {new Date(activation.activation_date).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* QR Code & Verification Seal */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center border-t-2 border-[#E5E7EB] pt-6">
          {/* QR Code */}
          <div className="flex flex-col items-center justify-center p-3 bg-[#F5F5F5] rounded-2xl border border-[#D4AF37]/40 shadow-xs text-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-32 h-32 object-contain rounded-lg mb-2 mix-blend-multiply" />
            ) : (
              <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center text-xs text-slate-400 mb-2">
                توليد رمز QR...
              </div>
            )}
            <span className="text-[11px] font-bold text-[#111111]">امسح للتحقق الفوري من صحة الضمان</span>
          </div>

          {/* Warranty Terms in Brief */}
          <div className="md:col-span-2 text-xs text-slate-600 space-y-1.5 leading-relaxed bg-[#F5F5F5] p-5 rounded-2xl border border-[#E5E7EB]">
            <h4 className="font-bold text-[#111111] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#D62828]" />
              <span>شروط وضوابط ضمان مراتب سليبي (Sleepee Warranty Terms):</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>يشمل الضمان هبوط السوست أو عيوب الصناعة الهيكلية في الشاسيه الداخلي وطبقات الفوم.</li>
              <li>الضمان يسري فقط مع الاحتفاظ بأصل فاتورة الشراء وهذه الشهادة المعتمدة برمز QR.</li>
              <li>لا يشمل الضمان التلف الناتج عن سوء الاستخدام أو سوء التخزين أو انسكاب السوائل.</li>
              <li>لأي استفسار أو طلب صيانة يرجى الاتصال بالخط الساخن المباشر: <strong className="text-[#D62828]">19707</strong>.</li>
            </ul>
            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-[#E5E7EB] mt-2 font-mono">
              <span className="font-bold text-[#111111]">إدارة الجودة والضمان: SLEEPEE QA DEPT</span>
              <span className="font-bold text-[#D62828]">الخط الساخن: 19707</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lifecycle Timeline Details Section (no-print) */}
      <div className="no-print mt-6 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-5 space-y-4 text-right">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#D62828]" />
            <h4 className="text-sm font-bold text-[#111111]">
              سجل دورة حياة المرتبة والتحقق التوثيقي ({lifecycleEvents.length} حدث مسجل)
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setShowTimeline(!showTimeline)}
            className="px-3 py-1.5 bg-[#F5F5F5] hover:bg-[#E5E7EB] text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <span>{showTimeline ? 'إخفاء المسار الزمني' : 'عرض المسار الزمني الكامل'}</span>
            {showTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showTimeline && (
          <div className="pt-3 border-t border-[#E5E7EB]">
            <LifecycleTimeline
              serialNumber={product.serial_number}
              timeline={lifecycleEvents}
            />
          </div>
        )}
      </div>
    </div>
  );
};
