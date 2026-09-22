import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Bed,
  Calendar,
  FileText,
  MapPin,
  Phone,
  User,
  Award,
  ArrowLeft,
  AlertTriangle,
  Wrench,
} from 'lucide-react';
import { Product, WarrantyActivation } from '../types';
import { CustomerClaimModal } from './CustomerClaimModal';

interface CustomerPortalProps {
  onActivationSuccess: (activation: WarrantyActivation, product: Product) => void;
  onViewCertificate: (activation: WarrantyActivation, product: Product) => void;
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

const SAMPLE_SERIALS = [
  { serial: 'SLP-2026-9082', label: 'سوبر ميموري فوم (جاهزة للتفعيل)' },
  { serial: 'SLP-2026-9083', label: 'أورثوبيديك الطبية (جاهزة للتفعيل)' },
  { serial: 'SLP-2026-9084', label: 'كلاود بيلو توب (جاهزة للتفعيل)' },
  { serial: 'SLP-2026-9081', label: 'رويال بوكيت (مفعلة مسبقاً لعرض الشهادة)' },
];

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ onActivationSuccess, onViewCertificate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'all' | 'serial' | 'warranty_id' | 'mobile'>('serial');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [warrantyResults, setWarrantyResults] = useState<Array<{ activation: WarrantyActivation; product?: Product }>>([]);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('القاهرة');
  const [city, setCity] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    activation: WarrantyActivation;
    product: Product;
  } | null>(null);

  const handleSearch = async (overrideQuery?: string, overrideMode?: 'all' | 'serial' | 'warranty_id' | 'mobile') => {
    const q = (overrideQuery !== undefined ? overrideQuery : searchQuery).trim();
    const mode = overrideMode || searchMode;

    if (!q) {
      setError(
        mode === 'serial'
          ? 'يرجى إدخال الرقم التسلسلي للمرتبة'
          : mode === 'warranty_id'
          ? 'يرجى إدخال رقم وثيقة الضمان'
          : mode === 'mobile'
          ? 'يرجى إدخال رقم الهاتف المسجل'
          : 'يرجى إدخال الرقم التسلسلي أو رقم الوثيقة أو الهاتف'
      );
      return;
    }

    setLoading(true);
    setError(null);
    setProduct(null);
    setWarrantyResults([]);
    setSuccessResult(null);
    setActivationError(null);

    try {
      // 1. If explicit serial mode, or looks like a serial (not starting with SLP-WRN-)
      if (mode === 'serial' || (mode === 'all' && q.toUpperCase().startsWith('SLP-202'))) {
        const res = await fetch(`/api/products/search?serial=${encodeURIComponent(q)}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `طلب مرفوض: الرقم التسلسلي (${q}) غير مسجل في قاعدة بيانات مصانع سليبي`);
        }

        setProduct(data.product);
        setSearchQuery(data.product.serial_number);
        return;
      }

      // 2. Search Warranties by Serial, Warranty ID, or Mobile
      const res = await fetch(`/api/warranty/search?q=${encodeURIComponent(q)}&type=${mode}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل البحث في قاعدة بيانات الضمان');
      }

      const results: Array<{ activation: WarrantyActivation; product?: Product }> = data.warranties || [];

      if (results.length === 0) {
        // If not found in warranties, also check if it's an unactivated serial
        if (mode === 'all') {
          const prodRes = await fetch(`/api/products/search?serial=${encodeURIComponent(q)}`);
          if (prodRes.ok) {
            const prodData = await prodRes.json();
            if (prodData.product) {
              setProduct(prodData.product);
              setSearchQuery(prodData.product.serial_number);
              return;
            }
          }
        }
        throw new Error(`لم يتم العثور على أي وثائق ضمان مطابقة لـ "${q}"`);
      }

      setWarrantyResults(results);

      // If exactly 1 result returned with its product, also populate product
      if (results.length === 1 && results[0].product) {
        setProduct({
          ...results[0].product,
          activation: results[0].activation,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Check: serial_number exists?
    if (!product) {
      setActivationError('طلب مرفوض: يرجى البحث والتحقق من الرقم التسلسلي للمرتبة أولاً');
      return;
    }

    // 2. If warranty already exists: Reject Request
    if (product.activation) {
      setActivationError(
        `طلب مرفوض: تم تفعيل الضمان لهذا الرقم التسلسلي مسبقاً برقم وثيقة (${product.activation.warranty_id})`
      );
      return;
    }

    // 3. Else: Proceed to Create Warranty
    if (!termsAgreed) {
      setActivationError('يرجى الموافقة على الإقرار بصحة البيانات ومطابقة الفاتورة');
      return;
    }

    setActivating(true);
    setActivationError(null);

    try {
      const res = await fetch('/api/warranty/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number: product.serial_number,
          customer_name: customerName,
          phone,
          governorate,
          city,
          invoice_number: invoiceNumber,
          purchase_date: purchaseDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تفعيل الضمان');
      }

      // Success! Fire celebratory confetti with Sleepee brand colors
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#D62828', '#D4AF37', '#111111', '#B71C1C'],
      });

      setSuccessResult({
        activation: data.activation,
        product: data.product,
      });

      onActivationSuccess(data.activation, data.product);
    } catch (err: any) {
      setActivationError(err.message);
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6">
      {/* Hero Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D62828]/10 text-[#D62828] text-xs font-bold mb-3.5 border border-[#D62828]/20">
          <Award className="w-4 h-4 text-[#D4AF37]" />
          <span>الضمان الذهبي المعتمد من مصانع سليبي | SLEEPEE</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#111111] font-['Cairo'] tracking-tight">
          تفعيل وتوثيق ضمان مراتب سليبي
        </h1>
        <p className="text-slate-600 max-w-2xl mx-auto mt-2.5 text-sm sm:text-base leading-relaxed">
          أدخل الرقم التسلسلي (Serial Number) المطبوع على بطاقة الضمان الملصقة على جانب المرتبة لتسجيل وتفعيل وثيقة الضمان الرسمية والحصول على شهادتك الإلكترونية المعتمدة.
        </p>
      </div>

      {/* Search Box Card - White Search Panel with Red Button */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.06)] border border-[#E5E7EB] mb-8">
        {/* Search Mode Tabs */}
        <div className="flex items-center gap-2 mb-4 border-b border-[#E5E7EB] pb-3 text-xs sm:text-sm font-bold overflow-x-auto">
          <span className="text-slate-500 shrink-0 ml-1">البحث بواسطة:</span>
          <button
            type="button"
            onClick={() => setSearchMode('serial')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              searchMode === 'serial'
                ? 'bg-[#D62828] text-white shadow-xs'
                : 'bg-[#F5F5F5] hover:bg-[#E5E7EB] text-slate-700'
            }`}
          >
            الرقم التسلسلي (Serial Number)
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('warranty_id')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              searchMode === 'warranty_id'
                ? 'bg-[#D62828] text-white shadow-xs'
                : 'bg-[#F5F5F5] hover:bg-[#E5E7EB] text-slate-700'
            }`}
          >
            رقم وثيقة الضمان (Warranty ID)
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('mobile')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              searchMode === 'mobile'
                ? 'bg-[#D62828] text-white shadow-xs'
                : 'bg-[#F5F5F5] hover:bg-[#E5E7EB] text-slate-700'
            }`}
          >
            رقم الهاتف المحمول (Mobile Number)
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('all')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              searchMode === 'all'
                ? 'bg-[#D62828] text-white shadow-xs'
                : 'bg-[#F5F5F5] hover:bg-[#E5E7EB] text-slate-700'
            }`}
          >
            بحث شامل (All)
          </button>
        </div>

        <label htmlFor="serial-search-input" className="block text-sm font-bold text-[#111111] mb-2.5">
          {searchMode === 'serial'
            ? 'أدخل الرقم التسلسلي للمرتبة (Serial Number) للتفعيل أو التحقق:'
            : searchMode === 'warranty_id'
            ? 'أدخل رقم وثيقة الضمان (Warranty ID) للاستعلام والطباعة:'
            : searchMode === 'mobile'
            ? 'أدخل رقم الهاتف المسجل لعرض كافة وثائق الضمان الخاصة بك:'
            : 'أدخل الرقم التسلسلي، رقم الوثيقة، أو رقم الهاتف المحمول:'}
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              id="serial-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={
                searchMode === 'serial'
                  ? 'مثال: SLP-2026-9082'
                  : searchMode === 'warranty_id'
                  ? 'مثال: SLP-WRN-2601-8192'
                  : searchMode === 'mobile'
                  ? 'مثال: 01011112222'
                  : 'رقم تسلسلي، وثيقة، أو هاتف...'
              }
              className="w-full text-left font-mono font-bold uppercase tracking-wider px-4 py-3.5 pl-11 rounded-2xl border border-[#E5E7EB] focus:ring-4 focus:ring-[#D62828]/15 focus:border-[#D62828] outline-none text-[#111111] text-base transition"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-4 pointer-events-none" />
          </div>
          <button
            id="search-serial-button"
            onClick={() => handleSearch()}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold rounded-2xl shadow-md hover:shadow-lg shadow-[#D62828]/25 transition disabled:opacity-50 text-base cursor-pointer"
          >
            {loading ? (
              <span>جاري التحقق...</span>
            ) : (
              <>
                <Search className="w-5 h-5 text-white" />
                <span>
                  {searchMode === 'serial'
                    ? 'التحقق والتفعيل'
                    : 'البحث عن الضمان'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Quick Sample Serials & Queries */}
        <div className="mt-5 pt-4 border-t border-[#E5E7EB] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold">نماذج سريعة للتجربة:</span>
          {SAMPLE_SERIALS.map((s) => (
            <button
              key={s.serial}
              onClick={() => {
                setSearchMode('serial');
                setSearchQuery(s.serial);
                handleSearch(s.serial, 'serial');
              }}
              className="px-3 py-1.5 bg-[#F5F5F5] hover:bg-[#D62828]/10 text-slate-700 hover:text-[#D62828] hover:border-[#D62828] font-mono font-bold rounded-xl border border-[#E5E7EB] transition cursor-pointer"
            >
              {s.serial} ({s.label})
            </button>
          ))}
          <button
            onClick={() => {
              setSearchMode('warranty_id');
              setSearchQuery('SLP-WRN-2601-8192');
              handleSearch('SLP-WRN-2601-8192', 'warranty_id');
            }}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-mono font-bold rounded-xl border border-emerald-200 transition cursor-pointer"
          >
            SLP-WRN-2601-8192 (بحث برقم الوثيقة)
          </button>
          <button
            onClick={() => {
              setSearchMode('mobile');
              setSearchQuery('01011112222');
              handleSearch('01011112222', 'mobile');
            }}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-mono font-bold rounded-xl border border-blue-200 transition cursor-pointer"
          >
            01011112222 (بحث برقم الهاتف)
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-semibold">{error}</div>
          </div>
        )}
      </div>

      {/* Multiple Warranty Search Results */}
      {warrantyResults.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-[#E5E7EB] mb-8 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4 mb-6">
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-[#D62828]" />
              <div>
                <h3 className="text-xl font-black text-[#111111] font-['Cairo']">
                  نتائج البحث في وثائق الضمان ({warrantyResults.length})
                </h3>
                <p className="text-xs text-slate-500">
                  تم العثور على وثائق الضمان المسجلة في قواعد بيانات سليبي
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warrantyResults.map((item) => {
              const isExpired = new Date(item.activation.expiry_date) < new Date();
              return (
                <div
                  key={item.activation.id}
                  className="p-5 rounded-2xl border border-[#E5E7EB] bg-[#F5F5F5] hover:bg-white hover:border-[#D62828]/40 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono font-black text-sm text-[#D62828]">
                        {item.activation.warranty_id}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isExpired
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isExpired ? 'منتهي الصلاحية' : 'ساري ومفعل (Active)'}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-[#111111] mb-1">
                      {item.product?.model || 'مرتبة سليبي الأصلية'}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mb-3">
                      السيريال: {item.activation.serial_number} | المقاس: {item.product?.size || '-'}
                    </p>

                    <div className="space-y-1.5 text-xs text-slate-700 pt-2 border-t border-[#E5E7EB]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">اسم العميل:</span>
                        <span className="font-bold text-[#111111]">{item.activation.customer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">رقم الهاتف:</span>
                        <span className="font-mono font-bold text-[#111111]">{item.activation.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">تاريخ الشراء:</span>
                        <span className="font-mono">{item.activation.purchase_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">انتهاء الضمان:</span>
                        <span className="font-mono font-bold text-[#D62828]">{item.activation.expiry_date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex items-center justify-end">
                    <button
                      onClick={() => {
                        if (item.product) {
                          onViewCertificate(item.activation, item.product);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D62828] hover:bg-[#B71C1C] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-300" />
                      <span>عرض وتحميل الشهادة</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Success Modal / State */}
      {successResult && (
        <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 mb-8 text-center shadow-xl animate-fade-in">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#111111] mb-2 font-['Cairo']">
            تهانينا! تم تفعيل وثيقة الضمان بنجاح
          </h2>
          <p className="text-emerald-800 text-sm sm:text-base max-w-lg mx-auto mb-4">
            تم تسجيل مرتبتك في النظام الآلي وضمان حقوقك. رقم وثيقة الضمان المعتمدة الخاص بك هو:
          </p>
          <div className="inline-block bg-[#F5F5F5] px-6 py-2.5 rounded-2xl border border-[#E5E7EB] shadow-xs font-mono font-black text-xl text-[#D62828] mb-6">
            {successResult.activation.warranty_id}
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => onViewCertificate(successResult.activation, successResult.product)}
              className="inline-flex items-center gap-2 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-[#D62828]/25 transition cursor-pointer"
            >
              <Award className="w-5 h-5 text-[#D4AF37]" />
              <span>عرض وتحميل شهادة الضمان المعتمدة</span>
            </button>
          </div>
        </div>
      )}

      {/* Product Details & Activation Form */}
      {product && !successResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Product Info Card */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.06)] border border-[#E5E7EB] flex flex-col justify-between">
            <div>
              <div className="relative rounded-2xl overflow-hidden mb-4 bg-[#F5F5F5] aspect-video sm:aspect-square">
                <img
                  src={product.image_url}
                  alt={product.model}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-[#111111]/90 backdrop-blur-md text-[#D4AF37] text-xs font-black px-3.5 py-1.5 rounded-xl border border-[#D4AF37]/30 shadow-md">
                  {product.warranty_years} سنوات ضمان معتمد
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#D62828] bg-[#D62828]/10 px-2.5 py-1 rounded-md border border-[#D62828]/20">
                  مرتبة أصلية معتمدة
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {product.serial_number}
                </span>
              </div>

              <h2 className="text-xl font-black text-[#111111] mb-1 font-['Cairo']">{product.model}</h2>
              <p className="text-sm font-bold text-slate-600 mb-4">{product.size}</p>

              <div className="bg-[#F5F5F5] rounded-2xl p-4 border border-[#E5E7EB] text-xs space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">تاريخ الإنتاج بالمصنع:</span>
                  <span className="font-mono font-bold text-[#111111]">{product.production_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">رقم أمر التشغيل:</span>
                  <span className="font-mono font-bold text-[#111111]">{product.production_order}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">رقم الدفعة (Batch No):</span>
                  <span className="font-mono font-bold text-[#111111]">{product.batch_no}</span>
                </div>
              </div>
            </div>

            {/* If product is already activated */}
            {product.activation ? (
              <div className="bg-[#D62828]/5 border border-[#D62828]/20 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[#111111] font-black text-sm mb-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>الضمان مفعل بالفعل</span>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  مفعل باسم العميل: <strong>{product.activation.customer_name}</strong>
                  <br />
                  رقم الوثيقة:{' '}
                  <span className="font-mono font-bold text-[#D62828]">{product.activation.warranty_id}</span>
                </p>
                <button
                  onClick={() => onViewCertificate(product.activation!, product)}
                  className="w-full flex items-center justify-center gap-2 bg-[#111111] hover:bg-black text-white text-xs font-bold py-2.5 rounded-xl transition shadow cursor-pointer"
                >
                  <Award className="w-4 h-4 text-[#D4AF37]" />
                  <span>عرض وطباعة شهادة الضمان</span>
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center text-xs text-emerald-800 font-bold">
                ✓ جاهز للتفعيل الفوري عبر الاستمارة
              </div>
            )}
          </div>

          {/* Activation Form or Activated Status */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.06)] border border-[#E5E7EB]">
            {product.activation ? (
              <div className="h-full flex flex-col justify-center items-center text-center py-10">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-9 h-9" />
                </div>
                <h3 className="text-2xl font-black text-[#111111] mb-2 font-['Cairo']">
                  هذا الرقم التسلسلي مفعل مسجلاً ومحمياً
                </h3>
                <p className="text-slate-600 text-sm max-w-md mb-6 leading-relaxed">
                  وفقاً لسياسة منظومة سليبي، يُسمح بتفعيل وثيقة ضمان واحدة فقط لكل رقم تسلسلي للمرتبة لمنع التكرار وحفظ حقوق العميل الأصلية.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => onViewCertificate(product.activation!, product)}
                    className="inline-flex items-center gap-2 bg-[#D62828] hover:bg-[#B71C1C] text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-[#D62828]/25 transition cursor-pointer"
                  >
                    <Award className="w-5 h-5 text-[#D4AF37]" />
                    <span>فتح شهادة الضمان المعتمدة الآن</span>
                  </button>

                  <button
                    onClick={() => setShowClaimModal(true)}
                    className="inline-flex items-center gap-2 bg-white hover:bg-[#F5F5F5] border border-[#D62828] text-[#D62828] font-bold px-5 py-3 rounded-2xl transition cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4 text-[#D62828]" />
                    <span>تقديم طلب فحص / شكوى ضمان</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleActivate} className="space-y-4">
                <div className="border-b border-[#E5E7EB] pb-3 mb-4">
                  <h3 className="text-xl font-black text-[#111111] font-['Cairo'] flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#D62828]" />
                    <span>بيانات تفعيل الضمان (استمارة التسجيل)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    يرجى إدخال بيانات المشتري بدقة كما هي واردة في فاتورة الشراء لضمان اعتماد الشهادة.
                  </p>
                </div>

                {activationError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{activationError}</span>
                  </div>
                )}

                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>الاسم الثلاثي أو الرباعي للعميل *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="مثال: أحمد عبد الله الشربيني"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20 outline-none text-sm text-[#111111] font-semibold transition"
                  />
                </div>

                {/* Phone & Purchase Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#111111] mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>رقم الهاتف المحمول *</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full text-left font-mono font-bold px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20 outline-none text-sm text-[#111111] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111111] mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>تاريخ الشراء من الفاتورة *</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20 outline-none text-sm text-[#111111] font-semibold transition"
                    />
                  </div>
                </div>

                {/* Governorate & City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#111111] mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>المحافظة *</span>
                    </label>
                    <select
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20 outline-none text-sm text-[#111111] font-semibold transition"
                    >
                      {EGYPTIAN_GOVERNORATES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#111111] mb-1.5">
                      <span>المدينة / المنطقة *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="مثال: مصر الجديدة / مدينة نصر"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20 outline-none text-sm text-[#111111] font-semibold transition"
                    />
                  </div>
                </div>

                {/* Invoice Number */}
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>رقم فاتورة الشراء الأصلية *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="مثال: INV-2026-4412"
                    className="w-full font-mono font-bold px-4 py-2.5 rounded-xl border border-[#E5E7EB] focus:border-[#D62828] focus:ring-2 focus:ring-[#D62828]/20 outline-none text-sm text-[#111111] transition"
                  />
                </div>

                {/* Legal Acknowledgement Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={termsAgreed}
                      onChange={(e) => setTermsAgreed(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-[#D62828] focus:ring-[#D62828] border-[#E5E7EB]"
                    />
                    <span className="text-xs text-slate-600 leading-relaxed">
                      أقر بأن البيانات المذكورة صحيحة ومطابقة لفاتورة الشراء الرسمية الصادرة من موزع معتمد لشركة سليبي، وأوافق على شروط وأحكام الضمان.
                    </span>
                  </label>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={activating}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#D62828] hover:bg-[#B71C1C] text-white font-black text-base shadow-lg shadow-[#D62828]/25 hover:shadow-xl transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {activating ? (
                      <span>جاري معالجة وتوثيق الضمان...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 text-white" />
                        <span>تأكيد وتفعيل الضمان الفوري</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Customer Claim Modal */}
      <CustomerClaimModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        defaultSerialNumber={product?.serial_number || ''}
        defaultWarrantyId={product?.activation?.warranty_id || ''}
        defaultCustomerName={product?.activation?.customer_name || ''}
        defaultPhone={product?.activation?.phone || ''}
        onClaimCreated={(newClaim) => {
          alert(`تم استلام طلب الضمان بنجاح برقم: ${newClaim.claim_id}. سيتواصل معك قسم الجودة لتحديد موعد المعاينة.`);
        }}
      />
    </div>
  );
};
