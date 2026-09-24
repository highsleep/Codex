import React, { useState, useEffect } from 'react';
import {
  Printer,
  QrCode,
  Barcode,
  Search,
  FileText,
  Layers,
  CheckCircle2,
  AlertCircle,
  Package,
  ShieldCheck,
  Calendar,
  Building2,
  Hash,
  Download,
  Eye,
  RefreshCw,
  Award,
  Sparkles,
  Settings,
  Sliders,
  Radio,
  Server,
  Activity,
  Save,
  Check,
  RotateCcw,
} from 'lucide-react';
import { AppUser, Product, WarrantyActivation } from '../types';

interface TraceabilityAndPrintingCenterProps {
  currentUser: AppUser;
}

interface PrinterConfig {
  printer_name: string;
  printer_model: string;
  resolution_dpi: string;
  label_width_mm: number;
  label_height_mm: number;
  barcode_type: string;
  qr_settings: {
    error_correction: string;
    module_size: number;
    base_url: string;
  };
  ip_address: string;
  port: number;
  status: string;
  last_updated?: string;
}

export const TraceabilityAndPrintingCenter: React.FC<TraceabilityAndPrintingCenterProps> = ({ currentUser }) => {
  // Main Navigation Tabs
  const [activeSubTab, setActiveSubTab] = useState<'printing' | 'traceability' | 'printer_config' | 'templates'>('printing');

  // Search & Selection State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedActivation, setSelectedActivation] = useState<WarrantyActivation | null>(null);
  const [lifecycleEvents, setLifecycleEvents] = useState<any[]>([]);
  const [claimsHistory, setClaimsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Printer Configuration State (Loaded from DB / API)
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>({
    printer_name: 'Zebra ZD220 - Industrial Line 1',
    printer_model: 'Zebra ZD220',
    resolution_dpi: '203 DPI',
    label_width_mm: 100,
    label_height_mm: 50,
    barcode_type: 'Code 128',
    qr_settings: {
      error_correction: 'M',
      module_size: 4,
      base_url: 'https://sleephigh.com/verify',
    },
    ip_address: '192.168.1.180',
    port: 9100,
    status: 'ONLINE',
  });
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Job & Printing State
  const [printType, setPrintType] = useState<'barcode' | 'qr' | 'warranty_card' | 'tracking_card' | 'batch_label' | 'serial' | 'bulk'>('barcode');
  const [bulkCount, setBulkCount] = useState<number>(10);
  const [selectedTemplate, setSelectedTemplate] = useState<'warranty_card' | 'product_card' | 'shipping' | 'production' | 'batch'>('warranty_card');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // 1. Fetch Printer Config from Database
  const fetchPrinterConfig = async () => {
    try {
      const res = await fetch('/api/printer/config');
      if (res.ok) {
        const data = await res.json();
        if (data) setPrinterConfig(data);
      }
    } catch (err) {
      console.warn('Could not fetch printer config, using system database fallback:', err);
    }
  };

  // 2. Fetch Active Products List from Database for Selection
  const fetchProductsList = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDbProducts(data);
          // If query is empty and products exist, auto-select the first product from DB
          if (data.length > 0 && !selectedProduct) {
            handleSelectProductRecord(data[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load products list from DB:', err);
    }
  };

  // 3. Search Database for Product Traceability Record
  const handleSearch = async (queryToSearch: string) => {
    const q = queryToSearch.trim();
    if (!q) {
      setError('الرجاء إدخال رقم تسلسلي أو رقم دفعة للبحث في قاعدة البيانات');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      // Query Product record from DB
      const res = await fetch(`/api/products/verify?code=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok) {
        // Attempt secondary lookup by serial direct endpoint
        const res2 = await fetch(`/api/products/${encodeURIComponent(q)}`);
        if (res2.ok) {
          const prod = await res2.json();
          handleSelectProductRecord(prod);
          return;
        }
        throw new Error(data.error || 'لم يتم العثور على المنتج أو الرقم التسلسلي في قاعدة البيانات');
      }

      if (data.product) {
        setSelectedProduct(data.product);
        setSelectedActivation(data.activation || null);
        fetchProductLifecycleAndClaims(data.product.serial_number);
      } else {
        throw new Error('لم يتم العثور على أي سجل مطابق برقم التسلسل المدخل');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الاتصال بقاعدة البيانات لتقصي سجل التتبع');
      setSelectedProduct(null);
      setSelectedActivation(null);
      setLifecycleEvents([]);
      setClaimsHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Load Lifecycle Events & Claims for selected product
  const fetchProductLifecycleAndClaims = async (serialNumber: string) => {
    try {
      const [lifeRes, claimRes] = await Promise.all([
        fetch(`/api/lifecycle/${encodeURIComponent(serialNumber)}`),
        fetch(`/api/claims?search=${encodeURIComponent(serialNumber)}`),
      ]);

      if (lifeRes.ok) {
        const lifeData = await lifeRes.json();
        setLifecycleEvents(Array.isArray(lifeData) ? lifeData : lifeData.events || []);
      }

      if (claimRes.ok) {
        const claimData = await claimRes.json();
        setClaimsHistory(Array.isArray(claimData) ? claimData : claimData.claims || []);
      }
    } catch (err) {
      console.warn('Lifecycle/Claims fetch error:', err);
    }
  };

  // Selection Handler when user clicks a DB product
  const handleSelectProductRecord = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery(product.serial_number);
    setError(null);
    // Fetch activation, lifecycle, claims for this selected product
    fetch(`/api/warranty/verify/${encodeURIComponent(product.serial_number)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.activation) setSelectedActivation(data.activation);
        else setSelectedActivation(null);
      })
      .catch(() => setSelectedActivation(null));

    fetchProductLifecycleAndClaims(product.serial_number);
  };

  // Save Printer Configuration to Database
  const handleSavePrinterConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const res = await fetch('/api/printer/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(printerConfig),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ إعدادات الطابعة');

      setSuccessNotice('تم حفظ وتوثيق إعدادات طابعة Zebra ZD220 في قاعدة البيانات بنجاح');
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ تهيئة الطابعة');
    } finally {
      setSavingConfig(false);
    }
  };

  // Execute Print Job to Zebra ZD220
  const handleExecutePrint = async () => {
    if (!selectedProduct) {
      setError('يرجى تحديد أو استدعاء منتج فعلي من قاعدة البيانات للطباعة');
      return;
    }

    setIsPrinting(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const res = await fetch('/api/production/zebra-test-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number: selectedProduct.serial_number,
          printer_model: printerConfig.printer_model,
          printer_ip: printerConfig.ip_address,
          printer_port: printerConfig.port,
          print_type: printType,
          quantity: printType === 'bulk' ? bulkCount : 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال أمر الطباعة إلى الطابعة');

      setSuccessNotice(`تم إرسال مهمة الطباعة بنجاح إلى طابعة ${printerConfig.printer_model} (${printerConfig.resolution_dpi}) - السيريال: ${selectedProduct.serial_number}`);
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setError(err.message || 'فشل الاتصال بالطابعة المصنعية');
    } finally {
      setIsPrinting(false);
    }
  };

  useEffect(() => {
    fetchPrinterConfig();
    fetchProductsList();
  }, []);

  return (
    <div className="space-y-6 text-right font-['Cairo']">
      {/* Top Banner & Header */}
      <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-[#D62828] to-indigo-900" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D62828] animate-pulse" />
            <span className="text-xs font-bold text-slate-500">منظومة الطباعة والباركود المعتمدة وتتبع دورة الحياة (Zebra ZD220)</span>
          </div>
          <h2 className="text-2xl font-black text-[#111111]">مركز الطباعة والتتبع</h2>
          <p className="text-xs text-slate-500">
            ربط حي ومباشر مع قاعدة بيانات المنتجات، تفعيل وثائق الضمان، وتوليد طباعة الباركود وطابعة Zebra ZD220 بوضوح {printerConfig.resolution_dpi}
          </p>
        </div>

        {/* Functional Sub-Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F5F5F5] p-1.5 rounded-2xl border border-[#E5E7EB]">
          <button
            onClick={() => setActiveSubTab('printing')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'printing' ? 'bg-[#D62828] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>محطة طباعة الملصقات</span>
          </button>

          <button
            onClick={() => setActiveSubTab('traceability')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'traceability' ? 'bg-[#D62828] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>تتبع دورة حياة المنتج</span>
          </button>

          <button
            onClick={() => setActiveSubTab('printer_config')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'printer_config' ? 'bg-[#D62828] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>إعدادات الطابعة المصنعية</span>
          </button>

          <button
            onClick={() => setActiveSubTab('templates')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'templates' ? 'bg-[#D62828] text-white shadow-sm' : 'text-slate-600 hover:bg-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>قوالب الملصقات والضمان</span>
          </button>
        </div>
      </div>

      {/* Global Error & Notice Display */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 text-xs font-bold underline cursor-pointer">
            إغلاق
          </button>
        </div>
      )}

      {successNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* ========================================== */}
      {/* SUBTAB 1: PRINTING STATION */}
      {/* ========================================== */}
      {activeSubTab === 'printing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls & Database Selection Panel */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-black text-[#111111] flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#D62828]" />
                <span>إعدادات مهمة الطباعة الحالية</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-bold border border-slate-200">
                {printerConfig.printer_model} ({printerConfig.resolution_dpi})
              </span>
            </div>

            <div className="space-y-4">
              {/* Product Selector from Database */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">اختر منتج من قاعدة البيانات الفعلية ({dbProducts.length})</label>
                <select
                  value={selectedProduct?.serial_number || ''}
                  onChange={(e) => {
                    const prod = dbProducts.find((p) => p.serial_number === e.target.value);
                    if (prod) handleSelectProductRecord(prod);
                  }}
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#D62828] focus:outline-hidden"
                >
                  <option value="">-- اختر مرتبة/منتج من قاعدة البيانات --</option>
                  {dbProducts.map((p) => (
                    <option key={p.id} value={p.serial_number}>
                      {p.name} - {p.serial_number} ({p.batch_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Serial / Batch Search Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">أو إدخال الرقم التسلسلي يدويًا للبحث</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="أدخل الرقم التسلسلي..."
                    className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#D62828] focus:outline-hidden font-mono"
                  />
                  <button
                    onClick={() => handleSearch(searchQuery)}
                    disabled={loading}
                    className="px-4 py-2 bg-[#111111] hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>تحميل السجل</span>
                  </button>
                </div>
              </div>

              {/* Job Output Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع المخرج المطلوب طباعته</label>
                <select
                  value={printType}
                  onChange={(e: any) => setPrintType(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#D62828] focus:outline-hidden"
                >
                  <option value="barcode">ملصق باركود أفقية (Code 128)</option>
                  <option value="qr">رمز الاستجابة السريعة للضمان (QR Code)</option>
                  <option value="warranty_card">بطاقة ضمان المنتج الرسمية (Warranty Card)</option>
                  <option value="tracking_card">بطاقة تتبع وتوصيف المرتبة (Tracking Card)</option>
                  <option value="batch_label">ملصق تشغيلة الدفعة (Batch Label)</option>
                  <option value="serial">ملصق السيريال التسلسلي الفردي</option>
                  <option value="bulk">طباعة مجمعة لدفعة كاملة (Bulk Batch Print)</option>
                </select>
              </div>

              {printType === 'bulk' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">عدد النسخ المطلوب طباعتها</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={bulkCount}
                    onChange={(e) => setBulkCount(Number(e.target.value))}
                    className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#D62828] focus:outline-hidden font-mono"
                  />
                </div>
              )}

              {/* Active Printer Status Display */}
              <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB] space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600 font-bold">
                  <span>الطابعة المعتمدة:</span>
                  <span className="text-slate-900 font-mono">{printerConfig.printer_model}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 font-bold">
                  <span>دقة الطباعة (DPI):</span>
                  <span className="text-indigo-700 font-mono font-black">{printerConfig.resolution_dpi}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 font-bold">
                  <span>مقاس الملصق:</span>
                  <span className="text-slate-800 font-mono">{printerConfig.label_width_mm}mm × {printerConfig.label_height_mm}mm</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 font-bold">
                  <span>حالة الاتصال:</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {printerConfig.status} ({printerConfig.ip_address}:{printerConfig.port})
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleExecutePrint}
                  disabled={isPrinting || !selectedProduct}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#D62828] hover:bg-[#B71C1C] disabled:bg-slate-300 text-white text-xs font-black shadow-md shadow-[#D62828]/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPrinting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري إرسال أوامر ZPL للطابعة...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>طباعة الملصق الآن (Zebra ZD220 Direct)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Live Print Preview Card (Direct Data from DB) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-base font-black text-[#111111] flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#D62828]" />
                  <span>معاينة الملصق المباشر من قاعدة البيانات الحقيقية</span>
                </h3>
                <p className="text-xs text-slate-500">
                  سيتم استخدام هذا التنسيق في طابعة {printerConfig.printer_model} بوضوح {printerConfig.resolution_dpi}
                </p>
              </div>
              {selectedProduct && (
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                  بيانات منتج حقيقي موثق
                </span>
              )}
            </div>

            {selectedProduct ? (
              <div className="space-y-6">
                {/* Visual Label Layout Card */}
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 p-8 rounded-3xl relative min-h-[260px] flex flex-col justify-between">
                  <div className="flex items-start justify-between border-b border-slate-300 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-[#D62828]" />
                        <span className="text-sm font-black text-slate-900 tracking-wide">
                          {selectedProduct.brand_name || 'سليبي'} - ({selectedProduct.category_name || 'مرتبة'})
                        </span>
                        {selectedProduct.manufacturing_system_name && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            نظام: {selectedProduct.manufacturing_system_name}
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-black text-slate-900 mt-1">{selectedProduct.model || (selectedProduct as any).name}</h4>
                      <p className="text-xs text-slate-600 font-bold mt-0.5">
                        المقاس: {selectedProduct.size || (selectedProduct as any).dimensions || '180×200 سم'} | ضمان: {selectedProduct.warranty_years || 10} سنوات
                      </p>
                      {selectedProduct.internal_product_code && (
                        <p className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
                          كود الماستر: {selectedProduct.internal_product_code}
                        </p>
                      )}
                    </div>

                    <div className="text-left bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                      <QrCode className="w-14 h-14 text-slate-900" />
                      <span className="text-[10px] font-mono font-bold text-slate-500 block text-center mt-1">
                        QR Warranty
                      </span>
                    </div>
                  </div>

                  {/* Serial Barcode & Batch Section */}
                  <div className="py-6 flex flex-col items-center justify-center space-y-2 bg-white rounded-2xl my-3 p-4 border border-slate-200 shadow-xs">
                    <Barcode className="w-64 h-16 text-slate-900" />
                    <span className="text-sm font-mono font-black text-slate-900 tracking-widest">
                      *{selectedProduct.serial_number}*
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 font-bold pt-2 border-t border-slate-300">
                    <div>
                      <span>رقم الدفعة: </span>
                      <span className="font-mono text-slate-900 font-black">{selectedProduct.batch_number}</span>
                    </div>
                    <div>
                      <span>تاريخ الإنتاج: </span>
                      <span className="font-mono text-slate-900 font-black">{selectedProduct.production_date}</span>
                    </div>
                    <div>
                      <span>خط الإنتاج: </span>
                      <span className="text-slate-900 font-black">{selectedProduct.production_line || 'الخط الرئيسي'}</span>
                    </div>
                  </div>
                </div>

                {/* DB Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-[#F9FAFB] p-3.5 rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 font-bold block mb-1">الرقم التسلسلي</span>
                    <span className="font-mono font-black text-slate-900 block">{selectedProduct.serial_number}</span>
                  </div>

                  <div className="bg-[#F9FAFB] p-3.5 rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 font-bold block mb-1">حالة الضمان الحالية</span>
                    <span className={`font-bold block ${selectedActivation ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {selectedActivation ? 'مفعل وموثق' : 'غير مفعل (جاهز للتفعيل)'}
                    </span>
                  </div>

                  <div className="bg-[#F9FAFB] p-3.5 rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 font-bold block mb-1">عدد المطالبات والشكاوى</span>
                    <span className="font-mono font-black text-slate-900 block">{claimsHistory.length} مطالبات</span>
                  </div>

                  <div className="bg-[#F9FAFB] p-3.5 rounded-2xl border border-[#E5E7EB]">
                    <span className="text-slate-500 font-bold block mb-1">دورة الحياة</span>
                    <span className="font-bold text-indigo-700 block">{selectedProduct.status || 'منتج معتمد'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
                <Package className="w-12 h-12 text-slate-400 mx-auto" />
                <h4 className="text-base font-bold text-slate-800">لم يتم تحديد أو استدعاء أي سجل من قاعدة البيانات</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  اختر منتجاً من القائمة المنسدلة أعلاه أو أدخل الرقم التسلسلي في خانة البحث لمعاينة وطباعة الملصق الفعلي.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* SUBTAB 2: TRACEABILITY & LIFECYCLE */}
      {/* ========================================== */}
      {activeSubTab === 'traceability' && (
        <div className="space-y-6">
          {/* Real Search Bar */}
          <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-4">
            <h3 className="text-base font-black text-[#111111] flex items-center gap-2">
              <Search className="w-5 h-5 text-[#D62828]" />
              <span>مركز الاستعلام وتقصي دورة حياة المنتج في قواعد البيانات</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="أدخل الرقم التسلسلي أو رقم الوثيقة أو رقم الدفعة..."
                className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#D62828] focus:outline-hidden font-mono"
              />
              <button
                onClick={() => handleSearch(searchQuery)}
                disabled={loading}
                className="px-6 py-3 bg-[#D62828] hover:bg-[#B71C1C] text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#D62828]/20"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>استعلام وتقصي السجل الحقيقي</span>
              </button>
            </div>
          </div>

          {/* Traceability Details View */}
          {selectedProduct ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Product Profile & Specs */}
              <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-4">
                <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                  <h4 className="text-base font-black text-[#111111] flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-600" />
                    <span>بيانات المنتج الأساسية</span>
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200">
                    سجل موثق
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold block">اسم الموديل:</span>
                    <span className="text-sm font-black text-slate-900 block mt-0.5">{selectedProduct.name}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block">الرقم التسلسلي (Serial Number):</span>
                    <span className="font-mono font-black text-[#D62828] text-sm block mt-0.5">{selectedProduct.serial_number}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block">المقاس والأبعاد:</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{selectedProduct.dimensions || 'قياسي'}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block">رقم الدفعة (Batch Number):</span>
                    <span className="font-mono font-bold text-slate-800 block mt-0.5">{selectedProduct.batch_number}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block">تاريخ التصنيع:</span>
                    <span className="font-mono font-bold text-slate-800 block mt-0.5">{selectedProduct.production_date}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block">فترة الضمان المعتمدة:</span>
                    <span className="font-bold text-amber-700 block mt-0.5">{selectedProduct.warranty_years} سنوات ضمان مصنعي</span>
                  </div>
                </div>
              </div>

              {/* Lifecycle History & Timeline */}
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-6">
                <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                  <h4 className="text-base font-black text-[#111111] flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#D62828]" />
                    <span>سجل مراحل دورة الحياة والتتبع الزمني</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-500">
                    {lifecycleEvents.length} أحداث مسجلة
                  </span>
                </div>

                {lifecycleEvents.length > 0 ? (
                  <div className="relative border-r-2 border-slate-200 pr-6 space-y-6">
                    {lifecycleEvents.map((ev, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute -right-[31px] top-1 w-4 h-4 rounded-full bg-[#D62828] border-2 border-white ring-2 ring-slate-200" />
                        <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">{ev.event || ev.title || 'حدث تتبع'}</span>
                            <span className="font-mono text-[11px] text-slate-500">{ev.date || ev.timestamp}</span>
                          </div>
                          <p className="text-xs text-slate-600">{ev.description || ev.details}</p>
                          {ev.actor && <span className="text-[10px] text-slate-400 font-bold block mt-1">بواسطة: {ev.actor}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-8 rounded-2xl text-center text-xs text-slate-500 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="font-bold">تم خروج المنتج من خط التصنيع بنجاح ولم تسجل أي بلاغات أو عيوب جودة.</p>
                  </div>
                )}

                {/* Claims History Table */}
                <div className="pt-4 border-t border-[#E5E7EB] space-y-3">
                  <h5 className="text-xs font-black text-slate-900">سجل الشكاوى والمطالبات الميدانية</h5>
                  {claimsHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-[#F5F5F5] text-slate-700 font-bold border-b border-[#E5E7EB]">
                            <th className="p-2.5">رقم المطالبة</th>
                            <th className="p-2.5">تاريخ البلاغ</th>
                            <th className="p-2.5">نوع الشكوى</th>
                            <th className="p-2.5">الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {claimsHistory.map((c, i) => (
                            <tr key={i} className="border-b border-[#E5E7EB] hover:bg-slate-50">
                              <td className="p-2.5 font-mono font-bold text-slate-900">{c.claim_id || c.id}</td>
                              <td className="p-2.5 font-mono">{c.created_at || c.date}</td>
                              <td className="p-2.5">{c.complaint_type || c.type}</td>
                              <td className="p-2.5 font-bold text-indigo-700">{c.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">لا يوجد أي سجل مطالبات أو بلاغات صيانة لهذا المنتج.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-[#E5E7EB] text-center space-y-3">
              <Search className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">أدخل الرقم التسلسلي أو اختر منتجًا لاستعراض سجل التتبع</h4>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* SUBTAB 3: PRINTER CONFIGURATION CENTER */}
      {/* ========================================== */}
      {activeSubTab === 'printer_config' && (
        <form onSubmit={handleSavePrinterConfig} className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
            <div>
              <h3 className="text-base font-black text-[#111111] flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#D62828]" />
                <span>مركز إعدادات وتهيئة الطابعة المصنعية (Printer Configuration Center)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديد مواصفات طابعة الباركود الفعالة بمصنع المراتب وتثبيت إعدادات DPI وعرض الملصقات في قاعدة البيانات
              </p>
            </div>
            <button
              type="submit"
              disabled={savingConfig}
              className="px-5 py-2.5 bg-[#D62828] hover:bg-[#B71C1C] text-white rounded-xl text-xs font-black shadow-md shadow-[#D62828]/20 transition flex items-center gap-2 cursor-pointer"
            >
              {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ الإعدادات في قاعدة البيانات</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Printer Model Specs */}
            <div className="space-y-4 bg-[#F9FAFB] p-5 rounded-2xl border border-[#E5E7EB]">
              <h4 className="text-xs font-black text-[#111111] border-b border-[#E5E7EB] pb-2 flex items-center gap-2">
                <Printer className="w-4 h-4 text-[#D62828]" />
                <span>طراز الطابعة ودقة الطباعة</span>
              </h4>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطابعة المعرف</label>
                <input
                  type="text"
                  value={printerConfig.printer_name}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, printer_name: e.target.value })}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">موديل الطابعة الفعلي (Printer Model)</label>
                <input
                  type="text"
                  value={printerConfig.printer_model}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, printer_model: e.target.value })}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 font-mono"
                  placeholder="Zebra ZD220"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">دقة الطباعة المصنعية (Print Resolution DPI)</label>
                <select
                  value={printerConfig.resolution_dpi}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, resolution_dpi: e.target.value })}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 font-mono"
                >
                  <option value="203 DPI">203 DPI (Zebra ZD220 Standard - 8 dots/mm)</option>
                  <option value="300 DPI">300 DPI (High Resolution Industrial)</option>
                  <option value="600 DPI">600 DPI (Ultra Precision)</option>
                </select>
              </div>
            </div>

            {/* Label Dimensions */}
            <div className="space-y-4 bg-[#F9FAFB] p-5 rounded-2xl border border-[#E5E7EB]">
              <h4 className="text-xs font-black text-[#111111] border-b border-[#E5E7EB] pb-2 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>أبعاد ومقاسات الورق والملصق</span>
              </h4>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عرض الملصق (Label Width mm)</label>
                <input
                  type="number"
                  value={printerConfig.label_width_mm}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, label_width_mm: Number(e.target.value) })}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ارتفاع الملصق (Label Height mm)</label>
                <input
                  type="number"
                  value={printerConfig.label_height_mm}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, label_height_mm: Number(e.target.value) })}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نوع الباركود المعتمد (1D Barcode)</label>
                <select
                  value={printerConfig.barcode_type}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, barcode_type: e.target.value })}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                >
                  <option value="Code 128">Code 128 (قياسي متوافق مع Zebra ZPL)</option>
                  <option value="Code 39">Code 39</option>
                  <option value="EAN-13">EAN-13</option>
                  <option value="DataMatrix">DataMatrix Industrial</option>
                </select>
              </div>
            </div>

            {/* Network & QR Settings */}
            <div className="space-y-4 bg-[#F9FAFB] p-5 rounded-2xl border border-[#E5E7EB]">
              <h4 className="text-xs font-black text-[#111111] border-b border-[#E5E7EB] pb-2 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-600" />
                <span>شبكة الاتصال وإعدادات QR</span>
              </h4>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان IP الشبكي للطابعة</label>
                <input
                  type="text"
                  value={printerConfig.ip_address}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, ip_address: e.target.value })}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 font-mono"
                  placeholder="192.168.1.180"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">منفذ الاتصال المباشر (ZPL Port)</label>
                <input
                  type="number"
                  value={printerConfig.port}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, port: Number(e.target.value) })}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رابط التحقق الخاص بـ QR Code</label>
                <input
                  type="text"
                  value={printerConfig.qr_settings.base_url}
                  onChange={(e) =>
                    setPrinterConfig({
                      ...printerConfig,
                      qr_settings: { ...printerConfig.qr_settings, base_url: e.target.value },
                    })
                  }
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 font-mono"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================== */}
      {/* SUBTAB 4: PRINTING TEMPLATES */}
      {/* ========================================== */}
      {activeSubTab === 'templates' && (
        <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-6">
          <div className="border-b border-[#E5E7EB] pb-3">
            <h3 className="text-base font-black text-[#111111] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D62828]" />
              <span>مكتبة قوالب الطباعة المصنعية المعتمدة</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              قوالب جاهزة للطباعة متوافقة مع أوامر Zebra ZPL وبطاقات الضمان الرقمية للمستهلكين
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <span className="px-2.5 py-1 rounded-md bg-rose-100 text-[#D62828] text-[10px] font-black">
                ZPL Code 128
              </span>
              <h4 className="text-sm font-bold text-slate-900">قالب ملصق التغليف الشامل (100mm × 50mm)</h4>
              <p className="text-xs text-slate-600">
                يتضمن اسم الموديل، الأبعاد، السيريال، رقم الدفعة، ورمز QR للتحقق المباشر من الضمان.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black">
                Warranty PDF Card
              </span>
              <h4 className="text-sm font-bold text-slate-900">بطاقة الضمان الرقمية للعميل (A5 / Digital)</h4>
              <p className="text-xs text-slate-600">
                شهادة الضمان الموثقة بشعار المصنع ورقم الوثيقة مع إمكانية التحميل والطباعة.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <span className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-900 text-[10px] font-black">
                Batch Shipping Tag
              </span>
              <h4 className="text-sm font-bold text-slate-900">بطاقة شحن الدفعات والمستودعات</h4>
              <p className="text-xs text-slate-600">
                ملصق حزمة الدفعة لتتبع الكميات المنتجة والشحن إلى الفروع ومراكز التوزيع.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
