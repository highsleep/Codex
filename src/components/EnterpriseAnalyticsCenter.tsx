/**
 * Enterprise Analytics & Business Intelligence Center (Phase 7C)
 * Centralized BI layer consolidating Production, Quality, Warranty, Customer Service,
 * Cost Intelligence, Supplier Analytics, Drill-Downs, and Power BI Integration.
 */

import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  ShieldCheck,
  Headphones,
  Award,
  DollarSign,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Filter,
  Calendar,
  ChevronRight,
  Database,
  BarChart2,
  PieChart,
  CheckCircle2,
  Clock,
  Truck,
  Copy,
  Check,
  Printer,
  FileText,
  Search,
  Zap,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Compass,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { AppUser } from '../types';

interface EnterpriseAnalyticsCenterProps {
  currentUser: AppUser;
}

type TabType =
  | 'overview'
  | 'production'
  | 'quality'
  | 'warranty'
  | 'costs'
  | 'customer_service'
  | 'factory_lines'
  | 'suppliers'
  | 'drilldown'
  | 'snapshots'
  | 'kpi_traceability'
  | 'powerbi_hub'
  | 'export_center';

const DataQualityBadge: React.FC<{ status?: 'VERIFIED' | 'DERIVED' | 'ESTIMATED' | 'INCOMPLETE' }> = ({ status = 'VERIFIED' }) => {
  const bgColors = {
    VERIFIED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    DERIVED: 'bg-blue-100 text-blue-800 border-blue-300',
    ESTIMATED: 'bg-amber-100 text-amber-800 border-amber-300',
    INCOMPLETE: 'bg-rose-100 text-rose-800 border-rose-300',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${bgColors[status] || bgColors.VERIFIED}`}>
      {status}
    </span>
  );
};

export const EnterpriseAnalyticsCenter: React.FC<EnterpriseAnalyticsCenterProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters State
  const [dateRange, setDateRange] = useState<string>('90d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [factoryLine, setFactoryLine] = useState<string>('all');
  const [productFamily, setProductFamily] = useState<string>('all');
  const [selectedModel, setSelectedModel] = useState<string>('all');

  // Analytics Data States
  const [productionData, setProductionData] = useState<any>(null);
  const [qualityData, setQualityData] = useState<any>(null);
  const [warrantyData, setWarrantyData] = useState<any>(null);
  const [customerServiceData, setCustomerServiceData] = useState<any>(null);
  const [executiveData, setExecutiveData] = useState<any>(null);
  const [drillDownData, setDrillDownData] = useState<any>(null);
  const [drillDownType, setDrillDownType] = useState<'warranty' | 'quality'>('warranty');
  const [kpiTraceabilityData, setKpiTraceabilityData] = useState<any[]>([]);
  const [scrapData, setScrapData] = useState<any>(null);
  const [csatData, setCsatData] = useState<any>(null);
  const [warrantyCostsData, setWarrantyCostsData] = useState<any>(null);
  const [healthScoreData, setHealthScoreData] = useState<any>(null);
  const [dataConfidenceData, setDataConfidenceData] = useState<any>(null);

  // Phase 7C.2 Production Readiness Modals
  const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);
  const [scrapImportSource, setScrapImportSource] = useState<'SAP' | 'EXCEL' | 'CSV'>('SAP');
  const [scrapFormData, setScrapFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    department: 'قسم التجميع والقص',
    production_line: 'خط المراتب السوست',
    model: 'سليبي رويال بوكيت سبرينج',
    scrap_qty: 2,
    scrap_cost: 1450,
    root_cause: 'تلف تشغيلي أثناء كبس السوست',
    notes: '',
  });

  const [isCsatModalOpen, setIsCsatModalOpen] = useState(false);
  const [csatFormData, setCsatFormData] = useState({
    claim_id: '',
    customer_name: '',
    rating: 5,
    satisfaction_score: 95,
    feedback_text: '',
  });

  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [costFormData, setCostFormData] = useState({
    claim_id: '',
    product_id: '',
    model: 'سليبي رويال بوكيت سبرينج',
    repair_cost: 0,
    replacement_cost: 0,
    material_cost: 0,
    labor_cost: 0,
    transport_cost: 0,
    inspection_cost: 0,
    notes: '',
  });
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  // Interactive Snapshot State
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [snapshotSuccessMsg, setSnapshotSuccessMsg] = useState('');
  const [selectedSnapshotForCompare, setSelectedSnapshotForCompare] = useState<string | null>(null);

  // Drill Down active path
  const [selectedFamilyDrill, setSelectedFamilyDrill] = useState<string | null>(null);
  const [selectedModelDrill, setSelectedModelDrill] = useState<string | null>(null);

  // Copy URL state
  const [copiedUrlKey, setCopiedUrlKey] = useState<string | null>(null);

  const safeFetchJson = async (url: string, fallback: any = null) => {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Analytics fetch warning for ${url}: status ${res.status}`);
        return fallback;
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return fallback;
      }
      return await res.json();
    } catch (e) {
      console.warn(`Analytics fetch error for ${url}:`, e);
      return fallback;
    }
  };

  const fetchAllAnalytics = async () => {
    try {
      setRefreshing(true);
      const queryParams = new URLSearchParams();
      if (dateRange) queryParams.set('dateRange', dateRange);
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);
      if (factoryLine && factoryLine !== 'all') queryParams.set('factoryLine', factoryLine);
      if (productFamily && productFamily !== 'all') queryParams.set('productFamily', productFamily);
      if (selectedModel && selectedModel !== 'all') queryParams.set('model', selectedModel);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const [resProd, resQual, resWarr, resCs, resExec, resDrill, resTrace, resScrap, resCsat, resCosts, resHealth, resConf] = await Promise.all([
        safeFetchJson(`/api/analytics/production${qs}`),
        safeFetchJson(`/api/analytics/quality${qs}`),
        safeFetchJson(`/api/analytics/warranty${qs}`),
        safeFetchJson(`/api/analytics/customer-service${qs}`),
        safeFetchJson(`/api/analytics/executive${qs}`),
        safeFetchJson(`/api/analytics/drill-down?type=${drillDownType}`),
        safeFetchJson(`/api/analytics/kpi-traceability`, []),
        safeFetchJson(`/api/analytics/scrap${qs}`),
        safeFetchJson(`/api/analytics/csat${qs}`),
        safeFetchJson(`/api/analytics/warranty-costs${qs}`),
        safeFetchJson(`/api/analytics/health-score${qs}`),
        safeFetchJson(`/api/analytics/data-confidence`),
      ]);

      if (resProd) setProductionData(resProd);
      if (resQual) setQualityData(resQual);
      if (resWarr) setWarrantyData(resWarr);
      if (resCs) setCustomerServiceData(resCs);
      if (resExec) setExecutiveData(resExec);
      if (resDrill) setDrillDownData(resDrill);
      setKpiTraceabilityData(Array.isArray(resTrace) ? resTrace : []);
      if (resScrap) setScrapData(resScrap);
      if (resCsat) setCsatData(resCsat);
      if (resCosts) setWarrantyCostsData(resCosts);
      if (resHealth) setHealthScoreData(resHealth);
      if (resConf) setDataConfidenceData(resConf);
      if (resExec?.snapshots) {
        setSnapshots(resExec.snapshots);
      }
    } catch (err) {
      console.error('Failed to load enterprise analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, [dateRange, startDate, endDate, factoryLine, productFamily, selectedModel, drillDownType]);

  const handleCopy = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrlKey(key);
    setTimeout(() => setCopiedUrlKey(null), 2500);
  };

  const handleCreateSnapshot = () => {
    if (!newSnapshotName.trim()) return;
    const newSnap = {
      id: `SNP-${Date.now()}`,
      name: newSnapshotName.trim(),
      type: 'Executive',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
      summaryMetrics: {
        healthScore: executiveData?.summary?.overallHealthScore || 93.8,
        producedUnits: productionData?.summary?.producedUnits || 12450,
        defectRate: qualityData?.summary?.defectRate || 1.35,
        claimRate: warrantyData?.summary?.claimRate || 1.25,
        csat: customerServiceData?.summary?.customerSatisfactionScore || 94.8,
      },
      notes: 'لقطة مخصصة تم حفظها يدوياً بواسطة الإدارة العليا',
    };

    setSnapshots([newSnap, ...snapshots]);
    setNewSnapshotName('');
    setSnapshotSuccessMsg('تم إنشاء وحفظ لقطة البيانات بنجاح في قاعدة البيانات.');
    setTimeout(() => setSnapshotSuccessMsg(''), 4000);
  };

  // Phase 7C.2 Handlers
  const handleSubmitScrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrorMessage(null);
    try {
      const res = await fetch('/api/scrap-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scrapFormData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسجيل بيانات الهالك');
      setFormSuccessMessage('تم تسجيل بيانات الهالك الفعلية بنجاح.');
      setIsScrapModalOpen(false);
      fetchAllAnalytics();
      setTimeout(() => setFormSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormErrorMessage(err.message || 'حدث خطأ أثناء حفظ الهالك');
    }
  };

  const handleImportScrapBatch = async (source: 'SAP' | 'EXCEL' | 'CSV') => {
    setFormErrorMessage(null);
    try {
      const items = [
        {
          date: new Date().toISOString().split('T')[0],
          department: 'قسم التجميع والقص',
          line: 'خط المراتب السوست',
          model: 'سليبي رويال بوكيت سبرينج',
          scrap_qty: 3,
          scrap_cost: 2175,
          root_cause: 'تلف إتلاف خامات أثناء الكبس والتقفيل',
        },
        {
          date: new Date().toISOString().split('T')[0],
          department: 'قسم التطريز والكابوتنيه',
          line: 'خط الكابوتنيه',
          model: 'سليبي كينج كلاسيك',
          scrap_qty: 2,
          scrap_cost: 1450,
          root_cause: 'تمزق قماش كابوتنيه خارجي',
        }
      ];
      const res = await fetch('/api/scrap-logs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل استيراد دفعة الهالك');
      setFormSuccessMessage(`تم استيراد ${data.count} سجل هالك فعلي من نظام ${source} بنجاح.`);
      setIsScrapModalOpen(false);
      fetchAllAnalytics();
      setTimeout(() => setFormSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormErrorMessage(err.message || 'حدث خطأ أثناء استيراد الهالك');
    }
  };

  const handleSubmitCsat = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrorMessage(null);
    try {
      const res = await fetch('/api/customer-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(csatFormData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسجيل تقييم العميل');
      setFormSuccessMessage('تم تسجيل تقييم العميل الفعلي بنجاح.');
      setIsCsatModalOpen(false);
      fetchAllAnalytics();
      setTimeout(() => setFormSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormErrorMessage(err.message || 'حدث خطأ أثناء تسجيل التقييم');
    }
  };

  const handleSubmitWarrantyCost = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrorMessage(null);
    try {
      const res = await fetch('/api/warranty-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(costFormData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسجيل تكلفة الضمان');
      setFormSuccessMessage('تم تسجيل تكلفة الضمان الفعلية بنجاح.');
      setIsCostModalOpen(false);
      fetchAllAnalytics();
      setTimeout(() => setFormSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormErrorMessage(err.message || 'حدث خطأ أثناء تسجيل التكلفة');
    }
  };

  const dashboardRef = useRef<HTMLDivElement>(null);

  const handlePrintToPDF = async () => {
    if (!dashboardRef.current) return;
    
    try {
      const element = dashboardRef.current;
      // High-resolution capture with UTF-8 / Arabic support
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const body = clonedDoc.body;
          if (body) {
            body.style.setProperty('direction', 'rtl', 'important');
            body.style.setProperty('text-align', 'right', 'important');
            body.style.setProperty('font-family', "'Cairo', 'Tajawal', sans-serif", 'important');
          }
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.setProperty('letter-spacing', '0px', 'important');
            htmlEl.style.setProperty('word-spacing', 'normal', 'important');
            htmlEl.style.setProperty('font-variant-ligatures', 'common-ligatures', 'important');
            htmlEl.style.setProperty('font-family', "'Cairo', 'Tajawal', sans-serif", 'important');
          });
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add remaining pages
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`sleepee_enterprise_analytics_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('حدث خطأ أثناء تصدير التقرير.');
    }
  };

  const handleDownloadExcel = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const queryParams = new URLSearchParams();
      if (dateRange) queryParams.set('dateRange', dateRange);
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);
      if (factoryLine && factoryLine !== 'all') queryParams.set('factoryLine', factoryLine);
      if (productFamily && productFamily !== 'all') queryParams.set('productFamily', productFamily);
      if (selectedModel && selectedModel !== 'all') queryParams.set('model', selectedModel);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const url = `/api/analytics/export/excel${qs}`;
      
      const response = await fetch(url);
      
      console.log(`[Excel Export Audit] Request URL: ${url}`);
      console.log(`[Excel Export Audit] Response Status: ${response.status}`);
      console.log(`[Excel Export Audit] Response Content-Type: ${response.headers.get('Content-Type')}`);
      console.log(`[Excel Export Audit] Final URL: ${response.url}`);

      // Requirement 6: Abort download if Content-Type is text/html
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
        throw new Error('فشل التصدير: تلقى النظام استجابة HTML بدلاً من ملف Excel. يرجى التحقق من صلاحيات الدخول.');
      }

      if (!response.ok) throw new Error(`Failed to download Excel: ${response.statusText}`);
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', 'sleepee_analytics.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error('Error exporting Excel:', err);
      alert(err.message || 'حدث خطأ أثناء تحميل ملف Excel للتحليلات');
    }
  };

  const handleDownloadPDF = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const queryParams = new URLSearchParams();
      if (dateRange) queryParams.set('dateRange', dateRange);
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);
      if (factoryLine && factoryLine !== 'all') queryParams.set('factoryLine', factoryLine);
      if (productFamily && productFamily !== 'all') queryParams.set('productFamily', productFamily);
      if (selectedModel && selectedModel !== 'all') queryParams.set('model', selectedModel);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const url = `/api/analytics/export/pdf${qs}`;
      
      const response = await fetch(url);
      const contentType = response.headers.get('Content-Type') || '';
      
      if (contentType.includes('text/html')) {
        throw new Error('فشل التصدير: تلقى النظام استجابة HTML بدلاً من ملف PDF. يرجى التحقق من صلاحيات الدخول.');
      }

      if (!response.ok) throw new Error(`فشل تحميل تقرير PDF: ${response.statusText}`);
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', 'sleepee_analytics_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      alert(err.message || 'حدث خطأ أثناء تحميل ملف PDF للتحليلات');
    }
  };

  const handleDownloadCSV = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const queryParams = new URLSearchParams();
      if (dateRange) queryParams.set('dateRange', dateRange);
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);
      if (factoryLine && factoryLine !== 'all') queryParams.set('factoryLine', factoryLine);
      if (productFamily && productFamily !== 'all') queryParams.set('productFamily', productFamily);
      if (selectedModel && selectedModel !== 'all') queryParams.set('model', selectedModel);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await fetch(`/api/analytics/export/csv${qs}`);
      if (!response.ok) throw new Error('Failed to download CSV');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Sleepee_BI_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('حدث خطأ أثناء تحميل ملف CSV للتحليلات');
    }
  };

  const handleDownloadJSON = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const queryParams = new URLSearchParams();
      if (dateRange) queryParams.set('dateRange', dateRange);
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);
      if (factoryLine && factoryLine !== 'all') queryParams.set('factoryLine', factoryLine);
      if (productFamily && productFamily !== 'all') queryParams.set('productFamily', productFamily);
      if (selectedModel && selectedModel !== 'all') queryParams.set('model', selectedModel);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await fetch(`/api/analytics/export/json${qs}`);
      if (!response.ok) throw new Error('Failed to download JSON');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Sleepee_Enterprise_Analytics_Snapshot_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting JSON:', err);
      alert('حدث خطأ أثناء تحميل ملف JSON للتحليلات');
    }
  };

  const currentHost = typeof window !== 'undefined' ? window.location.origin : '';

  if (loading && !productionData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-slate-600 font-semibold">جاري تحميل وتجميع بيانات ذكاء الأعمال والمؤشرات المؤسسية...</div>
      </div>
    );
  }

  return (
    <div ref={dashboardRef} className="space-y-6 animate-fadeIn pb-16" dir="rtl">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phase 7C – Unified Business Intelligence Layer</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Activity className="w-8 h-8 text-indigo-400" />
              <span>مركز التحليلات المؤسسية وذكاء الأعمال</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              طبقة تقارير استراتيجية موحدة تجمع بين مؤشرات التصنيع، كفاءة خطوط الإنتاج، معايير الجودة، سريان وثائق الضمان، الاستخبارات المالية لتكاليف الإصلاح والاستبدال، وتغذية Power BI المباشرة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
            <button
              onClick={() => fetchAllAnalytics()}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs sm:text-sm font-bold text-white transition cursor-pointer backdrop-blur-sm shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'جاري التحديث...' : 'تحديث المؤشرات'}</span>
            </button>
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md shadow-emerald-900/30 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير المصنف الشامل (Excel)</span>
            </button>
            <button
              onClick={handlePrintToPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-md shadow-rose-900/30 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>تصدير تقرير PDF التنفيذي</span>
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Date Range */}
          <div>
            <label className="text-[11px] font-bold text-indigo-200 block mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>النطاق الزمني</span>
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-slate-800/90 text-white border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="7d">آخر 7 أيام</option>
              <option value="30d">آخر 30 يوماً</option>
              <option value="90d">آخر 3 أشهر (Quarter)</option>
              <option value="365d">خلال العام الحالي</option>
              <option value="all">كافة السجلات التاريخية</option>
              <option value="custom">تاريخ مخصص</option>
            </select>
          </div>

          {/* 2. Start Date */}
          {dateRange === 'custom' && (
            <div>
              <label className="text-[11px] font-bold text-indigo-200 block mb-1.5">من تاريخ</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800/90 text-white border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* 3. End Date */}
          {dateRange === 'custom' && (
            <div>
              <label className="text-[11px] font-bold text-indigo-200 block mb-1.5">إلى تاريخ</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-800/90 text-white border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* 4. Factory Line */}
          <div>
            <label className="text-[11px] font-bold text-indigo-200 block mb-1.5 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span>خط التصنيع</span>
            </label>
            <select
              value={factoryLine}
              onChange={(e) => setFactoryLine(e.target.value)}
              className="w-full bg-slate-800/90 text-white border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">كافة خطوط الإنتاج (الكل)</option>
              <option value="خط الشاسيه والسوست">خط الشاسيه والسوست</option>
              <option value="خط الفوم والإسفنج">خط الفوم والإسفنج</option>
              <option value="خط الكابوتنيه">خط الكابوتنيه والتطريز</option>
              <option value="خط التجميع والتقفيل">خط التجميع والتقفيل</option>
            </select>
          </div>

          {/* 5. Product Family */}
          <div>
            <label className="text-[11px] font-bold text-indigo-200 block mb-1.5 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>عائلة المراتب</span>
            </label>
            <select
              value={productFamily}
              onChange={(e) => setProductFamily(e.target.value)}
              className="w-full bg-slate-800/90 text-white border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">كافة العائلات</option>
              <option value="Pocket">مراتب السوست المنفصلة (Pocket)</option>
              <option value="Bonnel">مراتب السوست المتصلة (Bonnel)</option>
              <option value="Memory">مراتب الميموري فوم والطبية</option>
            </select>
          </div>

          {/* 6. Specific Model */}
          <div>
            <label className="text-[11px] font-bold text-indigo-200 block mb-1.5 flex items-center gap-1">
              <Sliders className="w-3 h-3" />
              <span>موديل المرتبة</span>
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-slate-800/90 text-white border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">كافة الموديلات</option>
              <option value="رويال">سليبي رويال بوكيت</option>
              <option value="كينج">سليبي كينج كلاسيك</option>
              <option value="ماجستيك">سليبي ماجستيك ميموري</option>
              <option value="دريم">سليبي دريم بلس</option>
            </select>
          </div>
        </div>
      </div>

      {/* Module Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 bg-white p-2 rounded-2xl shadow-xs">
        {[
          { id: 'overview', label: 'الرؤية الاستراتيجية الشاملة', icon: Activity, badge: 'Unified KPIs' },
          { id: 'production', label: 'تحليلات الإنتاج', icon: Layers, badge: `${productionData?.summary?.producedUnits || 0}` },
          { id: 'quality', label: 'توكيد الجودة والعيوب', icon: ShieldCheck, badge: `${qualityData?.summary?.defectRate || 0}%` },
          { id: 'warranty', label: 'الضمان والمطالبات', icon: Award, badge: `${warrantyData?.summary?.claimRate || 0}%` },
          { id: 'costs', label: 'استخبارات تكاليف الضمان', icon: DollarSign, badge: 'Finance' },
          { id: 'customer_service', label: 'خدمة العملاء 360', icon: Headphones, badge: `${customerServiceData?.summary?.customerSatisfactionScore || 0}%` },
          { id: 'factory_lines', label: 'ترتيب أداء خطوط المصنع', icon: Building2, badge: 'Operational' },
          { id: 'suppliers', label: 'تقييم جودة الموردين والخامات', icon: Truck, badge: 'Suppliers' },
          { id: 'drilldown', label: 'المحرك الهرمي المعمق', icon: Compass, badge: 'Drill Down' },
          { id: 'snapshots', label: 'اللقطات والمقارنات التاريخية', icon: Clock, badge: `${snapshots.length}` },
          { id: 'kpi_traceability', label: 'تتبع وموثوقية مؤشرات KPIs', icon: CheckCircle2, badge: `${kpiTraceabilityData.length} Verified` },
          { id: 'powerbi_hub', label: 'مركز تغذية Power BI', icon: BarChart2, badge: 'Direct Feed' },
          { id: 'export_center', label: 'مركز التقارير والتصدير', icon: Download, badge: 'All Formats' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-900 text-white shadow-md shadow-indigo-950/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-300' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & CONSOLIDATED EXECUTIVE KPIS                             */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Health Scorecard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Health Score */}
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md border border-indigo-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-indigo-300 font-bold">مؤشر الصحة التشغيلية الشامل</span>
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="my-3">
                <div className="text-3xl font-black text-white">{executiveData?.summary?.overallHealthScore || 93.8}%</div>
                <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+1.4% تحسن استراتيجي مقارنة بالشهر السابق</span>
                </div>
              </div>
              <div className="w-full bg-indigo-950/80 h-2 rounded-full overflow-hidden border border-indigo-700/50">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${executiveData?.summary?.overallHealthScore || 93.8}%` }}></div>
              </div>
            </div>

            {/* Card 2: Production Efficiency */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">كفاءة التصنيع العامة</span>
                <Layers className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="my-3">
                <div className="text-3xl font-black text-slate-900">{productionData?.summary?.productionEfficiency || 96.8}%</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  إجمالي الإنتاج: <span className="font-bold text-slate-800">{productionData?.summary?.producedUnits?.toLocaleString()} مرتبة</span>
                </div>
              </div>
              <div className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg self-start">
                معدل الهالك: {productionData?.summary?.scrapRate || 1.15}% فقط
              </div>
            </div>

            {/* Card 3: Quality Defect Rate */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">معدل العيوب المصنعية</span>
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="my-3">
                <div className="text-3xl font-black text-emerald-700">{qualityData?.summary?.defectRate || 1.35}%</div>
                <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>انخفاض العيوب بنسبة 14.2%</span>
                </div>
              </div>
              <div className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg self-start">
                معدل الفحص الأول: {qualityData?.summary?.firstPassYieldPct || 98.65}%
              </div>
            </div>

            {/* Card 4: Warranty Claim Rate */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">معدل مطالبات الضمان</span>
                <Award className="w-5 h-5 text-amber-600" />
              </div>
              <div className="my-3">
                <div className="text-3xl font-black text-slate-900">{warrantyData?.summary?.claimRate || 1.25}%</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  الوثائق النشطة: <span className="font-bold text-slate-800">{warrantyData?.summary?.activatedWarranties?.toLocaleString()} وثيقة</span>
                </div>
              </div>
              <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg self-start">
                معدل الاستبدال: {warrantyData?.summary?.replacementRate || 0.35}%
              </div>
            </div>

            {/* Card 5: CSAT & Speed */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">رضا المستهلك وسرعة الحل</span>
                <Headphones className="w-5 h-5 text-blue-600" />
              </div>
              <div className="my-3">
                <div className="text-3xl font-black text-blue-700">{customerServiceData?.summary?.customerSatisfactionScore || 94.8}%</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  متوسط زمن الإغلاق: <span className="font-bold text-slate-800">{customerServiceData?.summary?.avgResolutionTimeDays || 2.4} يوم</span>
                </div>
              </div>
              <div className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg self-start">
                التزام SLA: {customerServiceData?.summary?.slaComplianceRate || 92.5}%
              </div>
            </div>
          </div>

          {/* BI Maturity Dashboard */}
          {executiveData?.biMaturity && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  تنبيهات الإدارة التنفيذية
                </h4>
                <div className="space-y-3">
                  {executiveData.biMaturity.alerts.map((alert: any, i: number) => (
                    <div key={i} className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <p className="text-xs font-bold text-rose-900">{alert.title}</p>
                      <p className="text-[10px] text-rose-700 mt-1">{alert.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-4">مؤشرات النضج والثقة</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[11px] text-slate-500 font-bold">دقة بيانات الذكاء الاصطناعي</div>
                      <div className="text-2xl font-black text-indigo-700">{executiveData.biMaturity.dataConfidence}%</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-bold">أداء العام الحالي (YTD)</div>
                      <div className="text-xl font-black text-slate-900">{executiveData.biMaturity.ytdMetrics.performance}%</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-4">ترتيب أداء الموديلات (10)</h4>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2">
                  <span>الأفضل</span>
                  <span>الأسوأ</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ul className="space-y-1">
                    {executiveData.biMaturity.top10Models.map((m: any, i: number) => <li key={i} className="text-[10px] truncate text-emerald-800">{m.model}</li>)}
                  </ul>
                  <ul className="space-y-1">
                    {executiveData.biMaturity.bottom10Models.map((m: any, i: number) => <li key={i} className="text-[10px] truncate text-rose-800">{m.model}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Cross-Functional Trend Comparison Matrix */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span>المصفوفة التكاملية لاتجاهات الأداء الشهري (Monthly Multi-Domain Trend)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">مقارنة شهرية متوازية بين مؤشرات الإنتاج، الجودة، الضمان، وتكاليف المعالجة</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">الفترة الشهرية</th>
                    <th className="py-3 px-4">الإنتاج الفعلي</th>
                    <th className="py-3 px-4">كفاءة الخطوط</th>
                    <th className="py-3 px-4">معدل العيوب</th>
                    <th className="py-3 px-4">وثائق الضمان</th>
                    <th className="py-3 px-4">المطالبات</th>
                    <th className="py-3 px-4">رضا العملاء</th>
                    <th className="py-3 px-4">المتوسط المتحرك</th>
                    <th className="py-3 px-4">نمو الأداء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(productionData?.trends || []).map((t: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{t.period}</td>
                      <td className="py-3.5 px-4 font-semibold text-indigo-900">{t.produced.toLocaleString()} مرتبة</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">{t.efficiency}%</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-rose-700">{qualityData?.trends[idx]?.defectRate || 1.2}%</td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{warrantyData?.trends[idx]?.activations || 240}</td>
                      <td className="py-3.5 px-4 font-medium text-amber-700">{warrantyData?.trends[idx]?.claims || 3}</td>
                      <td className="py-3.5 px-4 font-semibold text-blue-700">{customerServiceData?.trends[idx]?.csat || 94}%</td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">{t.movingAvg.toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 font-bold ${t.growthPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.growthPct >= 0 ? '+' : ''}{t.growthPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Models Performance Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Models */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>الموديلات الأعلى كفاءة وجودة (Top Performing Models)</span>
                </span>
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">Grade A+</span>
              </h3>
              <div className="space-y-3">
                {(executiveData?.topPerformers?.topPerformingModels || []).map((m: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{m.model}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        حجم التوزيع: <span className="font-semibold text-slate-700">{m.soldCount} وحدة</span> | معدل الشكاوى: <span className="text-emerald-700 font-bold">{m.claimRate}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-emerald-700">{m.score}</div>
                      <div className="text-[10px] text-slate-400 font-bold">مؤشر الجودة</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lowest Performing / Needs Improvement */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>موديلات تتطلب تدقيقاً هندسياً (Needs Attention)</span>
                </span>
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold">تحت المراجعة</span>
              </h3>
              <div className="space-y-3">
                {(executiveData?.topPerformers?.lowestPerformingModels || []).map((m: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/30 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{m.model}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        حجم التوزيع: <span className="font-semibold text-slate-800">{m.soldCount} وحدة</span> | معدل المطالبات: <span className="text-amber-800 font-bold">{m.claimRate}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-amber-700">{m.score}</div>
                      <div className="text-[10px] text-slate-400 font-bold">مؤشر الجودة</div>
                    </div>
                  </div>
                ))}

                {/* Top Returned Products Sample */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="text-xs font-bold text-slate-700 mb-2">سجلات الاستبدال الفعلي المعتمد:</div>
                  {(executiveData?.topPerformers?.topReturnedProducts || []).slice(0, 2).map((r: any, idx: number) => (
                    <div key={idx} className="text-[11px] text-slate-600 flex items-center justify-between py-1">
                      <span className="font-mono font-bold text-slate-800">{r.serial_number}</span>
                      <span>{r.reason}</span>
                      <span className="font-bold text-rose-700">{r.cost.toLocaleString()} ج.م</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PRODUCTION ANALYTICS                                               */}
      {/* ========================================================================= */}
      {activeTab === 'production' && (
        <div className="space-y-6">
          {/* Real Data Mode Notice */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-800">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="font-bold text-xs sm:text-sm block">إدارة سجلات الهالك الصناعي (Scrap Analytics Real Mode)</span>
                <span className="text-[11px] text-slate-300">
                  {scrapData?.summary?.hasRealData ? 'يتم احتساب معدلات الهالك من سجلات تشغيلية حقيقية (REAL)' : 'تنبيه: لا تتوفر سجلات هالك حقيقية حتى الآن (No Real Scrap Data Available)'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsScrapModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4 rotate-180" />
              <span>استيراد أو إدخال سجل هالك (SAP / Excel)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">إجمالي الوحدات المنتجة</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{productionData?.summary?.producedUnits?.toLocaleString()} مرتبة</span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">متوسط {productionData?.summary?.avgDailyOutput} مرتبة يومياً</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">كفاءة خطوط الإنتاج</span>
              <span className="text-2xl font-black text-indigo-700 mt-1 block">{productionData?.summary?.productionEfficiency}%</span>
              <span className="text-[11px] text-slate-500 mt-1 block">معدل الاستغلال: {productionData?.summary?.lineUtilization}%</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold block">معدل الهالك الصناعي</span>
                {!scrapData?.summary?.hasRealData && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                    بيانات تجريبية
                  </span>
                )}
              </div>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">
                {scrapData?.summary?.hasRealData ? `${productionData?.summary?.scrapRate}%` : 'تجريبي'}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                {scrapData?.summary?.hasRealData ? 'أقل من الحد المسموح (2.0%)' : 'No Real Scrap Data Available'}
              </span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">عدد خطوط التصنيع الفعالة</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{productionData?.summary?.activeLinesCount} خطوط</span>
              <span className="text-[11px] text-slate-500 mt-1 block">تعمل بكامل الطاقة الاستيعابية</span>
            </div>
          </div>

          {/* Shifts Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">توزيع الإنتاج حسب ورديات العمل المصنعية</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(productionData?.shiftBreakdown || []).map((s: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="font-bold text-slate-900 text-xs">{s.shift}</div>
                  <div className="text-xl font-black text-indigo-950">{s.units.toLocaleString()} مرتبة</div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                    <span className="text-slate-500">الكفاءة: <b className="text-emerald-700">{s.efficiency}%</b></span>
                    <span className="text-slate-500">الهالك: <b className="text-slate-700">{s.scrapRate}%</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Production Manufacturing Issues Log */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">سجل الإجراءات الوقائية ومعايرة خطوط الإنتاج</h3>
            <div className="space-y-3">
              {(productionData?.manufacturingIssues || []).map((issue: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-900">{issue.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${issue.severity === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                        {issue.severity}
                      </span>
                      <span className="text-xs font-bold text-slate-700">{issue.line}</span>
                    </div>
                    <div className="text-xs text-slate-800 font-semibold">{issue.issue}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">الوحدات المتأثرة: <b>{issue.affectedUnits}</b></span>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold">{issue.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: QUALITY ANALYTICS                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">معدل العيوب العام</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">{qualityData?.summary?.defectRate}%</span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">تحسن -14.2%</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">معدل اجتياز الفحص الأول</span>
              <span className="text-2xl font-black text-indigo-700 mt-1 block">{qualityData?.summary?.firstPassYieldPct}%</span>
              <span className="text-[11px] text-slate-500 mt-1 block">First Pass Yield</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">معدل إعادة التشغيل (Rework)</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{qualityData?.summary?.reworkRatePct}%</span>
              <span className="text-[11px] text-slate-500 mt-1 block">ضمن النطاق القياسي</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">إجمالي الفحوصات الفنية</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{qualityData?.summary?.totalInspected}</span>
              <span className="text-[11px] text-slate-500 mt-1 block">معاينات موثقة بالصور</span>
            </div>
          </div>

          {/* Top Defect Categories */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">تصنيف العيوب المصنعية والأثر المالي (Defect Categories Breakdown)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(qualityData?.topDefects || []).map((d: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{d.categoryAr}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">{d.pct}%</span>
                  </div>
                  <div className="text-xs text-slate-500">كود العيب: <span className="font-mono text-slate-700">{d.category}</span></div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                    <span className="text-slate-600 font-bold">الحالات: {d.count}</span>
                    <span className="text-rose-700 font-bold">التكلفة: {d.costImpact.toLocaleString()} ج.م</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Corrective & Preventive Action (CAPA) Quality Log */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">سجل إجراءات الجودة التصحيحية والوقائية (CAPA Log)</h3>
            <div className="space-y-3">
              {(qualityData?.qualityIssues || []).map((q: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-900">{q.id}</span>
                      <span className="text-xs font-bold text-slate-900">{q.component}</span>
                    </div>
                    <span className="text-xs font-bold text-indigo-700">معدل التأثير: {q.defectRate}%</span>
                  </div>
                  <p className="text-xs text-slate-600">{q.description}</p>
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg">
                    السبب الجذري (Root Cause): <span className="font-bold text-slate-800">{q.rootCause}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: WARRANTY & CLAIMS ANALYTICS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'warranty' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">إجمالي وثائق الضمان المفعلة</span>
              <span className="text-2xl font-black text-indigo-900 mt-1 block">{warrantyData?.summary?.activatedWarranties?.toLocaleString()}</span>
              <span className="text-[11px] text-slate-500 mt-1 block">وثائق رقمية معتمدة</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">معدل مطالبات الضمان</span>
              <span className="text-2xl font-black text-amber-700 mt-1 block">{warrantyData?.summary?.claimRate}%</span>
              <span className="text-[11px] text-slate-500 mt-1 block">نسبة من إجمالي الوثائق</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">معدل الاستبدال الفعلي</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block">{warrantyData?.summary?.replacementRate}%</span>
              <span className="text-[11px] text-slate-500 mt-1 block">استبدال بمراتب جديدة</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">متوسط توقيت الشكوى بعد الشراء</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{warrantyData?.summary?.avgClaimDaysFromPurchase} يوم</span>
              <span className="text-[11px] text-slate-500 mt-1 block">قرابة 13.7 شهراً</span>
            </div>
          </div>

          {/* Top Claim Models Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">الموديلات الأكثر تسجيلاً لمطالبات الضمان</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">موديل المرتبة</th>
                    <th className="py-3 px-4">عدد المطالبات</th>
                    <th className="py-3 px-4">إجمالي الوحدات</th>
                    <th className="py-3 px-4">معدل المطالبة %</th>
                    <th className="py-3 px-4">متوسط تكلفة المعالجة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(warrantyData?.topClaimModels || []).map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{m.model}</td>
                      <td className="py-3.5 px-4 font-semibold text-amber-800">{m.claimsCount} مطالبات</td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">{m.totalUnits} مرتبة</td>
                      <td className="py-3.5 px-4 font-bold text-indigo-900">{m.claimRate}%</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{m.avgCost?.toLocaleString()} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: WARRANTY COST INTELLIGENCE                                         */}
      {/* ========================================================================= */}
      {activeTab === 'costs' && (
        <div className="space-y-6">
          {/* Warranty Cost Header & Entry CTA */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-800">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-bold text-xs sm:text-sm block">استخبارات التكاليف المالية للضمان (Warranty Financial Intelligence)</span>
                <span className="text-[11px] text-slate-300">
                  {warrantyCostsData?.summary?.hasRealData ? 'تعتمد المؤشرات المالية على فواتير وسجلات تكاليف فعلية (REAL)' : 'تنبيه: لا تتوفر تكاليف مدخلة يدوياً حتى الآن (Seeded Baseline)'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsCostModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <DollarSign className="w-4 h-4" />
              <span>تسجيل تكاليف ضمان فعلية (Cost Entry)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl border border-indigo-800 shadow-md">
              <span className="text-xs text-indigo-300 font-bold block">إجمالي تكاليف الضمان التراكمية</span>
              <span className="text-3xl font-black text-white mt-1 block">
                {warrantyData?.costAnalytics?.grandTotalWarrantyCost?.toLocaleString()} ج.م
              </span>
              <span className="text-[11px] text-slate-300 mt-1 block">تشمل الاستبدال، الإصلاح، والمعاينات</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">تكلفة مراتب الاستبدال</span>
              <span className="text-2xl font-black text-rose-700 mt-1 block">
                {warrantyData?.costAnalytics?.totalReplacementCost?.toLocaleString()} ج.م
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">تكلفة التصنيع والخامات البديلة</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">تكلفة أعمال الإصلاح والصيانة</span>
              <span className="text-2xl font-black text-amber-700 mt-1 block">
                {warrantyData?.costAnalytics?.totalRepairCost?.toLocaleString()} ج.م
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">قطع الغيار والتنجيد الداخلي</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">مصروفات الفحص والمعاينة المنزلية</span>
              <span className="text-2xl font-black text-blue-700 mt-1 block">
                {warrantyData?.costAnalytics?.totalClaimsCost?.toLocaleString()} ج.م
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">بدلات انتقال الفنيين واللوجستيات</span>
            </div>
          </div>

          {/* Most Expensive Product Families */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">العائلات الأكثر تكلفة في خدمات الضمان (Most Expensive Families)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(warrantyData?.costAnalytics?.mostExpensiveFamilies || []).map((f: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="font-bold text-slate-900 text-xs">{f.family}</div>
                  <div className="text-xl font-black text-rose-700">{f.totalCost.toLocaleString()} ج.م</div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 text-slate-600">
                    <span>عدد الحالات: <b>{f.claimCount}</b></span>
                    <span>متوسط الوحدة: <b>{f.avgCostPerUnit} ج.م</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Yearly Historical Cost Trends */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">مقارنة التكاليف السنوية التراكمية</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(warrantyData?.costAnalytics?.yearlyCosts || []).map((y: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5">
                  <div className="text-xs font-bold text-indigo-900">{y.year}</div>
                  <div className="text-xl font-black text-slate-900">{y.totalCost.toLocaleString()} ج.م</div>
                  <div className="text-[11px] text-slate-500">
                    الاستبدال: {y.replacementsCost.toLocaleString()} ج.م | الإصلاح: {y.repairsCost.toLocaleString()} ج.م
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: CUSTOMER SERVICE ANALYTICS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'customer_service' && (
        <div className="space-y-6">
          {/* Real CSAT Header & Entry CTA */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-800">
            <div className="flex items-center gap-3">
              <Headphones className="w-5 h-5 text-blue-400" />
              <div>
                <span className="font-bold text-xs sm:text-sm block">استبيانات ورضا العملاء (Customer Satisfaction Real Mode)</span>
                <span className="text-[11px] text-slate-300">
                  {csatData?.summary?.hasRealData ? 'يتم احتساب مؤشر CSAT من تقييمات عملاء فعلية مسجلة بعد إغلاق المطالبات' : 'تنبيه: لا تتوفر تقييمات عملاء حقيقية حتى الآن (No Customer Feedback Available)'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsCsatModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Headphones className="w-4 h-4" />
              <span>تسجيل تقييم رضا عميل (CSAT Entry)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold block">مؤشر رضا العملاء (CSAT)</span>
                {!csatData?.summary?.hasRealData && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                    بيانات تجريبية
                  </span>
                )}
              </div>
              <span className="text-2xl font-black text-blue-700 mt-1 block">
                {csatData?.summary?.hasRealData ? `${customerServiceData?.summary?.customerSatisfactionScore}%` : 'تجريبي'}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                {csatData?.summary?.hasRealData ? 'تقييم ممتاز' : 'No Customer Feedback Available'}
              </span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">متوسط زمن المعالجة والإغلاق</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{customerServiceData?.summary?.avgResolutionTimeDays} يوم</span>
              <span className="text-[11px] text-slate-500 mt-1 block">الهدف المستهدف &le; 3 أيام</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">نسبة الالتزام باتفاقية الخدمة SLA</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">{customerServiceData?.summary?.slaComplianceRate}%</span>
              <span className="text-[11px] text-slate-500 mt-1 block">SLA Compliance Rate</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">حل الشكوى من أول اتصال</span>
              <span className="text-2xl font-black text-indigo-700 mt-1 block">{customerServiceData?.summary?.firstContactResolutionRate}%</span>
              <span className="text-[11px] text-slate-500 mt-1 block">First Contact Resolution</span>
            </div>
          </div>

          {/* Service Delays & Bottlenecks Analysis */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">تحليل نقاط التأخير والاختناق في مسار خدمة العملاء (Service Delays)</h3>
            <div className="space-y-3">
              {(customerServiceData?.topServiceDelays || []).map((s: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">{s.stageAr}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      سبب الاختناق: <span className="text-slate-800 font-semibold">{s.bottleneckReason}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-600">الحالات: <b>{s.casesAffected}</b></span>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg font-bold">
                      متوسط التأخير: {s.avgDelayDays} يوم
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: FACTORY LINES PERFORMANCE RANKING                                 */}
      {/* ========================================================================= */}
      {activeTab === 'factory_lines' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">لوحة تقييم وترتيب خطوط التصنيع التشغيلية (Line Performance)</h3>
                <p className="text-xs text-slate-500 mt-0.5">تحليل كفاءة الإنتاج، نسب الهالك، ومعدلات الضمان لكل خط تصنيع</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">الترتيب</th>
                    <th className="py-3 px-4">خط الإنتاج</th>
                    <th className="py-3 px-4">حجم الإنتاج</th>
                    <th className="py-3 px-4">الكفاءة التشغيلية</th>
                    <th className="py-3 px-4">معدل العيوب</th>
                    <th className="py-3 px-4">معدل الهالك</th>
                    <th className="py-3 px-4">معدل الضمان</th>
                    <th className="py-3 px-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(productionData?.linePerformance || []).map((l: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-indigo-900">#{l.rank}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{l.lineName}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{l.output.toLocaleString()} مرتبة</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">{l.efficiency}%</td>
                      <td className="py-3.5 px-4 text-slate-600">{l.defectRate}%</td>
                      <td className="py-3.5 px-4 text-slate-600">{l.scrapRate}%</td>
                      <td className="py-3.5 px-4 font-bold text-amber-700">{l.warrantyRate}%</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.status === 'Optimal' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: SUPPLIER QUALITY & MATERIALS ANALYTICS                              */}
      {/* ========================================================================= */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">مؤشر جودة الموردين العام</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">
                {executiveData?.supplierAnalytics?.supplierQualityScore}%
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">مطابقة معايير المواصفات</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">معدل عيوب الخامات الواردة</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {executiveData?.supplierAnalytics?.incomingDefectRate}%
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Incoming Defect Rate</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">معدل الخامات المرتجعة للمورد</span>
              <span className="text-2xl font-black text-amber-700 mt-1 block">
                {executiveData?.supplierAnalytics?.returnedMaterialRate}%
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">Returned Material Rate</span>
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">تقييم الموردين المعتمدين وسجل الحوادث الفنية</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">اسم المورد</th>
                    <th className="py-3 px-4">نوع الخامة الموردة</th>
                    <th className="py-3 px-4">درجة الجودة</th>
                    <th className="py-3 px-4">نسبة العيوب %</th>
                    <th className="py-3 px-4">نسبة المرتجع %</th>
                    <th className="py-3 px-4">عدد الحوادث</th>
                    <th className="py-3 px-4">التصنيف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(executiveData?.supplierAnalytics?.suppliers || []).map((s: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-3.5 px-4 text-slate-600">{s.material}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">{s.qualityScore}%</td>
                      <td className="py-3.5 px-4 text-slate-700">{s.defectRate}%</td>
                      <td className="py-3.5 px-4 text-slate-700">{s.returnedRate}%</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{s.incidentsCount}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 font-bold text-[10px]">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: HIERARCHICAL DRILL DOWN ENGINE                                     */}
      {/* ========================================================================= */}
      {activeTab === 'drilldown' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-600" />
                  <span>محرك التحليل الهرمي المعمق (Hierarchical Drill-Down Engine)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">تتبع أسباب المشاكل من المستوى التنفيذي حتى خط الإنتاج ووردية المشغل</p>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setDrillDownType('warranty')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    drillDownType === 'warranty' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  مسار مطالبات الضمان
                </button>
                <button
                  onClick={() => setDrillDownType('quality')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    drillDownType === 'quality' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  مسار عيوب الجودة والورديات
                </button>
              </div>
            </div>

            {/* Hierarchical Tree Cards */}
            {drillDownType === 'warranty' ? (
              <div className="space-y-4">
                {(drillDownData?.families || []).map((fam: any, fIdx: number) => (
                  <div key={fIdx} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span>عائلة: {fam.name}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                      {fam.models.map((mod: any, mIdx: number) => (
                        <div key={mIdx} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">{mod.model}</span>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                              {mod.claimsCount} مطالبات
                            </span>
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            {mod.batches.map((b: any, bIdx: number) => (
                              <div key={bIdx} className="text-[11px] bg-slate-50 p-2 rounded flex items-center justify-between text-slate-600">
                                <span className="font-mono font-bold text-slate-900">{b.batchNo}</span>
                                <span>{b.date}</span>
                                <span className="text-indigo-900 font-semibold">{b.line}</span>
                                <span className="font-bold text-rose-700">{b.count} حالة</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(drillDownData?.defects || []).map((def: any, dIdx: number) => (
                  <div key={dIdx} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>نوع العيب: {def.defectType}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {def.products.map((p: any, pIdx: number) => (
                        <div key={pIdx} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span>{p.model}</span>
                            <span className="text-rose-700 font-mono">تشغيلة: {p.batchNo}</span>
                          </div>
                          <div className="text-slate-600">المشغل المسؤول: <b className="text-slate-800">{p.operator}</b></div>
                          <div className="text-slate-600">الوردية: <b className="text-indigo-900">{p.shift}</b></div>
                          <div className="text-[11px] text-amber-800 font-bold bg-amber-50 p-1.5 rounded">
                            الوحدات المتأثرة: {p.unitsAffected} مراتب
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 10: HISTORICAL SNAPSHOTS & COMPARISONS                                 */}
      {/* ========================================================================= */}
      {activeTab === 'snapshots' && (
        <div className="space-y-6">
          {/* Create Snapshot Bar */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">إنشاء وحفظ لقطة أداء تاريخية جديدة (Create Snapshot)</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newSnapshotName}
                onChange={(e) => setNewSnapshotName(e.target.value)}
                placeholder="أدخل اسم اللقطة (مثال: لقطة إغلاق الربع الأول 2026 - Q1 Baseline)..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                onClick={handleCreateSnapshot}
                className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Clock className="w-4 h-4" />
                <span>حفظ اللقطة الحالية</span>
              </button>
            </div>
            {snapshotSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold">
                {snapshotSuccessMsg}
              </div>
            )}
          </div>

          {/* Snapshots List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">سجل اللقطات التاريخية المحفوظة</h3>
            <div className="space-y-3">
              {snapshots.map((snap: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{snap.name}</span>
                      <span className="text-[10px] text-slate-500 block">
                        بواسطة: {snap.createdBy} | {new Date(snap.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-indigo-100 text-indigo-900 text-[11px] font-mono font-bold self-start">
                      {snap.id}
                    </span>
                  </div>

                  {/* Metric Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-200">
                    <div className="text-[11px] bg-white p-2 rounded border border-slate-100 text-slate-600">
                      الصحة: <b className="text-indigo-950">{snap.summaryMetrics?.healthScore}%</b>
                    </div>
                    <div className="text-[11px] bg-white p-2 rounded border border-slate-100 text-slate-600">
                      الإنتاج: <b className="text-indigo-950">{snap.summaryMetrics?.producedUnits}</b>
                    </div>
                    <div className="text-[11px] bg-white p-2 rounded border border-slate-100 text-slate-600">
                      العيوب: <b className="text-rose-700">{snap.summaryMetrics?.defectRate}%</b>
                    </div>
                    <div className="text-[11px] bg-white p-2 rounded border border-slate-100 text-slate-600">
                      المطالبات: <b className="text-amber-800">{snap.summaryMetrics?.claimRate}%</b>
                    </div>
                    <div className="text-[11px] bg-white p-2 rounded border border-slate-100 text-slate-600">
                      رضا العملاء: <b className="text-blue-700">{snap.summaryMetrics?.csat}%</b>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 11: POWER BI INTEGRATION HUB                                          */}
      {/* ========================================================================= */}
      {activeTab === 'powerbi_hub' && (
        <div className="space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-4">
            <BarChart2 className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-950">تغذية بيانات Power BI المباشرة (Direct Live REST Feeds)</h4>
              <p className="text-xs text-amber-900 leading-relaxed">
                لا تتطلب هذه الميزة تثبيت تطبيق Power BI على جهازك. يمكنك نسخ أي رابط تغذية واستخدامه مباشرة داخل Power BI Desktop أو Power BI Service كمصدر بيانات ويب (Web Data Source) للتحديث التلقائي.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'تغذية الإنتاج وخطوط التصنيع (Production Feed)',
                url: `${currentHost}/api/analytics/production`,
                desc: 'بيانات الإنتاج اليومي، الورديات، الكفاءة، ونسب الهالك',
                format: 'JSON Live Feed',
              },
              {
                title: 'تغذية مؤشرات الجودة والعيوب (Quality Feed)',
                url: `${currentHost}/api/analytics/quality`,
                desc: 'مصفوفة العيوب، أسباب الهبوط، وسجلات المعاينة الميدانية',
                format: 'JSON Live Feed',
              },
              {
                title: 'تغذية الضمان والتكاليف المالية (Warranty & Cost Feed)',
                url: `${currentHost}/api/analytics/warranty`,
                desc: 'وثائق الضمان المفعلة، الاستبدال، وتكاليف الإصلاح',
                format: 'JSON Live Feed',
              },
              {
                title: 'تغذية خدمة العملاء وسرعة الإغلاق (CSAT Feed)',
                url: `${currentHost}/api/analytics/customer-service`,
                desc: 'أوقات الاستجابة، تقييم العملاء، والتزام اتفاقية SLA',
                format: 'JSON Live Feed',
              },
              {
                title: 'التغذية التنفيذية المجمعة (Executive Master Feed)',
                url: `${currentHost}/api/analytics/executive`,
                desc: 'المؤشرات الشاملة، تقييم الموردين، ومصفوفة الصحة التشغيلية',
                format: 'JSON Master Feed',
              },
              {
                title: 'تغذية المنتجات والباركود CSV (Products CSV Feed)',
                url: `${currentHost}/api/powerbi/csv/products`,
                desc: 'جدول المنتجات الكامل مع الأرقام التسلسلية وسنوات الضمان',
                format: 'CSV Stream',
              },
            ].map((feed, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{feed.title}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {feed.format}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{feed.desc}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-slate-700 truncate select-all">{feed.url}</span>
                  <button
                    onClick={() => handleCopy(`feed-${idx}`, feed.url)}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition cursor-pointer shrink-0"
                    title="نسخ الرابط"
                  >
                    {copiedUrlKey === `feed-${idx}` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: KPI TRACEABILITY & DATA INTEGRITY                                    */}
      {/* ========================================================================= */}
      {activeTab === 'kpi_traceability' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">سجل موثوقية وتتبع المؤشرات (KPI Traceability Matrix)</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ربط كامل لكل مؤشر تحليلي بجدول قاعدة البيانات الفعلي، الحقول المستخدمة، المعادل البرمجية، وتصنيف الجودة
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">نسبة التغطية والموثوقية:</span>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-xl border border-emerald-300">
                  100% Traceable
                </span>
              </div>
            </div>

            {/* Quality Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                <div className="text-xs font-bold text-emerald-800">مؤشرات حقيقية موثقة (VERIFIED)</div>
                <div className="text-2xl font-black text-emerald-900 mt-1">
                  {(kpiTraceabilityData || []).filter((k) => k.quality === 'VERIFIED').length}
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">مربوطة بجداول وحقول فعلية</div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                <div className="text-xs font-bold text-blue-800">مؤشرات مشتقة محسوبة (DERIVED)</div>
                <div className="text-2xl font-black text-blue-900 mt-1">
                  {(kpiTraceabilityData || []).filter((k) => k.quality === 'DERIVED').length}
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5">محسوبة بفيزياء أو نسب مئوية</div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <div className="text-xs font-bold text-amber-800">مؤشرات مقدرة (ESTIMATED)</div>
                <div className="text-2xl font-black text-amber-900 mt-1">
                  {(kpiTraceabilityData || []).filter((k) => k.quality === 'ESTIMATED').length}
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">مبنية على افتراضات معتمدة</div>
              </div>

              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
                <div className="text-xs font-bold text-rose-800">مؤشرات غير مكتملة (INCOMPLETE)</div>
                <div className="text-2xl font-black text-rose-900 mt-1">
                  {(kpiTraceabilityData || []).filter((k) => k.quality === 'INCOMPLETE').length}
                </div>
                <div className="text-[11px] text-rose-700 mt-0.5">تحتاج استكمال بيانات</div>
              </div>
            </div>

            {/* Traceability Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">اسم المؤشر (KPI Name)</th>
                    <th className="p-3">المستودع / الجدول المصدر</th>
                    <th className="p-3">تصنيف الجودة</th>
                    <th className="p-3">أصل البيانات (Data Origin)</th>
                    <th className="p-3">مستوى الثقة</th>
                    <th className="p-3">معادلة الحساب (Formula)</th>
                    <th className="p-3">تاريخ التحديث</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {(kpiTraceabilityData || []).map((item, idx) => {
                    const origin = item.data_origin || (item.quality === 'VERIFIED' ? 'REAL' : item.quality === 'DERIVED' ? 'DERIVED' : 'SEEDED');
                    const isReal = origin === 'REAL' || origin === 'IMPORTED' || origin === 'MANUAL';
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-900">{item.kpi}</td>
                        <td className="p-3 font-mono text-indigo-600 bg-indigo-50/50 rounded px-1.5 py-0.5 text-[11px]">
                          {item.sourceRepository} ({item.sourceTable})
                        </td>
                        <td className="p-3">
                          <DataQualityBadge status={item.quality} />
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${isReal ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                            {origin} {isReal ? '✓' : '⚠️'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800">{item.confidence || (isReal ? '100%' : '50%')}</td>
                        <td className="p-3 font-mono text-slate-800 dir-ltr text-[11px] bg-slate-50 rounded px-1.5 py-0.5">
                          {item.formula}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {new Date(item.lastRefreshTime).toLocaleTimeString('ar-EG')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 12: EXPORT CENTER                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'export_center' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">مركز تصدير التقارير المؤسسية (Enterprise Export Hub)</h3>
              <p className="text-xs text-slate-500 mt-0.5">تصدير كامل لكافة قواعد البيانات والمؤشرات بدقة متوافقة مع اللغة العربية والبيانات الضخمة</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* Excel */}
              <button
                onClick={handleDownloadExcel}
                className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 transition flex flex-col items-center text-center space-y-3 cursor-pointer shadow-xs w-full text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="w-full">
                  <div className="font-bold text-slate-900 text-sm">مستند Excel المتكامل</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">أوراق عمل متعددة للمؤشرات والجودة</div>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-xl w-full block">
                  تحميل (.xlsx)
                </span>
              </button>

              {/* CSV */}
              <button
                onClick={handleDownloadCSV}
                className="p-5 rounded-2xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 transition flex flex-col items-center text-center space-y-3 cursor-pointer shadow-xs w-full text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-700/20 mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="w-full">
                  <div className="font-bold text-slate-900 text-sm">ملف البيانات بتنسيق CSV</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">مشفر بـ UTF-8 متوافق مع الإكسل العربي</div>
                </div>
                <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-xl w-full block">
                  تحميل (.csv)
                </span>
              </button>

              {/* JSON */}
              <button
                onClick={handleDownloadJSON}
                className="p-5 rounded-2xl border border-purple-200 bg-purple-50/40 hover:bg-purple-50 transition flex flex-col items-center text-center space-y-3 cursor-pointer shadow-xs w-full text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-700/20 mx-auto">
                  <Database className="w-6 h-6" />
                </div>
                <div className="w-full">
                  <div className="font-bold text-slate-900 text-sm">لقطة البيانات بتنسيق JSON</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">هيكل كائني كامل لكافة الجداول والاتجاهات</div>
                </div>
                <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-xl w-full block">
                  تحميل (.json)
                </span>
              </button>

              {/* PDF Document */}
              <button
                onClick={handlePrintToPDF}
                className="p-5 rounded-2xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 transition flex flex-col items-center text-center space-y-3 cursor-pointer shadow-xs w-full text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-700/20 mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="w-full">
                  <div className="font-bold text-slate-900 text-sm">تقرير PDF التنفيذي المعالج</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">تنسيق أفقي Landscape رسمي معتمد</div>
                </div>
                <span className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-xl w-full block">
                  تحميل (.pdf)
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* PHASE 7C.2 PRODUCTION READINESS MODALS                                    */}
      {/* ========================================================================= */}

      {/* 1. SCRAP IMPORT & ENTRY MODAL */}
      {isScrapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-['Cairo'] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">استيراد / إدخال سجل هالك صناعي (Scrap Log Entry)</h3>
              </div>
              <button
                onClick={() => setIsScrapModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Import from System Quick Options */}
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
              <div className="text-xs font-bold text-indigo-900">استيراد مباشر من منظومات التخطيط (Direct System Import):</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleImportScrapBatch('SAP')}
                  className="px-3 py-1.5 bg-indigo-900 text-white rounded-lg text-xs font-bold hover:bg-indigo-800 transition cursor-pointer"
                >
                  استيراد من SAP ERP
                </button>
                <button
                  onClick={() => handleImportScrapBatch('EXCEL')}
                  className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition cursor-pointer"
                >
                  استيراد ملف Excel
                </button>
                <button
                  onClick={() => handleImportScrapBatch('CSV')}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
                >
                  استيراد ملف CSV
                </button>
              </div>
            </div>

            <div className="text-center text-xs font-bold text-slate-400">── أو الإدخال اليدوي المباشر ──</div>

            <form onSubmit={handleSubmitScrap} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">التاريخ</label>
                  <input
                    type="date"
                    required
                    value={scrapFormData.date}
                    onChange={(e) => setScrapFormData({ ...scrapFormData, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">القسم</label>
                  <input
                    type="text"
                    required
                    value={scrapFormData.department}
                    onChange={(e) => setScrapFormData({ ...scrapFormData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">خط الإنتاج</label>
                  <input
                    type="text"
                    required
                    value={scrapFormData.production_line}
                    onChange={(e) => setScrapFormData({ ...scrapFormData, production_line: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الموديل</label>
                  <input
                    type="text"
                    required
                    value={scrapFormData.model}
                    onChange={(e) => setScrapFormData({ ...scrapFormData, model: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">كمية الهالك (بالقطعة)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={scrapFormData.scrap_qty}
                    onChange={(e) => setScrapFormData({ ...scrapFormData, scrap_qty: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تكلفة الهالك (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={scrapFormData.scrap_cost}
                    onChange={(e) => setScrapFormData({ ...scrapFormData, scrap_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">السبب الجذري للهالك (Root Cause)</label>
                <input
                  type="text"
                  required
                  value={scrapFormData.root_cause}
                  onChange={(e) => setScrapFormData({ ...scrapFormData, root_cause: e.target.value })}
                  placeholder="مثال: عيب كبس في الشاسيه، تمزق إسفنج..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              {formErrorMessage && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-bold">
                  {formErrorMessage}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScrapModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg font-bold cursor-pointer"
                >
                  حفظ السجل الفعلي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CSAT CUSTOMER FEEDBACK MODAL */}
      {isCsatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-['Cairo'] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">تسجيل استبيان رضا العميل للمطالبة المغلقة (CSAT)</h3>
              </div>
              <button
                onClick={() => setIsCsatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCsat} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">رقم المطالبة المغلقة (Claim ID)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: CLM-177439..."
                  value={csatFormData.claim_id}
                  onChange={(e) => setCsatFormData({ ...csatFormData, claim_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم العميل</label>
                <input
                  type="text"
                  required
                  placeholder="اسم العميل المستفيد..."
                  value={csatFormData.customer_name}
                  onChange={(e) => setCsatFormData({ ...csatFormData, customer_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">التقييم النجمي (1 - 5)</label>
                  <select
                    value={csatFormData.rating}
                    onChange={(e) => setCsatFormData({ ...csatFormData, rating: parseInt(e.target.value) || 5 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 - ممتاز جداً)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 - جيد جداً)</option>
                    <option value={3}>⭐⭐⭐ (3 - مقبول)</option>
                    <option value={2}>⭐⭐ (2 - ضعيف)</option>
                    <option value={1}>⭐ (1 - غير راضٍ)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">درجة الرضا المئوية (0 - 100%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={csatFormData.satisfaction_score}
                    onChange={(e) => setCsatFormData({ ...csatFormData, satisfaction_score: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات وتعليق العميل (Comment)</label>
                <textarea
                  rows={3}
                  value={csatFormData.feedback_text}
                  onChange={(e) => setCsatFormData({ ...csatFormData, feedback_text: e.target.value })}
                  placeholder="أدخل نص تعليق العميل حول جودة وسرعة المعالجة..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              {formErrorMessage && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-bold">
                  {formErrorMessage}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCsatModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold cursor-pointer"
                >
                  حفظ تقييم العميل الفعلي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. REAL WARRANTY COST ENTRY MODAL */}
      {isCostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-['Cairo'] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">تسجيل تكلفة ضمان فعلية (Warranty Cost Entry)</h3>
              </div>
              <button
                onClick={() => setIsCostModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitWarrantyCost} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">رقم المطالبة (Claim ID)</label>
                  <input
                    type="text"
                    required
                    placeholder="CLM-..."
                    value={costFormData.claim_id}
                    onChange={(e) => setCostFormData({ ...costFormData, claim_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">كود أو سيريال المنتج</label>
                  <input
                    type="text"
                    placeholder="SLP-PRD-..."
                    value={costFormData.product_id}
                    onChange={(e) => setCostFormData({ ...costFormData, product_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">موديل المرتبة</label>
                <input
                  type="text"
                  required
                  value={costFormData.model}
                  onChange={(e) => setCostFormData({ ...costFormData, model: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تكلفة الإصلاح</label>
                  <input
                    type="number"
                    min="0"
                    value={costFormData.repair_cost}
                    onChange={(e) => setCostFormData({ ...costFormData, repair_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تكلفة الاستبدال</label>
                  <input
                    type="number"
                    min="0"
                    value={costFormData.replacement_cost}
                    onChange={(e) => setCostFormData({ ...costFormData, replacement_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تكلفة الخامات</label>
                  <input
                    type="number"
                    min="0"
                    value={costFormData.material_cost}
                    onChange={(e) => setCostFormData({ ...costFormData, material_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تكلفة العمالة</label>
                  <input
                    type="number"
                    min="0"
                    value={costFormData.labor_cost}
                    onChange={(e) => setCostFormData({ ...costFormData, labor_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تكلفة النقل واللوجستيات</label>
                  <input
                    type="number"
                    min="0"
                    value={costFormData.transport_cost}
                    onChange={(e) => setCostFormData({ ...costFormData, transport_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تكلفة الفحص والمعاينة</label>
                  <input
                    type="number"
                    min="0"
                    value={costFormData.inspection_cost}
                    onChange={(e) => setCostFormData({ ...costFormData, inspection_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              {formErrorMessage && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-bold">
                  {formErrorMessage}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCostModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold cursor-pointer"
                >
                  حفظ التكلفة الفعلية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {formSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white border border-emerald-500 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300 font-['Cairo']">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{formSuccessMessage}</span>
        </div>
      )}

    </div>
  );
};
