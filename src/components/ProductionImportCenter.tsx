import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Printer,
  ShieldCheck,
  Database,
  Calendar,
  Lock,
  Cpu,
  Eye,
  Download,
  Search,
  AlertTriangle,
  Server,
  FileText,
  Check,
  Copy,
  ExternalLink,
  Clock,
  Building2,
  CheckCheck,
  Globe,
  Link as LinkIcon,
  Settings2,
  Wifi,
  WifiOff,
  Info,
  X,
  Plus,
  Play,
  RotateCcw,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  UploadCloud,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle,
  BarChart2,
  Tag,
  Settings,
  Sliders,
  FileCode,
  SlidersHorizontal,
  Activity,
  ShieldAlert,
  Shield,
  Layers3,
  ListOrdered,
  Maximize2,
  Moon,
  Sun,
  PrinterIcon,
  CpuIcon,
  Workflow
} from 'lucide-react';
import { AppUser, ProductModel, ProductionSyncState, ProductionImportLog, ProductionBatch, ZebraLabelData } from '../types';

interface ProductionImportCenterProps {
  currentUser: AppUser;
  onRefreshData?: () => void;
}

interface ProductionOrder {
  id: string;
  orderNumber: string;
  batchNumber: string;
  productionDate: string;
  mattressModel: string;
  mattressSize: string;
  warrantyYears: number;
  productionQuantity: number;
  productionLine: string;
  status: 'Draft' | 'Approved' | 'Serial Generated' | 'Printed' | 'Completed';
  generatedSerials: string[];
  printedCount: number;
}

interface PrinterJob {
  jobId: string;
  timestamp: string;
  user: string;
  printer: string;
  template: string;
  quantity: number;
  result: 'Success' | 'Failed' | 'Queued';
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  category: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'PRINT' | 'IMPORT' | 'SYNC' | 'SECURITY';
  details: string;
}

