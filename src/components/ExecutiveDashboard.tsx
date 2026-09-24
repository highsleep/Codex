import React, { useState, useEffect, useRef } from 'react';
import {
  Crown,
  TrendingUp,
  BarChart3,
  Activity,
  FileSpreadsheet,
  FileText,
  Download,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Package,
  Factory,
  Smile,
  Users,
  RefreshCw,
  Calendar,
  Layers,
  ChevronDown,
  Percent,
  XCircle,
  FileCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AppUser } from '../types';

interface ExecutiveDashboardProps {
  currentUser?: AppUser | null;
}

interface ExecutiveData {
  filters: {
    availableFamilies: string[];
    availableModels: string[];
    availableFactories: string[];
  };
  summaryCards: {
    totalProducts: number;
    activeWarranties: number;
    activationsThisMonth: number;
    openClaims: number;
    approvedReplacements: number;
    closedClaims: number;
    customerSatisfactionRate: number;
    avgClaimResolutionTimeDays: number;
  };
  trends: {
    months: string[];
    activationsByMonth: number[];
    claimsByMonth: number[];
    replacementsByMonth: number[];
    registrationsByMonth: number[];
  };
  qualityKPIs: {
    topComplaintTypes: { type: string; count: number; percentage: number }[];
    mostReturnedModels: { model: string; replacementCount: number; claimCount: number }[];
    claimsPerModel: { model: string; totalUnits: number; claimsCount: number; claimsPer100: number }[];
    warrantyFailureRate: number;
  };
  manufacturingKPIs: {
    productionVolume: number;
    defectRate: number;
    scrapRate: number;
    reworkRate: number;
    hasRealScrap?: boolean;
    scrapStatusMessage?: string;
  };
  customerServiceKPIs: {
    openCases: number;
    escalatedCases: number;
    avgResponseTimeHours: number;
    avgClosureTimeDays: number;
    hasRealCSAT?: boolean;
    csatStatusMessage?: string;
  };
  dataConfidence?: {
    confidenceScore: number;
    realRecords: number;
    totalRecords: number;
    hasRealScrap: boolean;
    hasRealCSAT: boolean;
    hasRealWarrantyCost: boolean;
  };
  kpiMetadata?: Record<string, {
    name: string;
    source: string;
    classification: 'VERIFIED' | 'DERIVED' | 'ESTIMATED' | 'INCOMPLETE';
    dataOrigin: 'REAL' | 'SEEDED' | 'IMPORTED' | 'MANUAL';
    confidence: string;
  }>;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ currentUser }) => {
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTransparencyModal, setShowTransparencyModal] = useState(false);

  // Filters State
  const [dateRange, setDateRange] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [productFamily, setProductFamily] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [factoryLine, setFactoryLine] = useState<string>('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateRange) params.append('dateRange', dateRange);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (productFamily) params.append('productFamily', productFamily);
      if (model) params.append('model', model);
      if (factoryLine) params.append('factoryLine', factoryLine);

      const res = await fetch(`/api/executive/dashboard?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('غير مصرح لك بالاطلاع على لوحة القيادة التنفيذية. تقتصر الصلاحية على المدير العام ومدير المصنع ومدير النظام الفائق.');
        }
        throw new Error(`تعذر استرجاع مؤشرات القيادة التنفيذية (كود: ${res.status})`);
      }
      const json = await res.json();
      const isValid = json && json.summaryCards && json.trends && json.qualityKPIs && json.manufacturingKPIs && json.customerServiceKPIs;
      if (!isValid) {
        throw new Error('بيانات لوحة القيادة التنفيذية غير صالحة');
      }
      setData(json);
    } catch (err: any) {
      console.error('Error loading executive dashboard:', err);
      setError(err.message || 'حدث خطأ غير متوقع أثناء تحميل بيانات اللوحة التنفيذية.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, startDate, endDate, productFamily, model, factoryLine]);

  const handleResetFilters = () => {
    setDateRange('all');
    setStartDate('');
    setEndDate('');
    setProductFamily('');
    setModel('');
    setFactoryLine('');
  };

  // Export CSV Function
  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Sleepee Executive Summary KPI Report'],
      ['Exported At', new Date().toLocaleString('ar-EG')],
      ['Role', currentUser?.role || 'EXECUTIVE'],
      [''],
      ['--- Executive Summary Cards ---'],
      ['Total Products', data.summaryCards.totalProducts],
      ['Active Warranties', data.summaryCards.activeWarranties],
      ['Warranty Activations This Month', data.summaryCards.activationsThisMonth],
      ['Open Claims', data.summaryCards.openClaims],
      ['Approved Replacements', data.summaryCards.approvedReplacements],
      ['Closed Claims', data.summaryCards.closedClaims],
      ['Customer Satisfaction Rate (%)', `${data.summaryCards.customerSatisfactionRate}%`],
      ['Average Claim Resolution Time (Days)', `${data.summaryCards.avgClaimResolutionTimeDays} days`],
      [''],
      ['--- Quality KPIs ---'],
      ['Warranty Failure Rate (%)', `${data.qualityKPIs?.warrantyFailureRate || 0}%`],
      ['Top Complaint Types'],
      ...(data.qualityKPIs?.topComplaintTypes || []).map((c) => [c.type, c.count, `${c.percentage}%`]),
      [''],
      ['--- Manufacturing KPIs ---'],
      ['Production Volume', data.manufacturingKPIs.productionVolume],
      ['Defect Rate (%)', `${data.manufacturingKPIs.defectRate}%`],
      ['Scrap Rate (%)', `${data.manufacturingKPIs.scrapRate}%`],
      ['Rework Rate (%)', `${data.manufacturingKPIs.reworkRate}%`],
      [''],
      ['--- Customer Service KPIs ---'],
      ['Open Cases', data.customerServiceKPIs.openCases],
      ['Escalated Cases', data.customerServiceKPIs.escalatedCases],
      ['Average Response Time (Hours)', `${data.customerServiceKPIs.avgResponseTimeHours} hrs`],
      ['Average Closure Time (Days)', `${data.customerServiceKPIs.avgClosureTimeDays} days`],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sleepee_executive_kpis_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel Function
  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1: Executive Summary
    const summaryRows = [
      { Metric: 'إجمالي المنتجات', Value: data.summaryCards.totalProducts, Unit: 'مرتبة' },
      { Metric: 'الضمانات النشطة', Value: data.summaryCards.activeWarranties, Unit: 'وثيقة' },
      { Metric: 'تفعيلات الشهر الحالي', Value: data.summaryCards.activationsThisMonth, Unit: 'تفعيل' },
      { Metric: 'المطالبات المفتوحة قيد المعالجة', Value: data.summaryCards.openClaims, Unit: 'مطالبة' },
      { Metric: 'المطالبات المعتمدة للاستبدال', Value: data.summaryCards.approvedReplacements, Unit: 'بديل' },
      { Metric: 'المطالبات المغلقة والإحباطات', Value: data.summaryCards.closedClaims, Unit: 'مطالبة' },
      { Metric: 'معدل رضا العملاء (CSAT)', Value: `${data.summaryCards.customerSatisfactionRate}%`, Unit: 'نسبة مئوية' },
      { Metric: 'متوسط زمن معالجة المطالبة', Value: `${data.summaryCards.avgClaimResolutionTimeDays} يوم`, Unit: 'أيام' },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'الملخص التنفيذي');

    // Sheet 2: Trends
    const trendRows = (data.trends?.months || []).map((m, idx) => ({
      الشهر: m,
      'تفعيلات الضمان': data.trends?.activationsByMonth?.[idx] || 0,
      'المطالبات والشكاوى': data.trends?.claimsByMonth?.[idx] || 0,
      'استبدالات المنتجات': data.trends?.replacementsByMonth?.[idx] || 0,
      'تسجيلات وتصنيع المنتجات': data.trends?.registrationsByMonth?.[idx] || 0,
    }));
    const wsTrends = XLSX.utils.json_to_sheet(trendRows);
    XLSX.utils.book_append_sheet(wb, wsTrends, 'اتجاهات الأداء الشهري');

    // Sheet 3: Quality & Manufacturing KPIs
    const qualityRows = (data.qualityKPIs?.topComplaintTypes || []).map((c) => ({
      'نوع الشكوى / العيب': c.type,
      'عدد الحالات': c.count,
      'النسبة المئوية': `${c.percentage}%`,
    }));
    const wsQuality = XLSX.utils.json_to_sheet(qualityRows);
    XLSX.utils.book_append_sheet(wb, wsQuality, 'مؤشرات الجودة والعيوب');

    XLSX.writeFile(wb, `sleepee_executive_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Helper to parse any CSS color (oklch, color-mix, etc.) to standard rgb/rgba
  const parseCssColorToRgb = (colorStr: string): string => {
    if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit' || colorStr === 'initial') return colorStr;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return 'rgb(100, 116, 139)';
      ctx.fillStyle = colorStr;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (a === 0) return 'transparent';
      if (a === 255) return `rgb(${r}, ${g}, ${b})`;
      return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
    } catch {
      return 'rgb(100, 116, 139)';
    }
  };

  const replaceUnsupportedColors = (cssText: string): string => {
    if (!cssText) return cssText;
    if (!cssText.includes('oklch') && !cssText.includes('oklab') && !cssText.includes('color-mix')) return cssText;
    return cssText
      .replace(/oklch\([^)]+\)/gi, (match) => parseCssColorToRgb(match))
      .replace(/oklab\([^)]+\)/gi, (match) => parseCssColorToRgb(match))
      .replace(/color-mix\([^)]+\)/gi, (match) => parseCssColorToRgb(match));
  };

  // Export PDF Function
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const exportPDF = async () => {
    if (!data) return;
    setIsExportingPDF(true);
    setPdfError(null);

    try {
      const element = dashboardRef.current;
      if (!element) {
        throw new Error('عنصر التقرير التنفيذي غير متاح للطباعة');
      }

      // Render the DOM node to canvas using html2canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc',
        onclone: (clonedDoc) => {
          const noPrintEls = clonedDoc.querySelectorAll('.no-print');
          noPrintEls.forEach((el) => {
            (el as HTMLElement).style.display = 'none';
          });

          // Convert oklch/color-mix in <style> elements
          const styleTags = clonedDoc.querySelectorAll('style');
          styleTags.forEach((styleTag) => {
            if (styleTag.textContent) {
              styleTag.textContent = replaceUnsupportedColors(styleTag.textContent);
            }
          });

          // Force global RTL and Arabic-friendly font rendering overrides on the cloned document body
          const body = clonedDoc.body;
          if (body) {
            body.style.setProperty('direction', 'rtl', 'important');
            body.style.setProperty('text-align', 'right', 'important');
            body.style.setProperty('font-family', "'Cairo', 'Tajawal', sans-serif", 'important');
          }

          // Convert oklch/color-mix in element attributes and computed styles
          const clonedElements = clonedDoc.querySelectorAll('*');
          clonedElements.forEach((el) => {
            const htmlEl = el as HTMLElement;

            // CRITICAL RTL/ARABIC LIGATURES FIX:
            // Force letter-spacing to 0px and font-variant-ligatures.
            // This prevents html2canvas from rendering character-by-character, which completely
            // breaks Arabic ligatures (disjointed letters) and reverses RTL layout rendering.
            htmlEl.style.setProperty('letter-spacing', '0px', 'important');
            htmlEl.style.setProperty('word-spacing', 'normal', 'important');
            htmlEl.style.setProperty('font-variant-ligatures', 'common-ligatures', 'important');
            htmlEl.style.setProperty('font-family', "'Cairo', 'Tajawal', sans-serif", 'important');

            if (htmlEl.getAttribute('style')) {
              htmlEl.setAttribute('style', replaceUnsupportedColors(htmlEl.getAttribute('style') || ''));
            }

            try {
              const comp = window.getComputedStyle(htmlEl);
              if (comp.color && comp.color.includes('oklch')) {
                htmlEl.style.color = parseCssColorToRgb(comp.color);
              }
              if (comp.backgroundColor && comp.backgroundColor.includes('oklch')) {
                htmlEl.style.backgroundColor = parseCssColorToRgb(comp.backgroundColor);
              }
              if (comp.borderColor && comp.borderColor.includes('oklch')) {
                htmlEl.style.borderColor = parseCssColorToRgb(comp.borderColor);
              }
            } catch {
              // Ignore computed style errors
            }
          });
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 8;
      const imgWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= (pdfHeight - margin * 2);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= (pdfHeight - margin * 2);
      }

      const fileName = `sleepee_executive_kpi_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      setPdfError(`تعذر إنشاء ملف PDF: ${err?.message || 'حدث خطأ أثناء معالجة التقرير'}`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <RefreshCw className="w-10 h-10 text-[#D62828] animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800 font-['Cairo']">جاري تجميع بيانات لوحة القيادة التنفيذية...</h3>
        <p className="text-sm text-slate-500 mt-1">يتم معالجة مؤشرات الأداء الحية وحساب معدلات الجودة والتصنيع</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-right">
        <div className="flex items-center gap-3 text-rose-700 font-bold mb-2">
          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
          <span className="text-base font-['Cairo']">تعذر تحميل بيانات لوحة القيادة التنفيذية</span>
        </div>
        <p className="text-sm text-rose-800 leading-relaxed">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const summaryCards = data.summaryCards || {
    totalProducts: 0, activeWarranties: 0, activationsThisMonth: 0, openClaims: 0, approvedReplacements: 0, closedClaims: 0, customerSatisfactionRate: 0, avgClaimResolutionTimeDays: 0,
  };
  const trends = data.trends || { months: [], activationsByMonth: [], claimsByMonth: [], replacementsByMonth: [], registrationsByMonth: [] };
  const qualityKPIs = data.qualityKPIs || { topComplaintTypes: [], mostReturnedModels: [], claimsPerModel: [], warrantyFailureRate: 0 };
  const manufacturingKPIs = data.manufacturingKPIs || { productionVolume: 0, defectRate: 0, scrapRate: 0, reworkRate: 0 };
  const customerServiceKPIs = data.customerServiceKPIs || { openCases: 0, escalatedCases: 0, avgResponseTimeHours: 0, avgClosureTimeDays: 0 };

  return (
    <div ref={dashboardRef} className="space-y-6 text-right print:space-y-4 font-['Cairo'] p-1">
      
      {/* PDF Export Error Notification */}
      {pdfError && (
        <div className="no-print bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{pdfError}</span>
          </div>
          <button
            onClick={() => setPdfError(null)}
            className="text-rose-600 hover:text-rose-900 font-bold px-2 py-1 rounded-lg hover:bg-rose-100 transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* EXECUTIVE HEADER CARD */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>الإدارة العليا والإشراف العام</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold">
                <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>تحديث حي</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-['Cairo']">
              لوحة القيادة التنفيذية ومؤشرات الأداء الاستراتيجية
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              رؤية شاملة وموحدة لمؤشرات التصنيع، توكيد الجودة، تفعيلات الضمان الإلكتروني، واستجابة خدمة العملاء عبر كافة المصانع والخطوط.
            </p>
          </div>

          {/* EXPORT TOOLBAR */}
          <div className="no-print flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={exportPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
              title="تصدير تقرير تنفيذي PDF"
            >
              {isExportingPDF ? (
                <RefreshCw className="w-4 h-4 text-rose-400 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 text-rose-400" />
              )}
              <span>{isExportingPDF ? 'جاري التصدير...' : 'تقرير PDF'}</span>
            </button>

            <button
              onClick={exportExcel}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              title="تصدير مصنف إكسل XLSX"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              title="تصدير بيانات CSV"
            >
              <Download className="w-4 h-4" />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* EXPORT METADATA BANNER (Included in PDF Capture) */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2 font-['Cairo']">
        <div className="flex flex-wrap items-center gap-2 font-bold text-slate-800">
          <span>تقرير مؤشرات الأداء التنفيذي | Sleepee Executive KPI Report</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600">تاريخ التصدير: <span className="font-mono">{new Date().toLocaleString('ar-EG')}</span></span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] bg-white px-3 py-1 rounded-lg border border-slate-200 font-bold">
          <span className="text-slate-500">الفلاتر النشطة:</span>
          <span className="text-[#D62828]">
            {dateRange === 'all'
              ? 'كافة السجلات الزمنية'
              : dateRange === 'this_month'
              ? 'الشهر الحالي'
              : dateRange === 'this_quarter'
              ? 'الربع الحالي'
              : dateRange === 'this_year'
              ? 'السنة الحالية'
              : `${startDate || 'بداية'} إلى ${endDate || 'نهاية'}`}
          </span>
          {productFamily && <span>• عائلة: {productFamily}</span>}
          {model && <span>• موديل: {model}</span>}
          {factoryLine && <span>• خط الإنتاج: {factoryLine}</span>}
        </div>
      </div>

      {/* DATA CONFIDENCE & SEEDED WARNING BANNER */}
      {data.dataConfidence && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4 font-['Cairo']">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${data.dataConfidence.confidenceScore >= 80 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black">مؤشر موثوقية وجودة بيانات التحليلات (Data Confidence)</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono ${data.dataConfidence.confidenceScore >= 80 ? 'bg-emerald-500/30 text-emerald-300' : 'bg-amber-500/30 text-amber-300'}`}>
                  {data.dataConfidence.confidenceScore}% موثوق
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                السجلات الفعلية المعتمدة: {data.dataConfidence.realRecords} من إجمالي {data.dataConfidence.totalRecords} سجل. يتم تمييز وتنبيه أي مؤشر يعتمد على بيانات تجريبية (Seeded Data).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTransparencyModal(true)}
              className="no-print flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>شفافية المؤشرات ومصدر البيانات (KPI Traceability)</span>
            </button>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="no-print bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Filter className="w-4 h-4 text-[#D62828]" />
            <span>فلترة البيانات والتقارير التنفيذية</span>
          </div>
          {(dateRange !== 'all' || startDate || endDate || productFamily || model || factoryLine) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Date Range Preset Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">النطاق الزمني</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#D62828]"
            >
              <option value="all">كافة السجلات الزمنية</option>
              <option value="this_month">الشهر الحالي (سبتمبر 2026)</option>
              <option value="this_quarter">الربع الحالي (Q3 2026)</option>
              <option value="this_year">السنة الحالية (2026)</option>
              <option value="custom">نطاق تواريخ مخصص</option>
            </select>
          </div>

          {/* Product Family Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">عائلة المنتج</label>
            <select
              value={productFamily}
              onChange={(e) => setProductFamily(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#D62828]"
            >
              <option value="">كافة عائلات المنتجات</option>
              {(data?.filters?.availableFamilies || []).map((fam) => (
                <option key={fam} value={fam}>{fam}</option>
              ))}
            </select>
          </div>

          {/* Model Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">الموديل التجاري</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#D62828]"
            >
              <option value="">كافة الموديلات</option>
              {(data?.filters?.availableModels || []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Factory Line Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">المصنع / خط الإنتاج</label>
            <select
              value={factoryLine}
              onChange={(e) => setFactoryLine(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#D62828]"
            >
              <option value="">كافة الخطوط والمصانع</option>
              {(data?.filters?.availableFactories || []).map((fac) => (
                <option key={fac} value={fac}>{fac}</option>
              ))}
            </select>
          </div>

          {/* Refresh Action */}
          <div className="flex items-end">
            <button
              onClick={fetchDashboardData}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث البيانات</span>
            </button>
          </div>
        </div>

        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">من تاريخ</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* 8 DASHBOARD SUMMARY CARDS GRID */}
      <div>
        <h2 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#D62828]" />
          <span>الملخص التنفيذي وأهم المؤشرات (Executive Summary Cards)</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Card 1: Total Products */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#D62828] transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">إجمالي المنتجات</span>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums">
              {summaryCards.totalProducts.toLocaleString('ar-EG')}
            </div>
            <span className="text-[10px] font-bold text-slate-500 mt-1 block">مرتبة مسجلة بالنظام</span>
          </div>

          {/* Card 2: Active Warranties */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-500 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">الضمانات النشطة</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tabular-nums">
              {summaryCards.activeWarranties.toLocaleString('ar-EG')}
            </div>
            <span className="text-[10px] font-bold text-emerald-600/80 mt-1 block">وثيقة سارية لم تنتهِ بعد</span>
          </div>

          {/* Card 3: Warranty Activations This Month */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-500 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">تفعيلات هذا الشهر</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600 font-mono tabular-nums">
              {summaryCards.activationsThisMonth.toLocaleString('ar-EG')}
            </div>
            <span className="text-[10px] font-bold text-blue-600/80 mt-1 block">تفعيل جديد في سبتمبر 2026</span>
          </div>

          {/* Card 4: Open Claims */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-500 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">المطالبات المفتوحة</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono tabular-nums">
              {summaryCards.openClaims.toLocaleString('ar-EG')}
            </div>
            <span className="text-[10px] font-bold text-amber-600/80 mt-1 block">قيد الفحص أو المعاينة</span>
          </div>

          {/* Card 5: Approved Replacements */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-500 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">المطالبات المعتمدة للاستبدال</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 font-mono tabular-nums">
              {summaryCards.approvedReplacements.toLocaleString('ar-EG')}
            </div>
            <span className="text-[10px] font-bold text-indigo-600/80 mt-1 block">تم إصدار شهادة استبدال</span>
          </div>

          {/* Card 6: Closed Claims */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-purple-500 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">المطالبات المغلقة</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-600 font-mono tabular-nums">
              {summaryCards.closedClaims.toLocaleString('ar-EG')}
            </div>
            <span className="text-[10px] font-bold text-purple-600/80 mt-1 block">معالجة ومكتملة نهائياً</span>
          </div>

          {/* Card 7: Customer Satisfaction Rate */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#D62828] transition">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">معدل رضا العملاء (CSAT)</span>
                {!customerServiceKPIs.hasRealCSAT && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[9px] font-black">
                    بيانات تجريبية (Seeded Data)
                  </span>
                )}
              </div>
              <div className="p-2 rounded-xl bg-rose-50 text-[#D62828]">
                <Smile className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#D62828] font-mono tabular-nums">
              {customerServiceKPIs.hasRealCSAT ? `${summaryCards.customerSatisfactionRate}%` : 'تجريبي'}
            </div>
            <span className="text-[10px] font-bold text-rose-600 mt-1 block">
              {customerServiceKPIs.hasRealCSAT ? 'تقييمات عملاء فعلية مؤكدة' : 'لا تتوفر تقييمات عملاء حقيقية (No Real Feedback)'}
            </span>
          </div>

          {/* Card 8: Average Claim Resolution Time */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-teal-500 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">متوسط زمن معالجة المطالبة</span>
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-teal-600 font-mono tabular-nums">
              {summaryCards.avgClaimResolutionTimeDays} <span className="text-sm font-normal font-sans">يوم</span>
            </div>
            <span className="text-[10px] font-bold text-teal-600/80 mt-1 block">من فتح المطالبة للإغلاق</span>
          </div>
        </div>
      </div>

      {/* TREND CHARTS SECTION (4 MONTHLY TRENDS) */}
      <div className="space-y-3">
        <h2 className="text-sm font-black text-slate-700 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#D62828]" />
          <span>اتجاهات الأداء التشغيلي والشهري (Monthly Trend Charts)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Chart 1: Warranty Activations by Month */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">تفعيلات الضمان شهرياً</h3>
                <p className="text-[11px] text-slate-500">حجم وثائق الضمان المفعلة إلكترونياً من المستهلكين</p>
              </div>
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold">تفعيل</span>
            </div>
            <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-2 bg-slate-50/50 rounded-xl border border-slate-100">
              {(trends?.months || []).map((m, idx) => {
                const val = trends?.activationsByMonth?.[idx] || 0;
                const maxVal = Math.max(...(trends?.activationsByMonth || [1]), 1);
                const heightPct = Math.round((val / maxVal) * 100);
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-600 font-mono opacity-80 group-hover:opacity-100 transition">
                      {val}
                    </span>
                    <div
                      style={{ height: `${Math.max(12, heightPct)}%` }}
                      className="w-full max-w-[28px] bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-md transition-all duration-300 group-hover:brightness-110 shadow-xs"
                    />
                    <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">{m}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Claims by Month */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">المطالبات والشكاوى شهرياً</h3>
                <p className="text-[11px] text-slate-500">معدل البلاغات الواردة لخدمة العملاء ورجوعات الجودة</p>
              </div>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold">مطالبة</span>
            </div>
            <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-2 bg-slate-50/50 rounded-xl border border-slate-100">
              {(trends?.months || []).map((m, idx) => {
                const val = trends?.claimsByMonth?.[idx] || 0;
                const maxVal = Math.max(...(trends?.claimsByMonth || [1]), 1);
                const heightPct = Math.round((val / maxVal) * 100);
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-amber-600 font-mono opacity-80 group-hover:opacity-100 transition">
                      {val}
                    </span>
                    <div
                      style={{ height: `${Math.max(12, heightPct)}%` }}
                      className="w-full max-w-[28px] bg-gradient-to-t from-amber-500 to-orange-400 rounded-t-md transition-all duration-300 group-hover:brightness-110 shadow-xs"
                    />
                    <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">{m}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 3: Replacements by Month */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">طلبات الاستبدال شهرياً</h3>
                <p className="text-[11px] text-slate-500">حجم قرارات الاستبدال المعتمدة من توكيد الجودة</p>
              </div>
              <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold">بديل</span>
            </div>
            <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-2 bg-slate-50/50 rounded-xl border border-slate-100">
              {(trends?.months || []).map((m, idx) => {
                const val = trends?.replacementsByMonth?.[idx] || 0;
                const maxVal = Math.max(...(trends?.replacementsByMonth || [1]), 1);
                const heightPct = Math.round((val / maxVal) * 100);
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-purple-600 font-mono opacity-80 group-hover:opacity-100 transition">
                      {val}
                    </span>
                    <div
                      style={{ height: `${Math.max(12, heightPct)}%` }}
                      className="w-full max-w-[28px] bg-gradient-to-t from-purple-600 to-indigo-500 rounded-t-md transition-all duration-300 group-hover:brightness-110 shadow-xs"
                    />
                    <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">{m}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 4: Product Registrations by Month */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">تسجيل وتصنيع المنتجات شهرياً</h3>
                <p className="text-[11px] text-slate-500">حجم الإنتاج الكلي الخارج من خطوط التجميع</p>
              </div>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">مرتبة</span>
            </div>
            <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-2 bg-slate-50/50 rounded-xl border border-slate-100">
              {(trends?.months || []).map((m, idx) => {
                const val = trends?.registrationsByMonth?.[idx] || 0;
                const maxVal = Math.max(...(trends?.registrationsByMonth || [1]), 1);
                const heightPct = Math.round((val / maxVal) * 100);
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-emerald-600 font-mono opacity-80 group-hover:opacity-100 transition">
                      {val}
                    </span>
                    <div
                      style={{ height: `${Math.max(12, heightPct)}%` }}
                      className="w-full max-w-[28px] bg-gradient-to-t from-emerald-600 to-teal-500 rounded-t-md transition-all duration-300 group-hover:brightness-110 shadow-xs"
                    />
                    <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">{m}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* THREE SECTIONS: QUALITY KPIs + MANUFACTURING KPIs + CS KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* SECTION 1: QUALITY KPIs */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 text-[#D62828] rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">مؤشرات توكيد الجودة وتحليل العيوب (Quality KPIs)</h3>
                <p className="text-[11px] text-slate-500">تفاصيل الشكاوى، الموديلات المرجوعة، ونسبة الفشل</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-rose-50 text-[#D62828] border border-rose-200 rounded-full text-xs font-bold font-mono">
              معدل الفشل: {qualityKPIs?.warrantyFailureRate || 0}%
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Complaint Types */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">أبرز أنواع الشكاوى والعيوب المصنعية</h4>
              <div className="space-y-2">
                {(qualityKPIs?.topComplaintTypes || []).map((c) => (
                  <div key={c.type} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-slate-800">{c.type}</span>
                      <span className="text-[#D62828] font-mono">{c.count} حالة ({c.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, c.percentage)}%` }}
                        className="bg-[#D62828] h-full rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Returned Models & Claims per model */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700">الموديلات الأكثر استبدالاً ومطالبة</h4>
              <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                {(qualityKPIs?.mostReturnedModels || []).map((m) => (
                  <div key={m.model} className="p-2.5 bg-white flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{m.model}</div>
                      <div className="text-[10px] text-slate-400">إجمالي البلاغات: {m.claimCount}</div>
                    </div>
                    <div className="text-left">
                      <span className="px-2 py-0.5 rounded bg-rose-50 text-[#D62828] font-bold font-mono text-[11px]">
                        {m.replacementCount} استبدال
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Claims Per Product Model Table */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-700 mb-2">كثافة المطالبات لكل موديل تجاري (Per 100 Units)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                    <th className="p-2.5">الموديل التجاري</th>
                    <th className="p-2.5">الوحدات المباعة/المصنعة</th>
                    <th className="p-2.5">عدد المطالبات</th>
                    <th className="p-2.5 text-left">معدل المطالبة لكل 100 وحدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(qualityKPIs?.claimsPerModel || []).map((item) => (
                    <tr key={item.model} className="hover:bg-slate-50/80 transition">
                      <td className="p-2.5 font-bold text-slate-800">{item.model}</td>
                      <td className="p-2.5 font-mono">{item.totalUnits}</td>
                      <td className="p-2.5 font-mono text-amber-700 font-bold">{item.claimsCount}</td>
                      <td className="p-2.5 text-left font-mono font-bold text-[#D62828]">
                        {item.claimsPer100} %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MANUFACTURING + CUSTOMER SERVICE KPIs */}
        <div className="space-y-6">

          {/* SECTION 2: MANUFACTURING KPIs */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                <Factory className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">مؤشرات التصنيع والإنتاج (Manufacturing KPIs)</h3>
                <p className="text-[11px] text-slate-500">معدلات الجودة بوابات الفحص والمصنع</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-bold block">حجم الإنتاج الكلي</span>
                <span className="text-xl font-black text-slate-900 font-mono tabular-nums block mt-1">
                  {manufacturingKPIs.productionVolume}
                </span>
                <span className="text-[10px] text-slate-400">مرتبة جرى تجميعها</span>
              </div>

              <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                <span className="text-[11px] text-rose-700 font-bold block">معدل العيوب المصنعية</span>
                <span className="text-xl font-black text-rose-700 font-mono tabular-nums block mt-1">
                  {manufacturingKPIs.defectRate}%
                </span>
                <span className="text-[10px] text-rose-600/80">عند بوابة QC الفحص الأول</span>
              </div>

              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-800 font-bold block">معدل الهالك (Scrap Rate)</span>
                  {!manufacturingKPIs.hasRealScrap && (
                    <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 border border-amber-400 rounded text-[9px] font-black">
                      Test Data
                    </span>
                  )}
                </div>
                <span className="text-xl font-black text-amber-800 font-mono tabular-nums block mt-1">
                  {manufacturingKPIs.hasRealScrap ? `${manufacturingKPIs.scrapRate}%` : 'تجريبي'}
                </span>
                <span className="text-[10px] text-amber-700/80 block truncate">
                  {manufacturingKPIs.hasRealScrap ? 'إتلاف الخامات والإسفنج' : 'No Real Scrap Data Available'}
                </span>
              </div>

              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                <span className="text-[11px] text-blue-800 font-bold block">معدل إعادة التشغيل (Rework)</span>
                <span className="text-xl font-black text-blue-800 font-mono tabular-nums block mt-1">
                  {manufacturingKPIs.reworkRate}%
                </span>
                <span className="text-[10px] text-blue-700/80">تصحيح الخياطة والتغليف</span>
              </div>
            </div>
          </div>

          {/* SECTION 3: CUSTOMER SERVICE KPIs */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">مؤشرات خدمة العملاء والضمان (CS KPIs)</h3>
                <p className="text-[11px] text-slate-500">سرعة الاستجابة والإغلاق وسجل التصعيد</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-bold block">الحالات المفتوحة</span>
                <span className="text-xl font-black text-slate-900 font-mono tabular-nums block mt-1">
                  {customerServiceKPIs.openCases}
                </span>
                <span className="text-[10px] text-slate-400">قيد التواصل والمتابعة</span>
              </div>

              <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100">
                <span className="text-[11px] text-rose-700 font-bold block">الحالات المصعدة</span>
                <span className="text-xl font-black text-rose-700 font-mono tabular-nums block mt-1">
                  {customerServiceKPIs.escalatedCases}
                </span>
                <span className="text-[10px] text-rose-600/80">أولوية عالية / عاجلة</span>
              </div>

              <div className="bg-teal-50/60 p-3 rounded-xl border border-teal-100">
                <span className="text-[11px] text-teal-800 font-bold block">زمن الاستجابة الأولية</span>
                <span className="text-xl font-black text-teal-800 font-mono tabular-nums block mt-1">
                  {customerServiceKPIs.avgResponseTimeHours} <span className="text-xs font-normal">ساعة</span>
                </span>
                <span className="text-[10px] text-teal-700/80">أول تواصل مع المستهلك</span>
              </div>

              <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                <span className="text-[11px] text-purple-800 font-bold block">متوسط زمن الإغلاق</span>
                <span className="text-xl font-black text-purple-800 font-mono tabular-nums block mt-1">
                  {customerServiceKPIs.avgClosureTimeDays} <span className="text-xs font-normal">يوم</span>
                </span>
                <span className="text-[10px] text-purple-700/80">حتى الحل النهائي</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* KPI TRANSPARENCY & TRACEABILITY MODAL */}
      {showTransparencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-['Cairo'] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black">شفافية وتتبع مؤشرات الأداء التنفيذي (KPI Traceability & Data Origin)</h3>
                  <p className="text-[11px] text-slate-300">تصنيف كل مؤشر، مصدر البيانات، ونوع السجلات (حقيقية vs تجريبية)</p>
                </div>
              </div>
              <button
                onClick={() => setShowTransparencyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">اسم المؤشر (KPI Name)</th>
                      <th className="p-3">مصدر البيانات (Source)</th>
                      <th className="p-3">التصنيف (Classification)</th>
                      <th className="p-3">أصل البيانات (Data Origin)</th>
                      <th className="p-3">مستوى الثقة (Confidence)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {data.kpiMetadata && typeof data.kpiMetadata === 'object' && Object.entries(data.kpiMetadata).map(([key, meta]: [string, any]) => {
                      if (!meta) return null;
                      const isReal = meta.dataOrigin === 'REAL' || meta.dataOrigin === 'IMPORTED' || meta.dataOrigin === 'MANUAL';
                      return (
                        <tr key={key} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-bold text-slate-900">{meta.name || 'غير معروف'}</td>
                          <td className="p-3 text-slate-600">{meta.source || 'غير معروف'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.classification === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : meta.classification === 'DERIVED' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                              {meta.classification || 'N/A'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${isReal ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {meta.dataOrigin || 'UNKNOWN'} {isReal ? '✓' : '⚠️'}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">{meta.confidence || '0%'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowTransparencyModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
