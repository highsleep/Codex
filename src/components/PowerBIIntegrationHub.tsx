import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  Download,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  FileSpreadsheet,
  Globe,
  Code2,
  Sparkles,
  Layers,
  ArrowRight,
  HelpCircle,
  Zap,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PowerBIOverview {
  status: string;
  version: string;
  service: string;
  endpoints: {
    pbids_download: string;
    master_feed: string;
    warranties_csv: string;
    claims_csv: string;
    replacements_csv: string;
    products_csv: string;
    quality_csv: string;
    powerquery_script: string;
  };
  datasets: {
    fact_warranties_rows: number;
    fact_claims_rows: number;
    fact_replacements_rows: number;
    dim_products_rows: number;
    dim_calendar_months: number;
  };
  last_refresh: string;
}

interface PowerBIIntegrationHubProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const PowerBIIntegrationHub: React.FC<PowerBIIntegrationHubProps> = ({ onClose, isModal = false }) => {
  const [overview, setOverview] = useState<PowerBIOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pbids' | 'web_feed' | 'powerquery' | 'csv_pack' | 'schema'>('pbids');
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; latency: number; message: string } | null>(null);
  const [testing, setTesting] = useState<boolean>(false);
  const [showAdvancedHelp, setShowAdvancedHelp] = useState<boolean>(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/powerbi/overview');
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err) {
      console.error('Error loading Power BI overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/powerbi/feed');
      const end = performance.now();
      const latency = Math.round(end - start);
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          status: 'success',
          latency,
          message: `تم الاتصال بنجاح! استجابة الـ Feed مكتملة وتتضمن ${data.tables?.warranties?.length || 0} وثيقة ضمان و${data.tables?.claims?.length || 0} مطالبة جودة.`,
        });
      } else {
        setTestResult({
          status: 'error',
          latency,
          message: `تعذر الاتصال بالبوابة (HTTP ${res.status})`,
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        latency: 0,
        message: `خطأ في محاولة الاتصال: ${err.message}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const pbidsUrl = `${baseUrl}/api/powerbi/pbids`;
  const feedUrl = `${baseUrl}/api/powerbi/feed`;
  const mScriptUrl = `${baseUrl}/api/powerbi/query-script`;

  const mCodeSnippet = `// =========================================================================
// SLEEPEE POWER BI M-QUERY CONNECTOR SCRIPT
// Use: Power BI Desktop -> Home -> Advanced Editor (Paste Code Below)
// =========================================================================

let
    // 1. الاتصال برابط التغذية الحية لضمانات وجودة سليبي
    SourceUrl = "${feedUrl}",
    WebResponse = Web.Contents(SourceUrl, [Headers=[#"Accept"="application/json"]]),
    JsonData = Json.Document(WebResponse),
    Tables = JsonData[tables],

    // 2. جدول حقائق الضمانات (Fact_Warranties)
    WarrantiesRaw = Tables[warranties],
    WarrantiesTable = Table.FromRecords(WarrantiesRaw),
    TypedWarranties = Table.TransformColumnTypes(WarrantiesTable, {
        {"Warranty_ID", type text},
        {"Serial_Number", type text},
        {"Customer_Name", type text},
        {"Customer_Phone", type text},
        {"Governorate", type text},
        {"City", type text},
        {"Invoice_Number", type text},
        {"Purchase_Date", type date},
        {"Activation_Date", type date},
        {"Expiry_Date", type date},
        {"Model", type text},
        {"Size", type text},
        {"Warranty_Years", Int64.Type},
        {"Status", type text},
        {"Days_Since_Purchase", Int64.Type},
        {"Days_Remaining", Int64.Type},
        {"Is_Expired", Int64.Type},
        {"Has_Claims", Int64.Type},
        {"Claims_Count", Int64.Type},
        {"Has_Replacement", Int64.Type}
    })
in
    TypedWarranties`;

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden ${isModal ? 'max-w-4xl w-full mx-auto' : ''}`}>
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-black/20 backdrop-blur-xs border border-white/20 flex items-center justify-center shadow-inner">
              <BarChart2 className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-black/25 text-amber-100 text-[10px] font-black uppercase tracking-wider">
                  Power BI Direct Engine
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-100/90">
                  <Zap className="w-3 h-3" /> مزامنة سحابية مباشرة
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-['Cairo'] mt-0.5">
                تكامل وتصدير لوحة الإدارة إلى Microsoft Power BI
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition flex items-center gap-1.5 backdrop-blur-xs border border-white/20 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'جاري الفحص...' : 'فحص الاتصال الحي'}</span>
            </button>
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Live Metrics Ribbon */}
        {overview && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-5 pt-4 border-t border-white/15 text-white/90 text-xs font-medium">
            <div className="bg-black/15 rounded-xl p-2 px-3 border border-white/10">
              <span className="block text-[10px] text-amber-200">وثائق الضمان المتاحة:</span>
              <strong className="text-sm font-mono font-black text-white">{overview.datasets.fact_warranties_rows}</strong> وثيقة
            </div>
            <div className="bg-black/15 rounded-xl p-2 px-3 border border-white/10">
              <span className="block text-[10px] text-amber-200">شكاوى الجودة (Claims):</span>
              <strong className="text-sm font-mono font-black text-white">{overview.datasets.fact_claims_rows}</strong> مطالبة
            </div>
            <div className="bg-black/15 rounded-xl p-2 px-3 border border-white/10">
              <span className="block text-[10px] text-amber-200">المراتب المستبدلة:</span>
              <strong className="text-sm font-mono font-black text-white">{overview.datasets.fact_replacements_rows}</strong> استبدال
            </div>
            <div className="bg-black/15 rounded-xl p-2 px-3 border border-white/10">
              <span className="block text-[10px] text-amber-200">سيريالات المصنع:</span>
              <strong className="text-sm font-mono font-black text-white">{overview.datasets.dim_products_rows}</strong> مرتبة
            </div>
            <div className="bg-black/15 rounded-xl p-2 px-3 border border-white/10">
              <span className="block text-[10px] text-amber-200">حالة الربط والخدمة:</span>
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {overview.status} (جاهز 100%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Test Result Message */}
      {testResult && (
        <div
          className={`p-3.5 px-6 border-b text-xs flex items-center justify-between ${
            testResult.status === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.status === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-bold">{testResult.message}</span>
          </div>
          {testResult.latency > 0 && (
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
              {testResult.latency} ms
            </span>
          )}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 flex items-center gap-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('pbids')}
          className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'pbids'
              ? 'border-amber-500 text-amber-600 bg-white shadow-xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>ملف الربط بنقرة واحدة (.pbids)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">موصى به</span>
        </button>

        <button
          onClick={() => setActiveTab('web_feed')}
          className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'web_feed'
              ? 'border-amber-500 text-amber-600 bg-white shadow-xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-4 h-4 text-indigo-500" />
          <span>رابط التغذية الحية (Live Web Feed)</span>
        </button>

        <button
          onClick={() => setActiveTab('powerquery')}
          className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'powerquery'
              ? 'border-amber-500 text-amber-600 bg-white shadow-xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-4 h-4 text-emerald-500" />
          <span>كود Power Query (M Language)</span>
        </button>

        <button
          onClick={() => setActiveTab('csv_pack')}
          className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'csv_pack'
              ? 'border-amber-500 text-amber-600 bg-white shadow-xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-sky-500" />
          <span>تصدير حزم CSV المهيأة</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`py-3.5 px-4 border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === 'schema'
              ? 'border-amber-500 text-amber-600 bg-white shadow-xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-500" />
          <span>مخطط العلاقات (Star Schema)</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="p-6">
        {/* TAB 1: PBIDS FILE (EASIEST & RECOMMENDED) */}
        {activeTab === 'pbids' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 border border-amber-200/80">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-bold text-[11px]">
                      أسهل طريقة
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      تنزيل ملف Power BI Data Source المباشر (.pbids)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                    ملف <code className="bg-amber-100/70 px-1 py-0.5 rounded font-mono text-[11px]">sleepee_warranty_powerbi.pbids</code> يحتوي على تكوين الاتصال السحابي المهيأ مسبقاً.
                    بمجرد تنزيله والنقر المزدوج عليه، سيفتح برنامج <strong>Power BI Desktop</strong> فوراً ويقوم بإنشاء اتصال Web مباشر مع كافة جداول الضمان والعيوب دون الحاجة لإدخال أي روابط يدوياً!
                  </p>
                </div>

                <a
                  href={pbidsUrl}
                  download="sleepee_warranty_powerbi.pbids"
                  className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm transition flex items-center gap-2 shadow-lg shadow-amber-500/20 shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل ملف Power BI (.pbids)</span>
                </a>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>كيف تبدأ في 3 خطوات بسيطة (أقل من دقيقة):</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                    1
                  </div>
                  <h5 className="font-bold text-slate-800">تحميل الملف</h5>
                  <p className="text-slate-600 leading-relaxed">
                    اضغط على الزر الذهبي أعلاه لتحميل ملف <code className="text-amber-800 font-mono">.pbids</code> على جهازك.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                    2
                  </div>
                  <h5 className="font-bold text-slate-800">فتح الملف في Power BI</h5>
                  <p className="text-slate-600 leading-relaxed">
                    انقر نقراً مزدوجاً فوق الملف المُحمّل. سيبدأ Power BI Desktop بالعمل ويطلب تأكيد نوع الاتصال (اختر Anonymous / مجهول).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                    3
                  </div>
                  <h5 className="font-bold text-slate-800">استعراض اللوحات والمؤشرات</h5>
                  <p className="text-slate-600 leading-relaxed">
                    اضغط على <strong>Load</strong> لتنزيل الجداول (الضمانات، الشكاوى، المنتجات)، وابدأ في تصميم التقارير والرسوم البيانية التفاعلية فوراً.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE WEB FEED */}
        {activeTab === 'web_feed' && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-950 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-900">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>الربط المباشر عبر Power BI Web Connector (REST API OData Feed)</span>
              </div>
              <p className="text-indigo-900/90 leading-relaxed">
                يمكنك استخدام هذا الرابط الحي في Power BI بالذهاب إلى:
                <br />
                <code className="font-mono bg-white/80 px-2 py-0.5 rounded text-indigo-800 font-bold">
                  Power BI Desktop → Get Data → Web → الصق الرابط أدناه
                </code>
                <br />
                الميزة: يقوم Power BI بتحديث البيانات تلقائياً بضغطة زر <strong>Refresh</strong> أو مجدولاً عبر Power BI Service Gateway!
              </p>
            </div>

            {/* Master URL Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>رابط التغذية الشاملة لكافة الجداول (Master Feed URL):</span>
                <span className="text-[10px] text-slate-500">JSON Format / UTF-8</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={feedUrl}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-800 select-all"
                />
                <button
                  onClick={() => handleCopy(feedUrl, 'feedUrl')}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  {copiedKey === 'feedUrl' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ الرابط</span>
                    </>
                  )}
                </button>
                <a
                  href={feedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 transition"
                  title="استعراض التغذية الحية في المتصفح"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Table-specific Feeds */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-xs">روابط التغذية الحية للجداول المستقلة (CSV Feeds):</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  { name: 'جدول الضمانات (Fact_Warranties)', url: `${baseUrl}/api/powerbi/csv/warranties`, key: 'w_csv' },
                  { name: 'جدول المطالبات والشكاوى (Fact_Claims)', url: `${baseUrl}/api/powerbi/csv/claims`, key: 'c_csv' },
                  { name: 'جدول الاستبدالات (Fact_Replacements)', url: `${baseUrl}/api/powerbi/csv/replacements`, key: 'r_csv' },
                  { name: 'جدول المنتجات وسيريالات المصنع (Dim_Products)', url: `${baseUrl}/api/powerbi/csv/products`, key: 'p_csv' },
                ].map((item) => (
                  <div key={item.key} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-800 block truncate">{item.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono truncate block">{item.url}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(item.url, item.key)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shrink-0"
                      title="نسخ الرابط"
                    >
                      {copiedKey === item.key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: POWER QUERY M LANGUAGE */}
        {activeTab === 'powerquery' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-600" />
                  <span>كود Power Query (M Script) الجاهز للنسخ المباشر</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تمت تهيئة الكود مع تعريف أنواع الحقول (DateTime, Int, Text) مسبقاً لتوفير عناء تنظيف البيانات
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(mCodeSnippet, 'mCode')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {copiedKey === 'mCode' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>تم نسخ الكود</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ كود M</span>
                    </>
                  )}
                </button>

                <a
                  href={`${mScriptUrl}?download=true`}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل ملف (.pq)</span>
                </a>
              </div>
            </div>

            <div className="relative rounded-2xl bg-slate-900 p-4 border border-slate-800 overflow-x-auto text-left dir-ltr">
              <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed whitespace-pre">
                {mCodeSnippet}
              </pre>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <strong className="text-slate-800 block">طريقة استخدام هذا الكود في Power BI:</strong>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
                <li>افتح برنامج Power BI Desktop واختر <strong>Blank Report</strong>.</li>
                <li>من الشريط العلوي (Home)، اضغط على <strong>Transform Data</strong> (تحويل البيانات) لفتح محرر Power Query.</li>
                <li>اضغط على <strong>Advanced Editor</strong> (المحرر المتقدم).</li>
                <li>امسح الكود القديم والصق الكود المنسوخ أعلاه، ثم اضغط <strong>Done</strong> ثم <strong>Close & Apply</strong>.</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 4: CSV DATA PACK */}
        {activeTab === 'csv_pack' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 text-sky-950 text-xs space-y-1">
              <span className="font-bold text-sky-900 block text-sm">تنزيل حزم البيانات المهيأة للتحليل (Offline Data Pack)</span>
              <p className="text-sky-900/90 leading-relaxed">
                ملفات CSV مجهزة بترميز UTF-8 مع خاصية BOM لضمان فتح الحروف العربية بدقة متناهية داخل كل من Excel و Power BI Desktop دون أي تشوه.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  title: 'جدول وثائق الضمان (Fact_Warranties)',
                  desc: 'يشمل كود الوثيقة، السيريال، الموديل، التواريخ، وحالة السريان والمدة المتبقية',
                  url: `${baseUrl}/api/powerbi/csv/warranties`,
                  count: overview?.datasets.fact_warranties_rows || 0,
                  icon: ShieldCheck,
                },
                {
                  title: 'جدول شكاوى ومطالبات الجودة (Fact_Claims)',
                  desc: 'نوع العيب المصنعي، وصف الشكوى، تقرير المعاينة، مدة الحل، وطلب الاستبدال',
                  url: `${baseUrl}/api/powerbi/csv/claims`,
                  count: overview?.datasets.fact_claims_rows || 0,
                  icon: AlertTriangle,
                },
                {
                  title: 'جدول المراتب المستبدلة (Fact_Replacements)',
                  desc: 'السيريال القديم مقابل السيريال الجديد، سبب الاستبدال، وتاريخ التسليم',
                  url: `${baseUrl}/api/powerbi/csv/replacements`,
                  count: overview?.datasets.fact_replacements_rows || 0,
                  icon: RefreshCw,
                },
                {
                  title: 'جدول سيريالات وموديلات المصنع (Dim_Products)',
                  desc: 'بيانات أمر الشغل، الدفعة (Batch)، المقاس، وسنوات الضمان المعتمدة',
                  url: `${baseUrl}/api/powerbi/csv/products`,
                  count: overview?.datasets.dim_products_rows || 0,
                  icon: Layers,
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-amber-400 hover:shadow-md transition flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-amber-600" />
                          </div>
                          <span className="font-bold text-slate-900 text-xs">{item.title}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                          {item.count} سجل
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>

                    <a
                      href={item.url}
                      download
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تنزيل ملف CSV مباشر</span>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: STAR SCHEMA DIAGRAM */}
        {activeTab === 'schema' && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 text-purple-950 text-xs space-y-1">
              <span className="font-bold text-purple-900 block text-sm">مخطط نمذجة البيانات (Power BI Star Schema)</span>
              <p className="text-purple-900/90 leading-relaxed">
                تمت هندسة البيانات بنمط مخطط النجمة (Star Schema) الأمثل لأداء Power BI و DAX، بحيث ترتبط جداول الحقائق (Facts) بجداول الأبعاد (Dimensions) بمفاتيح واضحة وسريعة.
              </p>
            </div>

            {/* Schema Visual Mockup */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Fact Warranties */}
                <div className="p-4 rounded-xl bg-slate-800 border border-amber-500/50 space-y-2">
                  <div className="flex items-center justify-between text-amber-400 font-bold border-b border-slate-700 pb-1.5">
                    <span>Fact_Warranties</span>
                    <span className="text-[10px] text-amber-300">جدول حقائق رئيسي</span>
                  </div>
                  <ul className="text-[11px] font-mono text-slate-300 space-y-1">
                    <li className="text-amber-300 font-bold">🔑 Warranty_ID (PK)</li>
                    <li className="text-sky-300 font-bold">🔗 Serial_Number (FK)</li>
                    <li>Customer_Name / Phone</li>
                    <li>Governorate / City</li>
                    <li>Purchase_Date (Date)</li>
                    <li>Expiry_Date (Date)</li>
                    <li>Status (ساري / منتهي)</li>
                    <li>Days_Remaining (Int)</li>
                  </ul>
                </div>

                {/* Fact Claims */}
                <div className="p-4 rounded-xl bg-slate-800 border border-rose-500/50 space-y-2">
                  <div className="flex items-center justify-between text-rose-400 font-bold border-b border-slate-700 pb-1.5">
                    <span>Fact_Claims</span>
                    <span className="text-[10px] text-rose-300">جدول حقائق الجودة</span>
                  </div>
                  <ul className="text-[11px] font-mono text-slate-300 space-y-1">
                    <li className="text-rose-300 font-bold">🔑 Claim_ID (PK)</li>
                    <li className="text-amber-300 font-bold">🔗 Warranty_ID (FK)</li>
                    <li className="text-sky-300 font-bold">🔗 Serial_Number (FK)</li>
                    <li>Complaint_Type</li>
                    <li>Resolution_Days</li>
                    <li>Status (NEW / INSPECTED / REPLACED)</li>
                    <li>Replacement_Requested (1/0)</li>
                  </ul>
                </div>

                {/* Dim Products & Dim Calendar */}
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-slate-800 border border-sky-500/50 space-y-1.5">
                    <div className="flex items-center justify-between text-sky-400 font-bold border-b border-slate-700 pb-1">
                      <span>Dim_Products</span>
                      <span className="text-[10px] text-sky-300">بعد المنتجات</span>
                    </div>
                    <ul className="text-[10px] font-mono text-slate-300 space-y-0.5">
                      <li className="text-sky-300 font-bold">🔑 Serial_Number (PK)</li>
                      <li>Model / Size / Warranty_Years</li>
                      <li>Batch_No / Production_Order</li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-800 border border-emerald-500/50 space-y-1.5">
                    <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-700 pb-1">
                      <span>Dim_Calendar</span>
                      <span className="text-[10px] text-emerald-300">بعد التواريخ التلقائي</span>
                    </div>
                    <ul className="text-[10px] font-mono text-slate-300 space-y-0.5">
                      <li className="text-emerald-300 font-bold">🔑 Year_Month / Date_Key</li>
                      <li>Year, Quarter, Month_Name_AR</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>نصيحة نمذجة:</strong> في نافذة Model View في Power BI، اسحب حقل <code className="text-sky-400 font-mono">Serial_Number</code> من Fact_Warranties إلى Dim_Products لإنشاء علاقة (Many to 1) فورية!
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Notes & Assistance */}
      <div className="p-4 px-6 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>البيانات مؤمنة ومشفرة، ومتوافقة 100% مع Power BI Desktop & Power BI Service</span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://powerbi.microsoft.com/desktop/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1"
          >
            <span>تحميل Power BI Desktop مجاناً</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