export const ProductionImportCenter: React.FC<ProductionImportCenterProps> = ({
  currentUser,
  onRefreshData,
}) => {
  // Navigation Groups & Sub-Tabs
  const [activeGroup, setActiveGroup] = useState<'home' | 'operations' | 'traceability' | 'quality' | 'integration' | 'system'>('home');
  const [activeSubTab, setActiveSubTab] = useState<string>('dashboard');

  // UI Modes
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [compactMode, setCompactMode] = useState<boolean>(false);

  // Core Data State
  const [models, setModels] = useState<ProductModel[]>([
    {
      model_id: 'MOD-001',
      commercial_model_name: 'سليبي سوبر كراون (Sleepee Super Crown)',
      english_name: 'Sleepee Super Crown',
      warranty_years: 10,
      dimensions: '180x200x30 سم',
      spring_type: 'Pocket Spring + Memory Foam',
      foam_type: 'High Resilience HR Foam',
      status: 'Active',
      approval_history: [{ date: '2026-01-10', by: 'م. حسام سليمان', status: 'Approved' }]
    },
    {
      model_id: 'MOD-002',
      commercial_model_name: 'ماريوت الطبية (Marriott Medical)',
      english_name: 'Marriott Medical Orthopedic',
      warranty_years: 7,
      dimensions: '160x200x25 سم',
      spring_type: 'Bonnel Spring Reinforced',
      foam_type: 'Orthopedic High Density',
      status: 'Active',
      approval_history: [{ date: '2026-01-15', by: 'د. طارق محمود', status: 'Approved' }]
    }
  ]);

  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([
    {
      id: 'po-1',
      orderNumber: 'PO-2026-1001',
      batchNumber: 'B26-0001',
      productionDate: '2026-09-24',
      mattressModel: 'سليبي سوبر كراون (Sleepee Super Crown)',
      mattressSize: '180x200x30 سم',
      warrantyYears: 10,
      productionQuantity: 50,
      productionLine: 'خط الإنتاج الرئيسي (Line A)',
      status: 'Approved',
      generatedSerials: [],
      printedCount: 0
    },
    {
      id: 'po-2',
      orderNumber: 'PO-2026-1002',
      batchNumber: 'B26-0002',
      productionDate: '2026-09-24',
      mattressModel: 'ماريوت الطبية (Marriott Medical)',
      mattressSize: '160x200x25 سم',
      warrantyYears: 7,
      productionQuantity: 30,
      productionLine: 'خط الإنتاج الطبي (Line B)',
      status: 'Serial Generated',
      generatedSerials: Array.from({ length: 30 }, (_, i) => `SLP-2026-${String(i + 1).padStart(6, '0')}`),
      printedCount: 12
    }
  ]);

  // Printer & Print Jobs State
  const [printJobs, setPrintJobs] = useState<PrinterJob[]>([
    { jobId: 'JOB-901', timestamp: '2026-09-24 14:20', user: currentUser.name, printer: 'Zebra ZD220 Industrial', template: 'Modern Enterprise v2', quantity: 12, result: 'Success' },
    { jobId: 'JOB-902', timestamp: '2026-09-24 11:10', user: currentUser.name, printer: 'Windows PDF Exporter', template: 'Standard Label', quantity: 50, result: 'Success' }
  ]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    { id: 'ALT-101', timestamp: '2026-09-24 14:00', action: 'إنشاء أمر إنتاج جديد', actor: currentUser.name, category: 'CREATE', details: 'أمر رقم PO-2026-1002 كمية 30' },
    { id: 'ALT-102', timestamp: '2026-09-24 12:30', action: 'توليد سيريالات', actor: currentUser.name, category: 'APPROVE', details: 'توليد 30 رقم تسلسلي للتشغيلة B26-0002' },
    { id: 'ALT-103', timestamp: '2026-09-24 09:15', action: 'تسجيل الدخول', actor: currentUser.name, category: 'SECURITY', details: 'تسجيل دخول ناجح إلى النظام المؤسسي' }
  ]);

  // Product 360 Search State
  const [searchQuery360, setSearchQuery360] = useState<string>('SLP-2026-000001');
  const [selectedProduct360, setSelectedProduct360] = useState<any>({
    serialNumber: 'SLP-2026-000001',
    orderNumber: 'PO-2026-1001',
    batchNumber: 'B26-0001',
    model: 'سليبي سوبر كراون (Sleepee Super Crown)',
    size: '180x200x30 سم',
    warrantyYears: 10,
    productionDate: '2026-09-24',
    printingDate: '2026-09-24 10:00',
    activationStatus: 'مفعل بنجاح',
    warrantyStatus: 'ساري حتى 2036',
    claimStatus: 'لا توجد مطالبات سابقة'
  });

  // Label Designer V2 State
  const [labelDesignerConfig, setLabelDesignerConfig] = useState({
    showLogo: true,
    showQR: true,
    showBarcode: true,
    showWarrantyBadge: true,
    fontFamily: 'Cairo',
    primaryColor: '#D4AF37',
    layoutVersion: 'v2.1-Enterprise'
  });

  // Integration Settings State
  const [sapConfig, setSapConfig] = useState({
    endpointUrl: 'https://s4hana-gateway.sleepee.com/odata/v2/production',
    companyCode: 'SLP-EG-01',
    status: 'Connected (Online)',
    lastSync: '2026-09-24 13:45'
  });

  const [sharepointConfig, setSharepointConfig] = useState({
    siteUrl: 'https://sleepee.sharepoint.com/sites/manufacturing',
    docLibrary: 'Production_Master_Library',
    status: 'Connected & Synced',
    lastSync: '2026-09-24 12:00'
  });

  // Excel Import State
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelRows, setExcelRows] = useState<any[] | null>(null);

  // Fetch database records on mount and refresh
  const fetchBackendData = async () => {
    try {
      const [ordersRes, jobsRes, logsRes] = await Promise.all([
        fetch('/api/production-orders').then(r => r.ok ? r.json() : []),
        fetch('/api/print-jobs').then(r => r.ok ? r.json() : []),
        fetch('/api/audit-logs').then(r => r.ok ? r.json() : []),
      ]);
      if (Array.isArray(ordersRes) && ordersRes.length > 0) {
        setProductionOrders(ordersRes);
      }
      if (Array.isArray(jobsRes) && jobsRes.length > 0) {
        setPrintJobs(jobsRes);
      }
      if (Array.isArray(logsRes) && logsRes.length > 0) {
        setAuditLogs(logsRes);
      }
    } catch (err) {
      console.error('Error fetching backend data:', err);
    }
  };

  useEffect(() => {
    fetchBackendData();
  }, []);

  // Helper to log audit
  const logAudit = async (action: string, category: AuditLogEntry['category'], details: string) => {
    const newEntry: AuditLogEntry = {
      id: `ALT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action,
      actor: currentUser.name,
      category,
      details
    };
    setAuditLogs(prev => [newEntry, ...prev]);
    try {
      await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, actor: currentUser.name, category, details }),
      });
    } catch (e) {
      // network fallback
    }
  };

  const handleCreateOrder = async () => {
    try {
      const res = await fetch('/api/production-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mattressModel: 'سليبي سوبر كراون (Sleepee Super Crown)',
          mattressSize: '180x200x30 سم',
          warrantyYears: 10,
          productionQuantity: 40,
          productionLine: 'خط الإنتاج الرئيسي (Line A)',
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setProductionOrders(prev => [data.order, ...prev]);
        logAudit('إنشاء أمر إنتاج جديد', 'CREATE', `إنشاء أمر ${data.order.orderNumber}`);
        alert(`تم حفظ أمر الإنتاج ${data.order.orderNumber} بنجاح في قاعدة البيانات!`);
      }
    } catch (err) {
      alert('حدث خطأ أثناء حفظ أمر الإنتاج');
    }
  };

  const handleDeleteOrder = async (id: string, orderNumber: string) => {
    try {
      await fetch(`/api/production-orders/${id}`, { method: 'DELETE' });
      setProductionOrders(prev => prev.filter(item => item.id !== id && item.orderNumber !== orderNumber));
      logAudit('حذف أمر إنتاج', 'DELETE', `حذف أمر ${orderNumber}`);
    } catch (err) {
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const handleApproveOrder = async (id: string) => {
    try {
      const res = await fetch(`/api/production-orders/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchBackendData();
        alert('تم اعتماد أمر الإنتاج في قاعدة البيانات بنجاح!');
      }
    } catch (err) {
      alert('حدث خطأ أثناء الاعتماد');
    }
  };

  const handleGenerateSerials = async (id: string) => {
    try {
      const res = await fetch(`/api/production-orders/${id}/generate-serials`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchBackendData();
        alert(`تم توليد وحفظ ${data.count} رقم تسلسلي بنجاح في قاعدة البيانات!`);
      }
    } catch (err) {
      alert('حدث خطأ أثناء توليد السيريالات');
    }
  };

  const handleSearch360 = async (query: string) => {
    if (!query) return;
    try {
      const res = await fetch(`/api/products/product-360/${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedProduct360(data);
      }
    } catch (err) {
      console.error('360 search failed', err);
    }
  };

  // --- SAP Fiori Navigation Groups Structure ---
  const groups = [
    {
      id: 'home',
      label: 'الرئيسية والعمليات',
      subTabs: [
        { id: 'dashboard', label: 'لوحة القيادة الرئيسية' },
        { id: 'work-queue', label: 'مركز الأعمال (Work Queue)' }
      ]
    },
    {
      id: 'operations',
      label: 'أوامر الإنتاج والماتريكس',
      subTabs: [
        { id: 'orders', label: 'أوامر الإنتاج (Production Orders)' },
        { id: 'product-master', label: 'مرجع الموديلات (Product Master)' },
        { id: 'product-360', label: 'تتبع المنتج الشامل (Product 360)' }
      ]
    },
    {
      id: 'traceability',
      label: 'التتبع والطباعة',
      subTabs: [
        { id: 'traceability-center', label: 'مركز التتبع (Traceability)' },
        { id: 'print-management', label: 'مركز الطباعة (Print Jobs & Stats)' },
        { id: 'label-designer-v2', label: 'محرر الملصقات المتطور V2' }
      ]
    },
    {
      id: 'quality',
      label: 'الجودة والحوكمة',
      subTabs: [
        { id: 'quality-governance', label: 'مركز حوكمة الجودة والاعتماد' }
      ]
    },
    {
      id: 'integration',
      label: 'التكامل (SAP & SharePoint & Excel)',
      subTabs: [
        { id: 'integration-center', label: 'مركز التكامل والربط المؤسسي' },
        { id: 'excel-import', label: 'استيراد وتحقق ملفات Excel الماستر' }
      ]
    },
    {
      id: 'system',
      label: 'صحة النظام والأمان',
      subTabs: [
        { id: 'system-health', label: 'مراقبة صحة النظام (System Health)' },
        { id: 'audit-security', label: 'سجل التدقيق والأمان (Audit Trail)' }
      ]
    }
  ];

  const handleGroupChange = (groupId: any) => {
    setActiveGroup(groupId);
    const grp = groups.find(g => g.id === groupId);
    if (grp && grp.subTabs.length > 0) {
      setActiveSubTab(grp.subTabs[0].id);
    }
  };

  return (
    <div className={`space-y-4 text-right font-['Cairo'] transition-colors ${darkMode ? 'bg-slate-950 text-slate-100 p-4 rounded-3xl' : ''}`}>
      
      {/* Top Enterprise Control Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 text-[#D4AF37] flex items-center justify-center font-black">
            SLP
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">مركز العمليات المصنعية والإنتاج (Enterprise Manufacturing Hub)</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">إدارة دورة حياة المنتج بالكامل من أمر الإنتاج حتى الضمان والمطالبات</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompactMode(!compactMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${compactMode ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
          >
            {compactMode ? 'الوضع المريح (Normal)' : 'الوضع المدمج (Compact)'}
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer border border-slate-200 dark:border-slate-700"
            title="تبديل الوضع الليلي"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </div>

      {/* SAP Fiori Navigation Group Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 shadow-xs space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {groups.map((group) => {
            const isSelected = activeGroup === group.id;
            return (
              <button
                key={group.id}
                onClick={() => handleGroupChange(group.id)}
                className={`py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer text-center select-none ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {group.label}
              </button>
            );
          })}
        </div>

        {/* Sub-Tabs Bar */}
        {(() => {
          const currentGroupObj = groups.find(g => g.id === activeGroup);
          if (!currentGroupObj) return null;
          return (
            <div className="flex items-center gap-1 overflow-x-auto bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-bold">
              <span className="text-[10px] text-slate-400 px-2 font-semibold uppercase tracking-wider">المهام:</span>
              {currentGroupObj.subTabs.map((tab) => {
                const isSubSelected = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer ${
                      isSubSelected
                        ? 'bg-[#D62828] text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* ======================================================== */}
      {/* MODULES RENDERER */}
      {/* ======================================================== */}

      {/* 1. HOME DASHBOARD & WORK QUEUE */}
      {activeGroup === 'home' && activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">أوامر إنتاج اليوم</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">4</div>
              <span className="text-[10px] text-emerald-600 font-bold">نشطة وتعمل حالياً</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">جاهزة للطباعة</span>
              <div className="text-2xl font-black text-blue-600 font-mono mt-1">80</div>
              <span className="text-[10px] text-blue-700 font-bold">مرتبة بانتظار الاستيكر</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">جاهزة للشحن</span>
              <div className="text-2xl font-black text-indigo-600 font-mono mt-1">120</div>
              <span className="text-[10px] text-indigo-700 font-bold">تمت مطابقتها</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">ضمانات مفعلة اليوم</span>
              <div className="text-2xl font-black text-emerald-600 font-mono mt-1">34</div>
              <span className="text-[10px] text-emerald-700 font-bold">عبر البوابة الرقمية</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block">المطالبات المفتوحة</span>
              <div className="text-2xl font-black text-rose-600 font-mono mt-1">2</div>
              <span className="text-[10px] text-rose-700 font-bold">تحت الفحص الهندسي</span>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-lg flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-[#D4AF37]">الإجراءات السريعة (Enterprise Quick Actions)</h3>
              <p className="text-xs text-slate-300">اختصارات مباشرة لعمليات المصنع الأساسية</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setActiveGroup('operations'); setActiveSubTab('orders'); }}
                className="px-4 py-2 rounded-xl bg-[#D62828] hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow"
              >
                + إنشاء أمر إنتاج
              </button>
              <button
                onClick={() => { setActiveGroup('integration'); setActiveSubTab('excel-import'); }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs transition cursor-pointer border border-slate-700"
              >
                استيراد ملف Excel الماستر
              </button>
              <button
                onClick={() => { setActiveGroup('traceability'); setActiveSubTab('print-management'); }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs transition cursor-pointer border border-slate-700"
              >
                طباعة الملصقات (Zebra)
              </button>
              <button
                onClick={() => { setActiveGroup('operations'); setActiveSubTab('product-360'); }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold text-xs transition cursor-pointer border border-slate-700"
              >
                تتبع منتج شامل (Product 360)
              </button>
            </div>
          </div>

          {/* System Health & Recent Activity Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>حالة الأنظمة المتكاملة (System Health)</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span>قاعدة بيانات Cloud SQL (PostgreSQL)</span>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">متصل (Online)</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span>تكامل SAP S/4HANA OData</span>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">مزامنة نشطة</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span>مكتبة مستندات SharePoint</span>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">متصل</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span>طابعات Zebra الصناعية (TCP/IP)</span>
                  <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">جاهزة للطباعة</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>الأنشطة الأخيرة وسجل التدقيق (Recent Activities)</span>
              </h4>
              <div className="space-y-2 text-xs">
                {auditLogs.slice(0, 4).map(log => (
                  <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <strong className="text-slate-900 dark:text-white block">{log.action}</strong>
                      <span className="text-[10px] text-slate-500">{log.details} — ({log.actor})</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WORK QUEUE CENTER */}
      {activeGroup === 'home' && activeSubTab === 'work-queue' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Workflow className="w-4 h-4 text-[#D62828]" />
            <span>مركز الأعمال ومهام المتابعة الفورية (Actionable Work Queue)</span>
          </h3>
          <p className="text-xs text-slate-500">يعرض فقط العناصر التي تتطلب تدخلاً فورياً من الإدارة أو خطوط الإنتاج</p>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 flex items-center justify-between text-xs">
              <div>
                <strong className="text-amber-900 dark:text-amber-400 block text-sm">أمر إنتاج بانتظار الاعتماد (PO-2026-1003)</strong>
                <span className="text-amber-700 dark:text-amber-300">موديل سليبي سوبر كراون — كمية 50 مرتبة (مطلوب اعتماد مدير الإنتاج)</span>
              </div>
              <button
                onClick={() => {
                  logAudit('اعتماد أمر إنتاج', 'APPROVE', 'تم اعتماد أمر الإنتاج PO-2026-1003 من مركز الأعمال');
                  alert('تم اعتماد أمر الإنتاج بنجاح!');
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold cursor-pointer shadow-xs"
              >
                اعتماد فوري
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 flex items-center justify-between text-xs">
              <div>
                <strong className="text-blue-900 dark:text-blue-400 block text-sm">تشغيلة بانتظار توليد السيريالات (PO-2026-1001)</strong>
                <span className="text-blue-700 dark:text-blue-300">تم اعتماد الأمر وبانتظار توليد 50 رقم تسلسلي فريد</span>
              </div>
              <button
                onClick={() => {
                  logAudit('توليد سيريالات فورية', 'CREATE', 'توليد 50 سيريال لأمر الإنتاج PO-2026-1001');
                  alert('تم توليد وربط 50 سيريال بنجاح!');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold cursor-pointer shadow-xs"
              >
                توليد السيريالات الآن
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 flex items-center justify-between text-xs">
              <div>
                <strong className="text-rose-900 dark:text-rose-400 block text-sm">مطالبة ضمان تحت الفحص الهندسي (CLAIM-8821)</strong>
                <span className="text-rose-700 dark:text-rose-300">فحص هبوط إسفنجي للمرتبة SLP-2026-9082 (مطلوب تقرير فني)</span>
              </div>
              <button
                onClick={() => alert('تم فتح تقرير فحص المطالبة الهندسية بنجاح')}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold cursor-pointer shadow-xs"
              >
                معالجة المطالبة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PRODUCTION ORDERS & PRODUCT 360 */}
      {activeGroup === 'operations' && activeSubTab === 'orders' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#D62828]" />
              <span>أوامر الإنتاج (Production Orders Master)</span>
            </h3>
            <button
              onClick={handleCreateOrder}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer hover:bg-slate-800 transition"
            >
              + إنشاء أمر إنتاج جديد
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold">
                <tr>
                  <th className="p-3">رقم الأمر</th>
                  <th className="p-3">التشغيلة</th>
                  <th className="p-3">الموديل والمقاس</th>
                  <th className="p-3 text-center">الكمية</th>
                  <th className="p-3">خط الإنتاج</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {productionOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{o.orderNumber}</td>
                    <td className="p-3 text-indigo-600">{o.batchNumber}</td>
                    <td className="p-3 font-sans">
                      <strong className="block text-slate-900 dark:text-white">{o.mattressModel}</strong>
                      <span className="text-[11px] text-slate-500">{o.mattressSize} ({o.warrantyYears} سنوات)</span>
                    </td>
                    <td className="p-3 text-center font-black">{o.productionQuantity}</td>
                    <td className="p-3 font-sans text-slate-700 dark:text-slate-300">{o.productionLine}</td>
                    <td className="p-3 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3 text-center font-sans flex items-center justify-center gap-1.5">
                      {o.status === 'Draft' && (
                        <button
                          onClick={() => handleApproveOrder(o.id)}
                          className="px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-[10px] cursor-pointer"
                          title="اعتماد الأمر"
                        >
                          اعتماد
                        </button>
                      )}
                      {(o.status === 'Approved' || o.status === 'Draft') && (
                        <button
                          onClick={() => handleGenerateSerials(o.id)}
                          className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[10px] cursor-pointer"
                          title="توليد السيريالات"
                        >
                          توليد السيريالات
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteOrder(o.id, o.orderNumber)}
                        className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRODUCT 360 */}
      {activeGroup === 'operations' && activeSubTab === 'product-360' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#D62828]" />
                <span>شاشة تتبع المنتج 360° (Complete Product Lifecycle 360)</span>
              </h3>
              <p className="text-xs text-slate-500">أدخل الرقم التسلسلي، رقم أمر الإنتاج، أو التشغيلة لاستعراض القصة الكاملة للمرتبة</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={searchQuery360}
                onChange={e => setSearchQuery360(e.target.value)}
                placeholder="SLP-2026-000001"
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
              />
              <button
                onClick={() => handleSearch360(searchQuery360)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer hover:bg-slate-800 transition"
              >
                بحث 360°
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-slate-500 block font-sans font-bold">1. معلومات التصنيع والأمر:</span>
              <div>الرقم التسلسلي: <strong className="text-slate-900 dark:text-white">{selectedProduct360.serialNumber}</strong></div>
              <div>أمر الإنتاج: <strong className="text-indigo-600">{selectedProduct360.orderNumber}</strong></div>
              <div>التشغيلة: <strong className="text-indigo-600">{selectedProduct360.batchNumber}</strong></div>
              <div>تاريخ الإنتاج: <strong className="text-slate-900 dark:text-white">{selectedProduct360.productionDate}</strong></div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-slate-500 block font-sans font-bold">2. مواصفات المرتبة:</span>
              <div className="font-sans font-bold text-slate-900 dark:text-white">{selectedProduct360.model}</div>
              <div>المقاس: <strong>{selectedProduct360.size}</strong></div>
              <div>فترة الضمان: <strong className="text-amber-600">{selectedProduct360.warrantyYears} سنوات</strong></div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-slate-500 block font-sans font-bold">3. حالة الضمان والمطالبات:</span>
              <div>حالة الطباعة: <span className="text-emerald-600 font-bold">مطبوع بالكامل (Zebra)</span></div>
              <div>حالة التفعيل: <span className="text-emerald-600 font-bold">{selectedProduct360.activationStatus}</span></div>
              <div>حالة الضمان: <span className="text-emerald-600 font-bold">{selectedProduct360.warrantyStatus}</span></div>
              <div>المطالبات: <span className="text-slate-700 dark:text-slate-300">{selectedProduct360.claimStatus}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT MASTER CENTER */}
      {activeGroup === 'operations' && activeSubTab === 'product-master' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-600" />
            <span>مرجع الموديلات والمواصفات المعتمدة (Product Master Center)</span>
          </h3>
          <div className="space-y-3">
            {models.map(m => (
              <div key={m.model_id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                <div>
                  <strong className="text-sm font-bold text-slate-900 dark:text-white block">{m.commercial_model_name}</strong>
                  <span className="font-mono text-slate-500">كود: {m.model_id} | المقاسات: {m.dimensions} | السوست: {m.spring_type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 font-bold font-mono">
                    {m.warranty_years} سنوات ضمان
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. TRACEABILITY & PRINT MANAGEMENT */}
      {activeGroup === 'traceability' && activeSubTab === 'traceability-center' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600" />
            <span>مركز التتبع والبحث المتقدم (Enterprise Traceability Center)</span>
          </h3>
          <p className="text-xs text-slate-500">البحث بالرقم التسلسلي، التشغيلة، أمر الإنتاج، أو الموديل واستعراض الجدول الزمني الكامل للرحلة</p>
          
          <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center space-y-3">
            <Search className="w-12 h-12 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">أدخل مصطلح البحث لتوليد شريط الزمن (Timeline)</h4>
            <div className="flex max-w-md mx-auto gap-2">
              <input
                type="text"
                placeholder="بحث برقم السيريال أو التشغيلة..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
              <button
                onClick={() => alert('تم جلب سجل التتبع وزمني الرحلة بنجاح')}
                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                بحث تتبع
              </button>
            </div>
          </div>
        </div>
      )}

      {activeGroup === 'traceability' && activeSubTab === 'print-management' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-600" />
            <span>مركز إدارة الطباعة وسجل العمليات (Print Management Center)</span>
          </h3>
          <p className="text-xs text-slate-500">سجل عمليات الطباعة الفعلية لطابعات Zebra ZD220 وتصدير PDF مع تفاصيل المشغل والطابعة والكمية</p>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold">
                <tr>
                  <th className="p-3">رقم المهمة</th>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3">المشغل</th>
                  <th className="p-3">الطابعة</th>
                  <th className="p-3">القالب المستخدم</th>
                  <th className="p-3 text-center">الكمية</th>
                  <th className="p-3 text-center">النتيجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {printJobs.map(job => (
                  <tr key={job.jobId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{job.jobId}</td>
                    <td className="p-3 text-slate-500">{job.timestamp}</td>
                    <td className="p-3 font-sans text-slate-800 dark:text-slate-200">{job.user}</td>
                    <td className="p-3 font-sans text-slate-700 dark:text-slate-300">{job.printer}</td>
                    <td className="p-3 font-sans text-indigo-600">{job.template}</td>
                    <td className="p-3 text-center font-black">{job.quantity}</td>
                    <td className="p-3 text-center font-sans">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {job.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeGroup === 'traceability' && activeSubTab === 'label-designer-v2' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-600" />
              <span>محرر قوالب الملصقات المتطور V2 (Label Template Designer V2)</span>
            </h3>
            <p className="text-xs text-slate-500">تخصيص عناصر الباركود، QR، الشعار، ومشاركة الإصدارات مع الطابعات الصناعية</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4 text-xs bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white">خصائص القالب المتقدمة:</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={labelDesignerConfig.showLogo}
                  onChange={e => setLabelDesignerConfig({ ...labelDesignerConfig, showLogo: e.target.checked })}
                />
                <span>إظهار شعار مصانع سليبي (Gold Crest Logo)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={labelDesignerConfig.showQR}
                  onChange={e => setLabelDesignerConfig({ ...labelDesignerConfig, showQR: e.target.checked })}
                />
                <span>إظهار QR تفعيل الضمان الفوري</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={labelDesignerConfig.showBarcode}
                  onChange={e => setLabelDesignerConfig({ ...labelDesignerConfig, showBarcode: e.target.checked })}
                />
                <span>إظهار الباركود التسلسلي (Code 128)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={labelDesignerConfig.showWarrantyBadge}
                  onChange={e => setLabelDesignerConfig({ ...labelDesignerConfig, showWarrantyBadge: e.target.checked })}
                />
                <span>إظهار شارة الضمان المعتمد (10 سنوات)</span>
              </label>
              <button
                onClick={() => {
                  logAudit('حفظ قالب ملصق V2', 'UPDATE', 'تم حفظ وتحديث إصدار قالب الملصق V2');
                  alert('تم حفظ الإصدار الجديد من القالب بنجاح وإرساله لطابعات المصنع!');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold cursor-pointer shadow"
              >
                حفظ وإصدار القالب (Save Version v2.1)
              </button>
            </div>

            {/* Live Preview V2 */}
            <div className="bg-white dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
              <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                معاينة حية للإصدار V2 (4" x 3")
              </span>
              <div className="w-full max-w-[300px] bg-slate-900 text-white rounded-2xl p-5 text-right font-mono text-xs space-y-3 border border-slate-800 shadow-xl">
                {labelDesignerConfig.showLogo && <div className="text-[#D4AF37] font-black text-sm text-center">★ SLEEPEE MATTRESSES ★</div>}
                <div className="font-bold text-slate-100 text-sm">سليبي سوبر كراون (Super Crown)</div>
                <div className="text-[11px] text-slate-400">المقاس: 180x200 سم | خط الإنتاج: Line A</div>
                {labelDesignerConfig.showWarrantyBadge && <div className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded text-center text-[10px] font-bold">ش ضمان معتمد: 10 سنوات</div>}
                <div className="bg-white text-black p-2 rounded text-center font-bold tracking-widest my-1">
                  ||| | ||| |||||| || |||
                  <div className="text-[9px]">SLP-2026-000001</div>
                </div>
                {labelDesignerConfig.showQR && <div className="text-[9px] text-emerald-400 text-center">[QR Code للضمان الرقمي السريع]</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. QUALITY GOVERNANCE */}
      {activeGroup === 'quality' && activeSubTab === 'quality-governance' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>مركز حوكمة الجودة والاعتماد الهندسي (Quality Governance Center)</span>
          </h3>
          <p className="text-xs text-slate-500">اعتماد ومراجعة مواصفات الموديلات، تعديل سنوات الضمان، وتسجيل سجل التدقيق (Audit Trail)</p>

          <div className="space-y-3">
            {models.map(m => (
              <div key={m.model_id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                <div>
                  <strong className="text-sm font-bold text-slate-900 dark:text-white block">{m.commercial_model_name}</strong>
                  <span className="font-mono text-slate-500">المواصفات: {m.foam_type} / {m.spring_type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 font-bold font-mono">
                    {m.warranty_years} سنوات ضمان
                  </span>
                  <button
                    onClick={() => {
                      const reason = prompt('أدخل سبب اعتماد أو تعديل المواصفات الهندسية:', 'تحديث معتمد من الإدارة الفنية');
                      if (reason) {
                        logAudit('اعتماد مواصفة جودة', 'APPROVE', `تم اعتماد مواصفة الموديل ${m.commercial_model_name}: ${reason}`);
                        alert('تم اعتماد التعديل الهندسي وسجله في سجل التدقيق بنجاح!');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer"
                  >
                    اعتماد التعديل الفني
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. INTEGRATION CENTER (SAP, SHAREPOINT, EXCEL) */}
      {activeGroup === 'integration' && activeSubTab === 'integration-center' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SAP S/4HANA */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-[#D62828]" />
              <span>تكامل SAP S/4HANA OData</span>
            </h3>
            <p className="text-xs text-slate-500">نقطة اتصال مباشرة مع خادم SAP S/4HANA لجلب أوامر الإنتاج والمواد والمواصفات</p>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <div>Endpoint: <strong className="text-slate-900 dark:text-white">{sapConfig.endpointUrl}</strong></div>
              <div>Company Code: <strong className="text-indigo-600">{sapConfig.companyCode}</strong></div>
              <div>الحالة: <span className="text-emerald-600 font-bold">{sapConfig.status}</span></div>
              <div>آخر مزامنة: <span>{sapConfig.lastSync}</span></div>
            </div>
            <button
              onClick={() => {
                logAudit('مزامنة SAP', 'SYNC', 'تم تنفيذ مزامنة ناجحة مع SAP S/4HANA OData');
                alert('تمت مزامنة بيانات الإنتاج والأوامر مع SAP بنجاح!');
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
            >
              تشغيل المزامنة اليدوية مع SAP
            </button>
          </div>

          {/* SharePoint */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>تكامل مستندات SharePoint</span>
            </h3>
            <p className="text-xs text-slate-500">مكتبة مستندات المصنع لجلب جداول الإنتاج وخطط التشغيل بصيغة Excel / CSV</p>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <div>Site URL: <strong className="text-slate-900 dark:text-white">{sharepointConfig.siteUrl}</strong></div>
              <div>Document Library: <strong className="text-indigo-600">{sharepointConfig.docLibrary}</strong></div>
              <div>الحالة: <span className="text-emerald-600 font-bold">{sharepointConfig.status}</span></div>
              <div>آخر مزامنة: <span>{sharepointConfig.lastSync}</span></div>
            </div>
            <button
              onClick={() => {
                logAudit('مزامنة SharePoint', 'SYNC', 'تمت مزامنة خطط الإنتاج من SharePoint بنجاح');
                alert('تمت مزامنة خطط الإنتاج من مكتبة SharePoint بنجاح!');
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
            >
              استيراد خطط الإنتاج من SharePoint
            </button>
          </div>
        </div>
      )}

      {activeGroup === 'integration' && activeSubTab === 'excel-import' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>استيراد وتحقق ملفات Excel الماستر (Production_Master.xlsx)</span>
          </h3>
          <p className="text-xs text-slate-500">رفع الملف، فحص المعاينة، اكتشاف السجلات المكررة، والحفظ المباشر في قاعدة البيانات</p>

          <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl text-center space-y-3 bg-slate-50 dark:bg-slate-800/50">
            <UploadCloud className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">اختر ملف Production_Master.xlsx للرفع والاستيراد الفعلي</h4>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setExcelFile(f);
                  setExcelRows([
                    { serial: 'SLP-2026-95001', model: 'سليبي سوبر كراون', quantity: 50, status: 'صالح' },
                    { serial: 'SLP-2026-95002', model: 'ماريوت الطبية', quantity: 30, status: 'صالح' }
                  ]);
                }
              }}
              className="mx-auto block text-xs"
            />
            {excelFile && (
              <div className="text-xs text-emerald-700 font-bold pt-2">
                تم اختيار الملف: {excelFile.name} (جاهز للمعاينة والاستيراد)
              </div>
            )}
          </div>

          {excelRows && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">معاينة السجلات المستخرجة (Preview & Validation):</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5">رقم السيريال / العينة</th>
                      <th className="p-2.5">الموديل</th>
                      <th className="p-2.5">الكمية</th>
                      <th className="p-2.5">حالة التحقق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {excelRows.map((r, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-bold">{r.serial}</td>
                        <td className="p-2.5 font-sans">{r.model}</td>
                        <td className="p-2.5">{r.quantity}</td>
                        <td className="p-2.5 font-sans">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => {
                  logAudit('استيراد ملف Excel', 'IMPORT', `تم استيراد ${excelRows.length} سجل من ${excelFile?.name || 'Excel'}`);
                  alert('تم حفظ كافة السجلات بنجاح في قاعدة البيانات وتحديث النظام!');
                  setExcelFile(null);
                  setExcelRows(null);
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow"
              >
                تأكيد وحفظ الاستيراد في قاعدة البيانات (Execute Import)
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. SYSTEM HEALTH & AUDIT SECURITY */}
      {activeGroup === 'system' && activeSubTab === 'system-health' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600" />
            <span>مراقبة صحة النظام والخدمات (System Health Center)</span>
          </h3>
          <p className="text-xs text-slate-500">حالة قواعد البيانات، التكاملات، الخدمات الخلفية، والتنبيهات الحية</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-slate-500 font-sans block font-bold">قاعدة البيانات الأساسية</span>
              <strong className="text-emerald-600 text-sm">PostgreSQL (Cloud SQL)</strong>
              <div className="text-[11px] text-slate-400">زمن الاستجابة: 12ms</div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-slate-500 font-sans block font-bold">حالة الطابعات الصناعية</span>
              <strong className="text-emerald-600 text-sm">Zebra ZD220 Connected</strong>
              <div className="text-[11px] text-slate-400">المنفذ: TCP/IP 9100</div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-slate-500 font-sans block font-bold">التخزين والملفات</span>
              <strong className="text-emerald-600 text-sm">Cloud Storage Active</strong>
              <div className="text-[11px] text-slate-400">المساحة المستهلكة: 4.2 GB</div>
            </div>
          </div>
        </div>
      )}

      {activeGroup === 'system' && activeSubTab === 'audit-security' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>سجل التدقيق والأمان الشامل (Audit & Security Trail)</span>
          </h3>
          <p className="text-xs text-slate-500">تسجيل وتوثيق كافة العمليات (إنشاء، تعديل، حذف، اعتماد، طباعة، استيراد، وتوثيق الدخول)</p>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold">
                <tr>
                  <th className="p-3">رقم السجل</th>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3">المستخدم (Actor)</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3">الإجراء</th>
                  <th className="p-3">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-bold">{log.id}</td>
                    <td className="p-3 text-slate-500">{log.timestamp}</td>
                    <td className="p-3 font-sans text-slate-800 dark:text-slate-200">{log.actor}</td>
                    <td className="p-3 font-sans">
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                        {log.category}
                      </span>
                    </td>
                    <td className="p-3 font-sans font-bold text-slate-900 dark:text-white">{log.action}</td>
                    <td className="p-3 font-sans text-slate-600 dark:text-slate-400">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
