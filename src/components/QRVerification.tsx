import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Bed,
  Calendar,
  User,
  Phone,
  Award,
  Clock,
  FileText,
  MapPin,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { VerificationResult, Product, WarrantyActivation } from '../types';

interface QRVerificationProps {
  initialCode?: string;
  onViewCertificate: (activation: WarrantyActivation, product: Product) => void;
  onActivateProduct: (product: Product) => void;
}

const EGYPTIAN_GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'الدقهلية',
  'الشرقية',
  'المنوفية',
  'الغربية',
  'كفر الشيخ',
  'البحيرة',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'شمال سيناء',
  'جنوب سيناء',
  'بني سويف',
  'الفيوم',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'الوادي الجديد',
  'مطروح',
];

export const QRVerification: React.FC<QRVerificationProps> = ({
  initialCode,
  onViewCertificate,
  onActivateProduct,
}) => {
  const [code, setCode] = useState(initialCode || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // In-place Activation Form State for unactivated QR scans
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('القاهرة');
  const [city, setCity] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccessMsg, setActivationSuccessMsg] = useState<string | null>(null);

  const handleVerify = async (codeToVerify?: string) => {
    const target = (codeToVerify || code).trim();
    if (!target) {
      setError('يرجى إدخال رمز التحقق أو الرقم التسلسلي أو رقم وثيقة الضمان');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setActivationError(null);
    setActivationSuccessMsg(null);

    try {
      const res = await fetch(`/api/warranty/verify/${encodeURIComponent(target)}`);
      const data: VerificationResult = await res.json();

      if (!res.ok && res.status !== 404) {
        throw new Error(data.message || 'فشل التحقق من الرمز');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInPlaceActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result?.product) return;

    if (!customerName.trim() || !phone.trim() || !city.trim() || !invoiceNumber.trim() || !purchaseDate) {
      setActivationError('يرجى استكمال جميع بيانات العميل وفاتورة الشراء');
      return;
    }

    if (phone.trim().length < 8) {
      setActivationError('يرجى إدخال رقم هاتف صحيح (8 أرقام على الأقل)');
      return;
    }

    setActivating(true);
    setActivationError(null);

    try {
      const res = await fetch('/api/warranty/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number: result.product.serial_number,
          customer_name: customerName.trim(),
          phone: phone.trim(),
          governorate,
          city: city.trim(),
          invoice_number: invoiceNumber.trim(),
          purchase_date: purchaseDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تفعيل الضمان');
      }

      // Celebrate
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D62828', '#D4AF37', '#111111'],
      });

      setActivationSuccessMsg(`تم تفعيل وثيقة الضمان بنجاح برقم: ${data.activation.warranty_id}`);

      // Update the result in place to show full activated warranty info & status
      setResult({
        status: 'VALID',
        message: 'شهادة الضمان معتمدة وسارية المفعول لدى شركة سليبي',
        activation: data.activation,
        product: data.product,
        days_remaining: data.product.warranty_years * 365,
      });
    } catch (err: any) {
      setActivationError(err.message);
    } finally {
      setActivating(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      handleVerify(initialCode);
    }
  }, [initialCode]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Title & Info */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#D62828] text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#D62828]/20">
          <QrCode className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#111111] font-['Cairo']">
          التحقق الرقمي من رمز QR ووثائق الضمان
        </h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto mt-2 leading-relaxed">
          عند مسح رمز QR على المرتبة: إذا كان الضمان غير مفعل، تظهر تفاصيل المنتج ونموذج التفعيل المباشر. وإذا كان الضمان مفعلاً، تظهر تفاصيل الوثيقة وحالة التفعيل الرسمية.
        </p>
      </div>

      {/* Input Verification Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-[#E5E7EB] mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              placeholder="أدخل رمز التحقق، الرقم التسلسلي، أو رقم الوثيقة (مثال: SLP-2026-9082 أو SLP-WRN-2601-8192)"
              className="w-full text-left font-mono font-bold uppercase tracking-wider px-4 py-3.5 pl-11 rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white focus:ring-4 focus:ring-[#D62828]/10 focus:border-[#D62828] outline-none text-[#111111] text-sm sm:text-base transition"
            />
            <QrCode className="w-5 h-5 text-slate-400 absolute left-3.5 top-4 pointer-events-none" />
          </div>
          <button
            onClick={() => handleVerify()}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-2xl shadow-md shadow-[#D62828]/20 transition disabled:opacity-50 text-base cursor-pointer"
          >
            {loading ? <span>جاري التحقق...</span> : <span>فحص الرمز الآن</span>}
          </button>
        </div>

        {/* Quick Demo QR Links */}
        <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold">نماذج للمعاينة السريعة:</span>
          <button
            type="button"
            onClick={() => {
              setCode('SLP-2026-9082');
              handleVerify('SLP-2026-9082');
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-mono font-bold transition"
          >
            SLP-2026-9082 (غير مفعل - يعرض تفاصيل المنتج والنموذج)
          </button>
          <button
            type="button"
            onClick={() => {
              setCode('SLP-WRN-2601-8192');
              handleVerify('SLP-WRN-2601-8192');
            }}
            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 font-mono font-bold transition"
          >
            SLP-WRN-2601-8192 (مفعل - يعرض بيانات الضمان والحالة)
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Result Presentation */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* CASE 1: NOT ACTIVATED -> Show Product Details AND Activation Form */}
          {result.status === 'UNACTIVATED' && result.product && (
            <div className="space-y-6">
              {/* Product Details Header Card */}
              <div className="bg-white border-2 border-amber-300 rounded-3xl p-6 sm:p-8 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5 mb-6">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-8 h-8 text-amber-700" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black mb-1">
                        <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                        <span>مرتبة أصلية معتمدة | بانتظار تفعيل الضمان</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#111111] font-['Cairo']">
                        تفاصيل المنتج الممسوح عبر رمز QR
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600">
                        تم التحقق من الرمز التسلسلي في خطوط إنتاج مصانع سليبي. يرجى إدخال بيانات الشراء لتفعيل وثيقة الضمان.
                      </p>
                    </div>
                  </div>

                  <span className="px-3.5 py-1.5 rounded-xl bg-[#F5F5F5] border border-[#E5E7EB] font-mono font-bold text-xs text-slate-700">
                    الحالة: جاهز للتفعيل
                  </span>
                </div>

                {/* Product Attributes Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 text-xs sm:text-sm">
                  <div className="p-3.5 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 block mb-1 text-xs">الرقم التسلسلي</span>
                    <strong className="text-[#D62828] font-mono text-sm font-black block truncate">
                      {result.product.serial_number}
                    </strong>
                  </div>

                  <div className="p-3.5 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 block mb-1 text-xs">موديل المرتبة</span>
                    <strong className="text-[#111111] text-sm font-bold block truncate">
                      {result.product.model}
                    </strong>
                  </div>

                  <div className="p-3.5 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 block mb-1 text-xs">المقاس والأبعاد</span>
                    <strong className="text-[#111111] text-sm font-bold block truncate">
                      {result.product.size}
                    </strong>
                  </div>

                  <div className="p-3.5 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 block mb-1 text-xs">مدة الضمان المقررة</span>
                    <strong className="text-[#D4AF37] text-sm font-black block">
                      {result.product.warranty_years} سنوات ضمان
                    </strong>
                  </div>

                  <div className="p-3.5 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 block mb-1 text-xs">تاريخ الإنتاج</span>
                    <strong className="text-[#111111] font-mono text-sm font-bold block">
                      {result.product.production_date}
                    </strong>
                  </div>
                </div>
              </div>

              {/* In-place Activation Form */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-[#E5E7EB]">
                <div className="flex items-center gap-3 border-b border-[#E5E7EB] pb-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#D62828]/10 text-[#D62828] flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-[#111111] font-['Cairo']">
                      نموذج تفعيل وثيقة الضمان الإلكترونية
                    </h3>
                    <p className="text-xs text-slate-500">
                      املأ البيانات التالية لإصدار الشهادة الرقمية المعتمدة فورياً
                    </p>
                  </div>
                </div>

                {activationError && (
                  <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{activationError}</span>
                  </div>
                )}

                <form onSubmit={handleInPlaceActivate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Serial Number (pre-filled & locked) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        الرقم التسلسلي للمرتبة (Serial Number) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={result.product.serial_number}
                          className="w-full text-left font-mono font-black text-sm px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50/50 text-[#111111] cursor-not-allowed"
                        />
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3.5" />
                      </div>
                      <span className="text-[11px] text-emerald-700 font-bold mt-1 block">
                        ✓ تم التحقق من وجود الرقم التسلسلي في قاعدة بيانات مصانع سليبي
                      </span>
                    </div>

                    {/* Customer Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        اسم العميل ثلاثي *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="مثال: أحمد محمد علي"
                          className="w-full text-sm px-4 py-3 pr-10 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white focus:ring-2 focus:ring-[#D62828] outline-none text-[#111111]"
                        />
                        <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                      </div>
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        رقم الهاتف المحمول *
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="مثال: 01012345678"
                          className="w-full text-left font-mono text-sm px-4 py-3 pr-10 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white focus:ring-2 focus:ring-[#D62828] outline-none text-[#111111]"
                        />
                        <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                      </div>
                    </div>

                    {/* Governorate */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        المحافظة *
                      </label>
                      <div className="relative">
                        <select
                          value={governorate}
                          onChange={(e) => setGovernorate(e.target.value)}
                          className="w-full text-sm px-4 py-3 pr-10 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white focus:ring-2 focus:ring-[#D62828] outline-none text-[#111111]"
                        >
                          {EGYPTIAN_GOVERNORATES.map((gov) => (
                            <option key={gov} value={gov}>
                              {gov}
                            </option>
                          ))}
                        </select>
                        <MapPin className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                      </div>
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        المدينة / الحي *
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="مثال: مدينة نصر / الدقي / سموحة"
                        className="w-full text-sm px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white focus:ring-2 focus:ring-[#D62828] outline-none text-[#111111]"
                      />
                    </div>

                    {/* Invoice Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        رقم فاتورة الشراء الأصلية *
                      </label>
                      <input
                        type="text"
                        required
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="مثال: INV-2026-7890"
                        className="w-full text-left font-mono text-sm px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white focus:ring-2 focus:ring-[#D62828] outline-none text-[#111111]"
                      />
                    </div>

                    {/* Purchase Date */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        تاريخ الشراء *
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          required
                          value={purchaseDate}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                          className="w-full text-sm px-4 py-3 pr-10 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white focus:ring-2 focus:ring-[#D62828] outline-none text-[#111111]"
                        />
                        <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={activating}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-2xl shadow-md shadow-[#D62828]/20 transition disabled:opacity-50 text-sm sm:text-base cursor-pointer"
                    >
                      {activating ? (
                        <span>جاري إصدار وتفعيل الوثيقة...</span>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-amber-300" />
                          <span>تفعيل وثيقة الضمان وإصدار الشهادة الرقمية</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CASE 2: ACTIVATED -> Show Warranty Information and Activation Status */}
          {(result.status === 'VALID' || result.status === 'EXPIRED') && result.activation && result.product && (
            <div className="space-y-6">
              {activationSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-bold flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{activationSuccessMsg}</span>
                </div>
              )}

              {/* Status Header Banner */}
              <div
                className={`rounded-3xl p-6 sm:p-8 shadow-xs border ${
                  result.status === 'VALID'
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-amber-50 border-amber-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-center sm:text-right">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                        result.status === 'VALID'
                          ? 'bg-emerald-100 text-emerald-700 shadow-md shadow-emerald-200'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {result.status === 'VALID' ? (
                        <CheckCircle2 className="w-9 h-9" />
                      ) : (
                        <AlertTriangle className="w-9 h-9" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                        <span
                          className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                            result.status === 'VALID'
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-amber-200 text-amber-900'
                          }`}
                        >
                          {result.status === 'VALID' ? 'الضمان ساري ومفعل رسمياً' : 'الضمان منتهي الصلاحية'}
                        </span>
                        <span className="text-xs text-slate-500 font-mono font-bold">
                          وثيقة: {result.activation.warranty_id}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-[#111111] font-['Cairo']">
                        {result.status === 'VALID'
                          ? 'وثيقة الضمان معتمدة وسارية المفعول'
                          : 'فترة الضمان الرسمية انتهت'}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                        {result.message}
                      </p>
                    </div>
                  </div>

                  {result.days_remaining !== undefined && result.status === 'VALID' && (
                    <div className="bg-white px-6 py-4 rounded-2xl border border-emerald-200 text-center shadow-xs shrink-0">
                      <span className="text-xs text-slate-500 font-bold block">متبقي على نهاية الضمان</span>
                      <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-black text-2xl font-mono mt-0.5">
                        <Clock className="w-6 h-6 text-emerald-600" />
                        <span>{result.days_remaining} يوماً</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Comprehensive Warranty Information Grid */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-[#E5E7EB]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E7EB] pb-4 mb-6 gap-3">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-6 h-6 text-[#D4AF37]" />
                    <h4 className="text-lg font-black text-[#111111] font-['Cairo']">
                      بيانات وثيقة الضمان والمنتج المعتمدة
                    </h4>
                  </div>
                  <button
                    onClick={() => onViewCertificate(result.activation!, result.product!)}
                    className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-bold bg-[#D62828] hover:bg-[#B71C1C] text-white px-5 py-2.5 rounded-xl transition shadow-md shadow-[#D62828]/20 cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-amber-300" />
                    <span>عرض وطباعة الشهادة الرقمية الرسمية</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                  <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 block mb-1 text-xs">رقم وثيقة الضمان (Warranty ID)</span>
                    <strong className="text-[#D62828] font-mono text-base font-black">
                      {result.activation.warranty_id}
                    </strong>
                  </div>

                  <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 block mb-1 text-xs">الرقم التسلسلي للمرتبة (Serial No)</span>
                    <strong className="text-[#111111] font-mono text-base font-black">
                      {result.product.serial_number}
                    </strong>
                  </div>

                  <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 block mb-1 text-xs">موديل ومقاس المرتبة</span>
                    <strong className="text-[#111111] text-base font-bold">
                      {result.product.model} ({result.product.size})
                    </strong>
                  </div>

                  <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 block mb-1 text-xs">اسم العميل المسجل</span>
                    <strong className="text-[#111111] text-base font-bold">
                      {result.activation.customer_name}
                    </strong>
                  </div>

                  <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 block mb-1 text-xs">رقم الهاتف المسجل</span>
                    <strong className="text-[#111111] font-mono text-base font-bold">
                      {result.activation.phone}
                    </strong>
                  </div>

                  <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 block mb-1 text-xs">المحافظة والمدينة</span>
                    <strong className="text-[#111111] text-base font-bold">
                      {result.activation.governorate} - {result.activation.city}
                    </strong>
                  </div>

                  <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 block mb-1 text-xs">رقم الفاتورة الأصلية</span>
                    <strong className="text-[#D62828] font-mono text-base font-bold">
                      {result.activation.invoice_number}
                    </strong>
                  </div>

                  <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 block mb-1 text-xs">تاريخ الشراء وتاريخ التفعيل</span>
                    <strong className="text-[#111111] font-mono text-sm font-bold block">
                      شراء: {result.activation.purchase_date}
                    </strong>
                    <span className="text-xs text-slate-500 font-mono">
                      تفعيل: {new Date(result.activation.activation_date).toLocaleDateString('ar-EG')}
                    </span>
                  </div>

                  <div className="p-4 bg-[#F5F5F5] rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 block mb-1 text-xs">تاريخ انتهاء الضمان</span>
                    <strong className="text-[#D62828] font-mono text-base font-black block">
                      {result.activation.expiry_date}
                    </strong>
                    <span className="text-xs text-[#D4AF37] font-bold">
                      ({result.product.warranty_years} سنوات ضمان شامل)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CASE 3: NOT FOUND */}
          {result.status === 'NOT_FOUND' && (
            <div className="bg-rose-50 border border-rose-300 rounded-3xl p-6 sm:p-8 shadow-xs text-center">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-9 h-9" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-rose-950 font-['Cairo'] mb-1">
                رمز الضمان أو الرقم التسلسلي غير مسجل
              </h3>
              <p className="text-xs sm:text-sm text-rose-800 max-w-md mx-auto leading-relaxed mb-4">
                {result.message}
              </p>
              <div className="text-xs text-slate-600">
                للتأكد من صحة بيانات المرتبة، يرجى التواصل مع مركز خدمة عملاء مصانع سليبي على الخط الساخن: <strong>19707</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
