import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  RefreshCw,
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
} from 'lucide-react';
import { AppUser, ProductModel, ProductionSyncState, ProductionImportLog, ProductionBatch, ZebraLabelData } from '../types';

interface ProductionImportCenterProps {
  currentUser: AppUser;
  onRefreshData?: () => void;
}

export const ProductionImportCenter: React.FC<ProductionImportCenterProps> = ({
  currentUser,
  onRefreshData,
}) => {
  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<
    'import' | 'governance' | 'batches' | 'logs' | 'zebra' | 'backup'
  >('import');

  // Stats & Core Data
  const [stats, setStats] = useState<any>(null);
  const [models, setModels] = useState<ProductModel[]>([]);
  const [syncStates, setSyncStates] = useState<ProductionSyncState[]>([]);
  const [importLogs, setImportLogs] = useState<ProductionImportLog[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [warrantyAudits, setWarrantyAudits] = useState<any[]>([]);
  const [backupPolicy, setBackupPolicy] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileRawText, setFileRawText] = useState<string>('');
  const [sourceType, setSourceType] = useState<'Excel' | 'CSV'>('Excel');
  const [validationPreview, setValidationPreview] = useState<any>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Cloud Sync Running State
  const [syncingSource, setSyncingSource] = useState<string | null>(null);

  // Warranty Governance Edit State
  const [editingModel, setEditingModel] = useState<ProductModel | null>(null);
  const [newWarrantyYears, setNewWarrantyYears] = useState<number>(10);
  const [governanceReason, setGovernanceReason] = useState<string>('');
  const [governanceError, setGovernanceError] = useState<string | null>(null);
  const [governanceSuccess, setGovernanceSuccess] = useState<string | null>(null);

  // Zebra Label Preview State
  const [zebraSerialInput, setZebraSerialInput] = useState<string>('SLP-2026-9081');
  const [zebraLabelData, setZebraLabelData] = useState<ZebraLabelData | null>(null);
  const [zebraLoading, setZebraLoading] = useState<boolean>(false);
  const [zebraError, setZebraError] = useState<string | null>(null);
  const [copiedZpl, setCopiedZpl] = useState<boolean>(false);
  const [printSuccessNotice, setPrintSuccessNotice] = useState<string | null>(null);
  const [printErrorNotice, setPrintErrorNotice] = useState<string | null>(null);
  const [printingTest, setPrintingTest] = useState<boolean>(false);

  // Cloud Sync Settings Modal & Live Test State
  const [selectedConfigProvider, setSelectedConfigProvider] = useState<'SharePoint' | 'OneDrive' | 'SAP' | null>(null);
  const [configUrl, setConfigUrl] = useState<string>('');
  const [configTargetFileName, setConfigTargetFileName] = useState<string>('');
  const [configAuthType, setConfigAuthType] = useState<'anonymous_link' | 'graph_api' | 'basic_auth' | 'bearer_token'>('anonymous_link');
  const [configToken, setConfigToken] = useState<string>('');
  const [configMode, setConfigMode] = useState<'live_url' | 'simulated_fallback'>('simulated_fallback');
  const [configNotes, setConfigNotes] = useState<string>('');
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testConnectionResult, setTestConnectionResult] = useState<{
    success: boolean;
    status?: number;
    statusText?: string;
    message: string;
    latencyMs?: number;
    contentType?: string;
    error?: string;
  } | null>(null);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [configSaveNotice, setConfigSaveNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleOpenConfig = (provider: 'SharePoint' | 'OneDrive' | 'SAP') => {
    const s = syncStates.find((item) => item.sync_source === provider);
    setSelectedConfigProvider(provider);
    setConfigUrl(s?.sync_url || '');
    setConfigTargetFileName(s?.target_file_name || (provider === 'SharePoint' ? 'Production_Master.xlsx' : provider === 'OneDrive' ? 'OneDrive_Production_Master.xlsx' : 'API_PRODUCTION_ORDER_2_SRV'));
    setConfigAuthType(s?.auth_type || (provider === 'SAP' ? 'basic_auth' : 'anonymous_link'));
    setConfigToken(s?.api_key_or_token || '');
    setConfigMode(s?.connection_mode || 'simulated_fallback');
    setConfigNotes(s?.notes || '');
    setTestConnectionResult(null);
    setConfigSaveNotice(null);
  };

  const handleCloseConfig = () => {
    setSelectedConfigProvider(null);
    setTestConnectionResult(null);
    setConfigSaveNotice(null);
  };

  const handleCopyUrl = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handleTestConnection = async () => {
    if (!configUrl.trim()) {
      setTestConnectionResult({
        success: false,
        message: 'يرجى إدخال رابط صالح (URL) للاختبار',
      });
      return;
    }

    try {
      setTestingConnection(true);
      setTestConnectionResult(null);

      const res = await fetch('/api/production/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync_source: selectedConfigProvider,
          sync_url: configUrl.trim(),
          auth_type: configAuthType,
          api_key_or_token: configToken.trim(),
        }),
      });

      const data = await res.json();
      setTestConnectionResult(data);
    } catch (err: any) {
      setTestConnectionResult({
        success: false,
        message: `خطأ في محاولة الاتصال: ${err.message}`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfig = async (andSyncNow = false) => {
    if (!selectedConfigProvider) return;

    try {
      setSavingConfig(true);
      setConfigSaveNotice(null);

      const res = await fetch('/api/production/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sync_source: selectedConfigProvider,
          sync_url: configUrl.trim(),
          target_file_name: configTargetFileName.trim(),
          connection_mode: configMode,
          auth_type: configAuthType,
          api_key_or_token: configToken.trim(),
          notes: configNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ الإعدادات');

      setConfigSaveNotice({ type: 'success', text: `تم حفظ إعدادات رابط ${selectedConfigProvider} بنجاح` });
      await fetchData();

      if (andSyncNow) {
        const sourceKey = selectedConfigProvider.toLowerCase() as 'sharepoint' | 'onedrive' | 'sap';
        handleCloseConfig();
        await handleCloudSync(sourceKey, configUrl.trim());
      }
    } catch (err: any) {
      setConfigSaveNotice({ type: 'error', text: err.message });
    } finally {
      setSavingConfig(false);
    }
  };

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, modelsRes, syncRes, logsRes, batchesRes, auditsRes, backupRes] =
        await Promise.all([
          fetch('/api/production/stats').then((r) => r.json()),
          fetch('/api/production/models').then((r) => r.json()),
          fetch('/api/production/sync-states').then((r) => r.json()),
          fetch('/api/production/import-logs').then((r) => r.json()),
          fetch('/api/production/batches').then((r) => r.json()),
          fetch('/api/production/warranty-audits').then((r) => r.json()),
          fetch('/api/production/backup-policy').then((r) => r.json()),
        ]);

      setStats(statsRes);
      setModels(modelsRes);
      setSyncStates(syncRes);
      setImportLogs(logsRes);
      setBatches(batchesRes);
      setWarrantyAudits(auditsRes);
      setBackupPolicy(backupRes);
    } catch (err: any) {
      console.error('Error fetching production data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch default Zebra Label on load
  useEffect(() => {
    if (zebraSerialInput) {
      handleFetchZebraLabel(zebraSerialInput);
    }
  }, []);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationPreview(null);
    setImportResult(null);
    setImportError(null);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    setSourceType(isExcel ? 'Excel' : 'CSV');

    const reader = new FileReader();
    if (isExcel) {
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFileBase64(result);
        triggerValidationPreview(result, null, 'Excel');
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setFileRawText(text);
        triggerValidationPreview(null, text, 'CSV');
      };
      reader.readAsText(file);
    }
  };

  // Trigger Validation Preview
  const triggerValidationPreview = async (
    b64: string | null,
    text: string | null,
    src: 'Excel' | 'CSV'
  ) => {
    try {
      setIsValidating(true);
      setImportError(null);

      const res = await fetch('/api/production/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: src,
          fileData: b64,
          rawText: text,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل التحقق من الملف');
      }

      setValidationPreview(data);
    } catch (err: any) {
      setImportError(err.message);
    } finally {
      setIsValidating(false);
    }
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!selectedFile && !fileBase64 && !fileRawText) {
      setImportError('يرجى اختيار ملف صالح أولاً');
      return;
    }

    try {
      setIsImporting(true);
      setImportError(null);

      const res = await fetch('/api/production/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          fileName: selectedFile?.name || 'Production_Master.xlsx',
          fileData: fileBase64,
          rawText: fileRawText,
          performedBy: `${currentUser.name} (${currentUser.role})`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تنفيذ الاستيراد');
      }

      setImportResult(data);
      setSelectedFile(null);
      setValidationPreview(null);
      fetchData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setImportError(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Trigger Cloud Sync
  const handleCloudSync = async (source: 'sharepoint' | 'onedrive' | 'sap', customUrl?: string) => {
    try {
      setSyncingSource(source);
      setImportError(null);

      const endpoint =
        source === 'sharepoint'
          ? '/api/production/sync/sharepoint'
          : source === 'onedrive'
          ? '/api/production/sync/onedrive'
          : '/api/production/sync/sap';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          performedBy: `${currentUser.name} (${currentUser.role})`,
          customUrl: customUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشلت المزامنة');
      }

      setImportResult(data);
      fetchData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setImportError(err.message);
    } finally {
      setSyncingSource(null);
    }
  };

  // Update Warranty Governance
  const handleSaveWarrantyYears = async () => {
    if (!editingModel) return;

    if (currentUser.role !== 'SUPER_ADMIN') {
      setGovernanceError('تعديل سنوات وسياسات الضمان محصور حصرياً بالمشرف العام (SUPER_ADMIN)');
      return;
    }

    try {
      setGovernanceError(null);
      const res = await fetch(`/api/production/models/${editingModel.model_id}/warranty`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warranty_years: newWarrantyYears,
          changed_by: currentUser.name,
          user_role: currentUser.role,
          reason: governanceReason || 'تحديث دوري لسياسة الضمان المعتمدة',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث سنوات الضمان');
      }

      setGovernanceSuccess(data.message);
      setEditingModel(null);
      setGovernanceReason('');
      fetchData();
      setTimeout(() => setGovernanceSuccess(null), 5000);
    } catch (err: any) {
      setGovernanceError(err.message);
    }
  };

  // Fetch Zebra Label Data
  const handleFetchZebraLabel = async (serial: string) => {
    const clean = serial.trim().toUpperCase();
    if (!clean) return;

    try {
      setZebraLoading(true);
      setZebraError(null);
      const res = await fetch(`/api/production/zebra-label/${clean}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'لم يتم العثور على المرتبة');
      }
      setZebraLabelData(data);
    } catch (err: any) {
      setZebraError(err.message);
      setZebraLabelData(null);
    } finally {
      setZebraLoading(false);
    }
  };

  // Copy ZPL Code
  const handleCopyZpl = () => {
    if (!zebraLabelData?.zpl_code) return;
    navigator.clipboard.writeText(zebraLabelData.zpl_code);
    setCopiedZpl(true);
    setTimeout(() => setCopiedZpl(false), 3000);
  };

  // Simulate Print
  const handleSimulatePrint = async () => {
    if (!zebraLabelData) return;
    setPrintingTest(true);
    setPrintErrorNotice(null);
    setPrintSuccessNotice(null);
    try {
      const res = await fetch('/api/production/zebra-test-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number: zebraLabelData.serial_number,
          zpl_code: zebraLabelData.zpl_code,
          printer_ip: '192.168.1.180',
          printer_port: 9100,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'فشل إرسال أمر الطباعة');
      }
      setPrintSuccessNotice(
        data.message ||
          `تم إرسال أمر الطباعة بنجاح إلى طابعة Zebra ZD220 (IP: 192.168.1.180 - Port: 9100) للمرتبة ${zebraLabelData.serial_number}`
      );
      setTimeout(() => setPrintSuccessNotice(null), 8000);
    } catch (err: any) {
      console.error('Print error:', err);
      setPrintErrorNotice(err.message || 'حدث خطأ أثناء إرسال أمر الطباعة إلى طابعة Zebra');
      setTimeout(() => setPrintErrorNotice(null), 8000);
    } finally {
      setPrintingTest(false);
    }
  };

  return (
    <div className="space-y-6 text-right font-['Cairo']">
      {/* Top Header & Export Master */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#D62828]" />
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-[#D62828]/10 text-[#D62828] flex items-center justify-center border border-[#D62828]/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#111111]">
                مركز تكامل الإنتاج الذكي (Production Integration Center)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                منظومة الربط الشامل لبيانات المصنع، المزامنة السحابية (SharePoint / OneDrive / SAP)، وطباعة ليبلات Zebra ZD220
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/api/production/export-master"
            download
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D62828] hover:bg-[#B71C1C] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#D62828]/20 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تحميل Master المجمع (Production_Master.xlsx)</span>
          </a>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F5F5F5] hover:bg-[#E5E7EB] text-slate-700 text-xs font-bold transition border border-[#E5E7EB] cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#D62828]' : ''}`} />
            <span>تحديث المؤشرات</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] p-5 shadow-xs">
            <span className="text-xs font-bold text-slate-500 block mb-1">إجمالي المراتب المنتجة</span>
            <div className="text-2xl sm:text-3xl font-black text-[#111111] font-mono">
              {stats.totalSerials?.toLocaleString()}
            </div>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              سيريالات فعلية مسجلة ومطابقة
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-[#E5E7EB] p-5 shadow-xs">
            <span className="text-xs font-bold text-slate-500 block mb-1">دفعات وتشغيلات المصنع</span>
            <div className="text-2xl sm:text-3xl font-black text-[#D62828] font-mono">
              {stats.totalBatches}
            </div>
            <span className="text-[11px] font-bold text-slate-500 block mt-1">
              أوامر إنتاج وتشغيلات معتمدة
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-[#E5E7EB] p-5 shadow-xs">
            <span className="text-xs font-bold text-slate-500 block mb-1">موديلات الضمان المعتمدة</span>
            <div className="text-2xl sm:text-3xl font-black text-[#D4AF37] font-mono">
              {stats.totalModels}
            </div>
            <span className="text-[11px] font-bold text-slate-500 block mt-1">
              ربط تلقائي لسنوات الضمان (3-10 سنوات)
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-[#E5E7EB] p-5 shadow-xs">
            <span className="text-xs font-bold text-slate-500 block mb-1">عمليات التوريد والأرشفة</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
              {stats.totalImportLogs}
            </div>
            <span className="text-[11px] font-bold text-slate-500 block mt-1">
              سجلات تدقيق واستيراد سحابي دائم
            </span>
          </div>
        </div>
      )}

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E5E7EB] text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition cursor-pointer ${
            activeTab === 'import'
              ? 'bg-[#D62828] text-white shadow-md shadow-[#D62828]/20'
              : 'text-slate-600 hover:text-[#D62828] hover:bg-[#D62828]/5 border border-transparent hover:border-[#D62828]/20'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>استيراد ومزامنة البيانات السحابية</span>
        </button>

        <button
          onClick={() => setActiveTab('governance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition cursor-pointer ${
            activeTab === 'governance'
              ? 'bg-[#D62828] text-white shadow-md shadow-[#D62828]/20'
              : 'text-slate-600 hover:text-[#D62828] hover:bg-[#D62828]/5 border border-transparent hover:border-[#D62828]/20'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>حوكمة الموديلات وسنوات الضمان</span>
        </button>

        <button
          onClick={() => setActiveTab('batches')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition cursor-pointer ${
            activeTab === 'batches'
              ? 'bg-[#D62828] text-white shadow-md shadow-[#D62828]/20'
              : 'text-slate-600 hover:text-[#D62828] hover:bg-[#D62828]/5 border border-transparent hover:border-[#D62828]/20'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>تشغيلات ودفعات المصنع ({batches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('zebra')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition cursor-pointer ${
            activeTab === 'zebra'
              ? 'bg-[#D62828] text-white shadow-md shadow-[#D62828]/20'
              : 'text-slate-600 hover:text-[#D62828] hover:bg-[#D62828]/5 border border-transparent hover:border-[#D62828]/20'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>طباعة ليبل Zebra ZD220 (ZPL)</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-[#D62828] text-white shadow-md shadow-[#D62828]/20'
              : 'text-slate-600 hover:text-[#D62828] hover:bg-[#D62828]/5 border border-transparent hover:border-[#D62828]/20'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>سجلات التوريد والتدقيق ({importLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-[#D62828] text-white shadow-md shadow-[#D62828]/20'
              : 'text-slate-600 hover:text-[#D62828] hover:bg-[#D62828]/5 border border-transparent hover:border-[#D62828]/20'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>سياسة الحفظ والنسخ الاحتياطي</span>
        </button>
      </div>

      {/* ========================================== */}
      {/* TAB 1: IMPORT & CLOUD SYNC */}
      {/* ========================================== */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Cloud Sync Providers Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-600" />
                  <span>المزامنة السحابية وروابط الأنظمة (SharePoint / OneDrive / SAP)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  مراجعة الروابط السحابية، التحقق من مصدر الاستيراد الفعلي، وإمكانية تعديل أو اختبار الروابط الحية
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200">
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  <span>3 مصادر سحابية مهيأة</span>
                </span>
              </div>
            </div>

            {/* Explanation & Discovery Banner (Clarifying where it imports from and why it's not linked) */}
            <div className="mb-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1.5">
                  <div className="font-bold text-amber-900 text-sm flex items-center gap-2">
                    <span>ملاحظة توضيحية هامة: من أين يستورد النظام حالياً؟ ولماذا يظهر "لم يتم الربط الفعلي"؟</span>
                  </div>
                  <p className="text-amber-900/90 leading-relaxed">
                    <strong>المصدر الحالي للبيانات:</strong> يستورد النظام حالياً من <strong>نماذج محاكاة خطوط الإنتاج المتوافقة</strong> (Sleepee Factory Dataset المضمنة في <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">SharePointProvider</code> و <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">OneDriveProvider</code> و <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">SAPProvider</code>). هذه النماذج مطابقة تماماً لهيكل ملف <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">Production_Master.xlsx</code> لتوليد السيريالات وتغذية الجودة وفترات الضمان دون توقف.
                  </p>
                  <p className="text-amber-900/90 leading-relaxed">
                    <strong>سبب عدم الربط الحي بعد:</strong> يتطلب الربط الحي مع مستأجر مايكروسوفت (Tenant) أو سيرفر SAP الفعلي توفير رابط تحميل مباشر أو مفتاح توثيق (API Bearer Token).
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-3 font-semibold text-amber-900">
                    <span>💡 يمكنك الضغط على أيقونة <strong>«إعدادات ورابط المزامنة ⚙️»</strong> أدناه لوضع رابط الملف الفعلي واختباره فوراً بنقرة واحدة!</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* SharePoint Card */}
              {(() => {
                const spState = syncStates.find((s) => s.sync_source === 'SharePoint');
                const isLive = spState?.connection_mode === 'live_url' && spState?.connection_status === 'connected';
                const spUrl = spState?.sync_url || 'https://sleepee-factory.sharepoint.com/sites/ProductionMaster/Shared%20Documents/Production_Master.xlsx';

                return (
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-black text-xs">
                            SP
                          </div>
                          <span className="font-bold text-sm text-slate-900">SharePoint Library</span>
                        </div>
                        {isLive ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-emerald-600" />
                            <span>رابط حي متصل</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1" title="لم يتم الربط الفعلي مع سيرفر خارجي، يعمل بوضع المحاكاة الافتراضية">
                            <Cpu className="w-3 h-3 text-amber-600" />
                            <span>محاكاة (غير مربوط حياً)</span>
                          </span>
                        )}
                      </div>

                      {/* Current Origin Notice */}
                      <div className="mb-3 p-2 rounded-xl bg-white border border-slate-200/80 text-[11px]">
                        <span className="text-slate-500 block text-[10px] font-bold">المصدر المستورد منه حالياً:</span>
                        <span className="font-semibold text-slate-800">
                          {isLive ? 'جلب حي من رابط SharePoint' : 'نموذج محاكاة الإنتاج التراكمي (Production_Master.xlsx)'}
                        </span>
                      </div>

                      {/* Exposed Sync URL with Copy Action */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                          <span className="font-bold flex items-center gap-1">
                            <LinkIcon className="w-3 h-3 text-indigo-600" />
                            <span>رابط المزامنة (Sync URL):</span>
                          </span>
                          <button
                            onClick={() => handleCopyUrl(spUrl)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedUrl === spUrl ? (
                              <span className="text-emerald-600 flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> تم النسخ
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5">
                                <Copy className="w-3 h-3" /> نسخ الرابط
                              </span>
                            )}
                          </button>
                        </div>
                        <div
                          title={spUrl}
                          className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-700 truncate select-all flex items-center justify-between"
                        >
                          <span className="truncate">{spUrl}</span>
                          <a
                            href={spUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mr-2 text-slate-400 hover:text-indigo-600 shrink-0"
                            title="فتح الرابط في نافذة جديدة"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Last Sync details */}
                      <div className="text-[11px] text-slate-600 space-y-1 mb-4">
                        <div className="flex justify-between">
                          <span>آخر مزامنة:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {spState?.last_sync_time
                              ? new Date(spState.last_sync_time).toLocaleDateString('ar-EG', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'قبل قليل'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>سجلات الدفعة:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {spState?.last_row_count || 142} سجل
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => handleOpenConfig('SharePoint')}
                        className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>إعدادات واختبار رابط SharePoint</span>
                      </button>

                      <button
                        onClick={() => handleCloudSync('sharepoint')}
                        disabled={syncingSource !== null}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs transition flex items-center justify-center gap-2 shadow cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${syncingSource === 'sharepoint' ? 'animate-spin' : ''}`}
                        />
                        <span>
                          {syncingSource === 'sharepoint' ? 'جاري المزامنة...' : 'مزامنة SharePoint الآن'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* OneDrive Card */}
              {(() => {
                const odState = syncStates.find((s) => s.sync_source === 'OneDrive');
                const isLive = odState?.connection_mode === 'live_url' && odState?.connection_status === 'connected';
                const odUrl = odState?.sync_url || 'https://1drv.ms/x/s!AkL920SleepeeProductionSharedFolder_MasterData?download=1';

                return (
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-xs">
                            OD
                          </div>
                          <span className="font-bold text-sm text-slate-900">OneDrive Business</span>
                        </div>
                        {isLive ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-emerald-600" />
                            <span>رابط حي متصل</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1" title="لم يتم الربط الفعلي مع سيرفر خارجي، يعمل بوضع المحاكاة الافتراضية">
                            <Cpu className="w-3 h-3 text-amber-600" />
                            <span>محاكاة (غير مربوط حياً)</span>
                          </span>
                        )}
                      </div>

                      {/* Current Origin Notice */}
                      <div className="mb-3 p-2 rounded-xl bg-white border border-slate-200/80 text-[11px]">
                        <span className="text-slate-500 block text-[10px] font-bold">المصدر المستورد منه حالياً:</span>
                        <span className="font-semibold text-slate-800">
                          {isLive ? 'جلب حي من رابط OneDrive المشترك' : 'نموذج خطوط إنتاج المصنع التراكمي (OneDrive Model)'}
                        </span>
                      </div>

                      {/* Exposed Sync URL with Copy Action */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                          <span className="font-bold flex items-center gap-1">
                            <LinkIcon className="w-3 h-3 text-sky-600" />
                            <span>رابط المزامنة (Sync URL):</span>
                          </span>
                          <button
                            onClick={() => handleCopyUrl(odUrl)}
                            className="text-[10px] text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedUrl === odUrl ? (
                              <span className="text-emerald-600 flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> تم النسخ
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5">
                                <Copy className="w-3 h-3" /> نسخ الرابط
                              </span>
                            )}
                          </button>
                        </div>
                        <div
                          title={odUrl}
                          className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-700 truncate select-all flex items-center justify-between"
                        >
                          <span className="truncate">{odUrl}</span>
                          <a
                            href={odUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mr-2 text-slate-400 hover:text-sky-600 shrink-0"
                            title="فتح الرابط في نافذة جديدة"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Last Sync details */}
                      <div className="text-[11px] text-slate-600 space-y-1 mb-4">
                        <div className="flex justify-between">
                          <span>آخر مزامنة:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {odState?.last_sync_time
                              ? new Date(odState.last_sync_time).toLocaleDateString('ar-EG', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'قبل قليل'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>سجلات الدفعة:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {odState?.last_row_count || 88} سجل
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => handleOpenConfig('OneDrive')}
                        className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-sky-600" />
                        <span>إعدادات واختبار رابط OneDrive</span>
                      </button>

                      <button
                        onClick={() => handleCloudSync('onedrive')}
                        disabled={syncingSource !== null}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs transition flex items-center justify-center gap-2 shadow cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${syncingSource === 'onedrive' ? 'animate-spin' : ''}`}
                        />
                        <span>
                          {syncingSource === 'onedrive' ? 'جاري المزامنة...' : 'مزامنة OneDrive الآن'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* SAP S/4HANA Card */}
              {(() => {
                const sapState = syncStates.find((s) => s.sync_source === 'SAP');
                const isLive = sapState?.connection_mode === 'live_url' && sapState?.connection_status === 'connected';
                const sapUrl = sapState?.sync_url || 'https://s4hana-gateway.sleepee.com/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder';

                return (
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-black text-xs">
                            SAP
                          </div>
                          <span className="font-bold text-sm text-slate-900">SAP S/4HANA (OData)</span>
                        </div>
                        {isLive ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-emerald-600" />
                            <span>نقطة نهاية حية</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center gap-1" title="كتالوج محاكاة OData مهيأ تمهيداً للربط المستقبلي">
                            <Cpu className="w-3 h-3 text-blue-600" />
                            <span>كتالوج مهيأ (تكامل مستقبلي)</span>
                          </span>
                        )}
                      </div>

                      {/* Current Origin Notice */}
                      <div className="mb-3 p-2 rounded-xl bg-white border border-slate-200/80 text-[11px]">
                        <span className="text-slate-500 block text-[10px] font-bold">المصدر المستورد منه حالياً:</span>
                        <span className="font-semibold text-slate-800">
                          {isLive ? 'سحب حي من OData API' : 'كتالوج أوامر شغل SAP المهيأ داخلياً (Mock Catalog)'}
                        </span>
                      </div>

                      {/* Exposed Sync URL with Copy Action */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                          <span className="font-bold flex items-center gap-1">
                            <LinkIcon className="w-3 h-3 text-blue-600" />
                            <span>رابط خدمة OData (Service URL):</span>
                          </span>
                          <button
                            onClick={() => handleCopyUrl(sapUrl)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedUrl === sapUrl ? (
                              <span className="text-emerald-600 flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> تم النسخ
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5">
                                <Copy className="w-3 h-3" /> نسخ الرابط
                              </span>
                            )}
                          </button>
                        </div>
                        <div
                          title={sapUrl}
                          className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-700 truncate select-all flex items-center justify-between"
                        >
                          <span className="truncate">{sapUrl}</span>
                          <a
                            href={sapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mr-2 text-slate-400 hover:text-blue-600 shrink-0"
                            title="فتح الرابط في نافذة جديدة"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Last Sync details */}
                      <div className="text-[11px] text-slate-600 space-y-1 mb-4">
                        <div className="flex justify-between">
                          <span>الكيان / الخدمة:</span>
                          <span className="font-mono font-bold text-slate-800 truncate max-w-[140px]">
                            {sapState?.target_file_name || 'API_PRODUCTION_ORDER_2_SRV'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>أوامر الإنتاج المستوردة:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {sapState?.last_row_count || 160} أمر
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => handleOpenConfig('SAP')}
                        className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>إعدادات ونقطة نهاية SAP</span>
                      </button>

                      <button
                        onClick={() => handleCloudSync('sap')}
                        disabled={syncingSource !== null}
                        className="w-full py-2 px-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-blue-200 font-bold text-xs transition flex items-center justify-center gap-2 shadow cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${syncingSource === 'sap' ? 'animate-spin' : ''}`}
                        />
                        <span>
                          {syncingSource === 'sap' ? 'جاري الاتصال بـ SAP...' : 'سحب بيانات SAP OData'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Manual File Ingestion Drag & Drop */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>استيراد يدوي لملف الإنتاج (Excel .xlsx / CSV)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              يدعم ملفات إكسيل المجمعة والمصنع التراكمية مع مطابقة تلقائية للعناوين بالعربية والإنجليزية وتخطي الخطط والتوقعات تلقائياً
            </p>

            {/* Dropzone */}
            <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-3xl p-8 text-center transition bg-slate-50/60 relative cursor-pointer group">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-slate-800 mb-1">
                اسحب وأفلت ملف إكسيل هنا، أو انقر للاستعراض
              </p>
              <p className="text-xs text-slate-500">
                يدعم ملفات: <code className="font-mono">Production_Master.xlsx</code>, CSV UTF-8
              </p>

              {selectedFile && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <CheckCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    تم اختيار الملف: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>

            {/* Error Banner */}
            {importError && (
              <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Import Result Notification */}
            {importResult && (
              <div className="mt-6 p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base">
                      تمت معالجة الاستيراد بنجاح ({importResult.importId})
                    </h4>
                    <p className="text-xs text-emerald-800">
                      المصدر: {importResult.sourceType} | الملف: {importResult.fileName} | وقت التنفيذ:{' '}
                      {importResult.executionTimeMs} ملي ثانية
                    </p>
                    {importResult.sourceOrigin && (
                      <div className="mt-2 p-2 rounded-lg bg-white/80 border border-emerald-200 text-xs text-emerald-900 flex flex-wrap items-center gap-2">
                        <span className="font-bold">المصدر الفعلي المعتمد:</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold font-mono text-[11px]">
                          {importResult.sourceOrigin}
                        </span>
                        {importResult.syncNote && (
                          <span className="text-[11px] text-slate-600">({importResult.syncNote})</span>
                        )}
                        {importResult.urlUsed && (
                          <span className="text-[10px] font-mono text-slate-500 truncate max-w-xs block">
                            {importResult.urlUsed}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                  <div className="p-3 rounded-xl bg-white border border-emerald-100">
                    <span className="text-slate-500 block">إجمالي السجلات المقروءة</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {importResult.totalRead}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-emerald-100">
                    <span className="text-slate-500 block">سيريالات جديدة أضيفت</span>
                    <span className="text-base font-bold font-mono text-emerald-600">
                      {importResult.importedCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-emerald-100">
                    <span className="text-slate-500 block">سجلات مكررة تم تخطيها</span>
                    <span className="text-base font-bold font-mono text-amber-600">
                      {importResult.skippedCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-emerald-100">
                    <span className="text-slate-500 block">سجلات غير صالحة/مرفوضة</span>
                    <span className="text-base font-bold font-mono text-rose-600">
                      {importResult.failedCount}
                    </span>
                  </div>
                </div>

                {importResult.sampleImported && importResult.sampleImported.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-2">
                      عينة من السيريالات المسجلة بنجاح:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {importResult.sampleImported.map((s: any, i: number) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-slate-900 text-xs font-mono font-bold"
                        >
                          {s.serial_number} ({s.model})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Validation Preview Before Execution */}
            {validationPreview && (
              <div className="mt-6 border border-slate-200 rounded-3xl p-6 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-amber-500" />
                      <span>معاينة الفحص المسبق والتحقق الصارم من قواعد الإنتاج</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      تم فحص السجلات وفق قواعد مصنع سليبي: مطابقة الموديلات، عزل الخطط والتوقعات، وفحص التكرار
                    </p>
                  </div>

                  <button
                    onClick={handleExecuteImport}
                    disabled={isImporting || validationPreview.newToInsertCount === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm shadow-md transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isImporting
                        ? 'جاري الحفظ والتسجيل...'
                        : `تنفيذ الاستيراد (${validationPreview.newToInsertCount} مرتبة جديدة)`}
                    </span>
                  </button>
                </div>

                {/* Preview Metric Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <span className="text-slate-500 block">إجمالي السطور</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {validationPreview.totalRead}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <span className="text-slate-500 block">سيريالات جديدة للاعتماد</span>
                    <span className="text-base font-bold font-mono text-emerald-600">
                      {validationPreview.newToInsertCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <span className="text-slate-500 block">سيريالات مسجلة مسبقاً (تخطي)</span>
                    <span className="text-base font-bold font-mono text-amber-600">
                      {validationPreview.duplicateCount}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <span className="text-slate-500 block">مستبعد (خطط وتوقعات)</span>
                    <span className="text-base font-bold font-mono text-slate-700">
                      {validationPreview.skippedCount}
                    </span>
                  </div>
                </div>

                {/* Sample Table */}
                {validationPreview.sampleValid && validationPreview.sampleValid.length > 0 && (
                  <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                        <tr>
                          <th className="p-3">السيريال</th>
                          <th className="p-3">الموديل</th>
                          <th className="p-3">المقاس</th>
                          <th className="p-3">سنوات الضمان</th>
                          <th className="p-3">تاريخ الإنتاج</th>
                          <th className="p-3">أمر الشغل</th>
                          <th className="p-3">التشغيلة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {validationPreview.sampleValid.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-slate-900">
                              {row.serial_number}
                            </td>
                            <td className="p-3 font-bold text-slate-950">{row.model}</td>
                            <td className="p-3 text-slate-700">{row.size}</td>
                            <td className="p-3 font-mono font-bold text-amber-700">
                              {row.warranty_years} سنوات
                            </td>
                            <td className="p-3 font-mono text-slate-600">{row.production_date}</td>
                            <td className="p-3 font-mono text-slate-600">{row.production_order}</td>
                            <td className="p-3 font-mono text-slate-600">{row.batch_no}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: WARRANTY GOVERNANCE & MODELS */}
      {/* ========================================== */}
      {activeTab === 'governance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  <span>جدول موديلات المراتب وحوكمة سنوات الضمان</span>
                </h3>
                <p className="text-xs text-slate-500">
                  يرتبط كل موديل تلقائياً بسنوات الضمان المعتمدة (3، 5، 7، 10 سنوات). تعديل السياسة محصور حصرياً بـ المشرف العام (SUPER_ADMIN)
                </p>
              </div>

              {currentUser.role === 'SUPER_ADMIN' ? (
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  مصرح لك بالتعديل (SUPER_ADMIN)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  عرض فقط (صلاحيات SUPER_ADMIN مطلوبة للتعديل)
                </span>
              )}
            </div>

            {governanceSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                {governanceSuccess}
              </div>
            )}

            {governanceError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                {governanceError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">كود الموديل</th>
                    <th className="p-3">اسم الموديل التجاري</th>
                    <th className="p-3">كود مادة SAP</th>
                    <th className="p-3">العائلة الإنتاجية</th>
                    <th className="p-3">سنوات الضمان</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">إجراءات الحوكمة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {models.map((m) => (
                    <tr key={m.model_id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-800">{m.model_id}</td>
                      <td className="p-3 font-bold text-slate-950">{m.commercial_model_name}</td>
                      <td className="p-3 font-mono text-slate-600">{m.sap_material_code}</td>
                      <td className="p-3 text-slate-700">{m.product_family}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 font-mono font-bold text-amber-800">
                          {m.warranty_years} سنوات
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {m.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            if (currentUser.role !== 'SUPER_ADMIN') {
                              setGovernanceError(
                                'غير مصرح: تعديل سنوات وسياسات الضمان محصور حصرياً بـ المشرف العام (SUPER_ADMIN)'
                              );
                              return;
                            }
                            setEditingModel(m);
                            setNewWarrantyYears(m.warranty_years);
                            setGovernanceReason('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs transition"
                        >
                          تعديل سنوات الضمان
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Governance Modal */}
          {editingModel && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
              <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 text-right">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-base">
                      تعديل سياسة الضمان (حوكمة المشرف العام)
                    </h4>
                    <p className="text-xs text-slate-500">
                      الموديل: {editingModel.commercial_model_name}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      سنوات الضمان الجديدة (Allowed: 3, 5, 7, 10)
                    </label>
                    <select
                      value={newWarrantyYears}
                      onChange={(e) => setNewWarrantyYears(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold outline-none focus:border-amber-500"
                    >
                      <option value={3}>3 سنوات</option>
                      <option value={5}>5 سنوات</option>
                      <option value={7}>7 سنوات</option>
                      <option value={10}>10 سنوات</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      مبرر وسند التعديل (إلزامي للتدقيق والامتثال)
                    </label>
                    <textarea
                      rows={3}
                      value={governanceReason}
                      onChange={(e) => setGovernanceReason(e.target.value)}
                      placeholder="مثال: قرار مجلس الإدارة رقم 14 لسنة 2026 بتحديث فترات الضمان للمراتب الطبية..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    ⚠️ تنبيه: سيتم تسجيل هذا التغيير في سجل التدقيق الأمني الدائم مع حفظ اسم المستخدم والوقت والمبرر.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditingModel(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveWarrantyYears}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold transition shadow"
                  >
                    اعتماد وتوثيق في سجل التدقيق
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Warranty Audits Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>سجل تدقيق وتاريخ تعديلات سياسات الضمان (Warranty Policy Audit Trail)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              سجل دائم غير قابل للحذف يوثق كافة التعديلات التاريخية على سنوات الضمان ومبرراتها
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">رقم العملية</th>
                    <th className="p-3">الموديل</th>
                    <th className="p-3">الضمان السابق</th>
                    <th className="p-3">الضمان الجديد</th>
                    <th className="p-3">المسؤول</th>
                    <th className="p-3">تاريخ التغيير</th>
                    <th className="p-3">المبرر الموثق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {warrantyAudits.map((a: any) => (
                    <tr key={a.audit_id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-800">{a.audit_id}</td>
                      <td className="p-3 font-bold text-slate-950">{a.commercial_model_name}</td>
                      <td className="p-3 font-mono text-slate-500">{a.old_warranty_years} سنوات</td>
                      <td className="p-3 font-mono font-bold text-amber-700">{a.new_warranty_years} سنوات</td>
                      <td className="p-3 text-slate-800">{a.changed_by}</td>
                      <td className="p-3 font-mono text-slate-600">
                        {new Date(a.changed_at).toLocaleString('ar-EG')}
                      </td>
                      <td className="p-3 text-slate-700">{a.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: PRODUCTION BATCHES & TRACEABILITY */}
      {/* ========================================== */}
      {activeTab === 'batches' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>سجل دفعات وتشغيلات مصانع سليبي (Production Batches)</span>
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            تتبع كامل للتشغيلات الصناعية وأوامر الشغل وربط كل دفعة بالسيريالات المعتمدة
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-3">كود الدفعة</th>
                  <th className="p-3">رقم التشغيلة (Batch No)</th>
                  <th className="p-3">أمر الإنتاج (PO)</th>
                  <th className="p-3">تاريخ الإنتاج</th>
                  <th className="p-3">عدد السيريالات</th>
                  <th className="p-3">نظام المصدر</th>
                  <th className="p-3">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => (
                  <tr key={b.batch_id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">{b.batch_id}</td>
                    <td className="p-3 font-mono font-bold text-amber-700">{b.batch_no}</td>
                    <td className="p-3 font-mono text-slate-700">{b.production_order}</td>
                    <td className="p-3 font-mono text-slate-600">{b.production_date}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{b.total_serials} مرتبة</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                        {b.source_system}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      {new Date(b.created_at).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: ZEBRA ZD220 LABEL PRINTING */}
      {/* ========================================== */}
      {activeTab === 'zebra' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Printer className="w-5 h-5 text-amber-500" />
              <span>طباعة ليبل الباركود وكود QR - طابعات Zebra ZD220 الصناعية</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              توليد كود ZPL II القياسي بمقاس 4" × 3" (203 DPI) لطباعة استيكر المرتبة مع باركود Code 128 وكود QR للتحقق
            </p>

            {/* Serial Search Input */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 max-w-xl">
              <div className="relative w-full">
                <input
                  type="text"
                  value={zebraSerialInput}
                  onChange={(e) => setZebraSerialInput(e.target.value.toUpperCase())}
                  placeholder="أدخل الرقم التسلسلي للمرتبة (مثال: SLP-2026-9081)..."
                  className="w-full px-4 py-2.5 pr-10 text-xs sm:text-sm rounded-xl border border-slate-300 outline-none focus:border-amber-500 font-mono font-bold"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <button
                onClick={() => handleFetchZebraLabel(zebraSerialInput)}
                disabled={zebraLoading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs sm:text-sm shadow transition shrink-0"
              >
                {zebraLoading ? 'جاري التوليد...' : 'توليد ليبل Zebra'}
              </button>
            </div>

            {zebraError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{zebraError}</span>
              </div>
            )}

            {printSuccessNotice && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{printSuccessNotice}</span>
              </div>
            )}

            {zebraLabelData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visual Label Card */}
                <div className="border-2 border-slate-800 rounded-3xl p-6 bg-white text-slate-900 shadow-md">
                  <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                        SLEEPEE MATTRESSES EGYPT
                      </span>
                      <h4 className="text-lg font-black text-slate-950">{zebraLabelData.model}</h4>
                    </div>
                    <div className="px-3 py-1 rounded-xl bg-slate-900 text-amber-400 font-black text-xs">
                      ضمان {zebraLabelData.warranty_years} سنوات
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                    <div>
                      <span className="text-slate-500 block">المقاس:</span>
                      <span className="font-bold text-sm text-slate-900">{zebraLabelData.size}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">تاريخ الإنتاج:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {zebraLabelData.production_date}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">أمر الشغل:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {zebraLabelData.production_order}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">رقم التشغيلة:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {zebraLabelData.batch_no}
                      </span>
                    </div>
                  </div>

                  {/* Barcode & QR Box */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center mb-4">
                    <div className="text-xs font-mono tracking-widest text-slate-600 mb-1">
                      ||| | ||||| || |||| ||||| ||| ||||
                    </div>
                    <div className="font-mono font-black text-sm tracking-wider text-slate-950 mb-2">
                      *{zebraLabelData.serial_number}*
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Code 128 Standard Barcode + QR Code (Verification Link)
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200 pt-3">
                    <span>الخط الساخن: 19707</span>
                    <span>قالب الليبل: 4"x3" (ZD220 / ZD230)</span>
                  </div>
                </div>

                {/* ZPL Code Inspector */}
                <div className="bg-slate-950 text-slate-200 rounded-3xl p-6 font-mono text-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                      <span className="text-amber-400 font-bold">كود ZPL II الصناعي للطابعة:</span>
                      <button
                        onClick={handleCopyZpl}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
                      >
                        {copiedZpl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedZpl ? 'تم النسخ' : 'نسخ كود ZPL'}</span>
                      </button>
                    </div>
                    <pre className="overflow-x-auto text-[11px] text-emerald-400 p-3 bg-black/40 rounded-xl leading-relaxed max-h-64 font-mono">
                      {zebraLabelData.zpl_code}
                    </pre>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-400">
                        متوافق 100% مع طابعات Zebra ZD220/ZD420/ZT411 (TCP/IP Port 9100)
                      </span>
                      <button
                        onClick={handleSimulatePrint}
                        disabled={printingTest}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-amber-600 disabled:opacity-75 text-slate-950 font-bold text-xs transition shadow flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {printingTest ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        ) : (
                          <Printer className="w-4 h-4" />
                        )}
                        <span>{printingTest ? 'جاري إرسال أمر الطباعة...' : 'إرسال أمر الطباعة التجريبي'}</span>
                      </button>
                    </div>

                    {printSuccessNotice && (
                      <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{printSuccessNotice}</span>
                      </div>
                    )}

                    {printErrorNotice && (
                      <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{printErrorNotice}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 5: AUDIT LOGS OF IMPORTS */}
      {/* ========================================== */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>سجل عمليات الاستيراد والمزامنة السحابية (Production Import Audit Logs)</span>
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            أرشيف دائم غير قابل للتعديل يوثق جميع عمليات استيراد السيريالات من Excel، CSV، SharePoint، OneDrive، و SAP
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-3">رقم العملية</th>
                  <th className="p-3">اسم الملف</th>
                  <th className="p-3">المصدر</th>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3">الناجح (جديد)</th>
                  <th className="p-3">المتخطي (مكرر)</th>
                  <th className="p-3">المرفوض</th>
                  <th className="p-3">وقت التنفيذ</th>
                  <th className="p-3">المسؤول</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {importLogs.map((log) => (
                  <tr key={log.import_id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">{log.import_id}</td>
                    <td className="p-3 font-mono text-slate-800">{log.file_name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {log.source_type}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      {new Date(log.import_date).toLocaleString('ar-EG')}
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{log.imported_records}</td>
                    <td className="p-3 font-mono text-amber-700">{log.skipped_records}</td>
                    <td className="p-3 font-mono text-rose-600">{log.failed_records}</td>
                    <td className="p-3 font-mono text-slate-500">{log.execution_time} ms</td>
                    <td className="p-3 text-slate-700">{log.performed_by}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 6: BACKUP & RETENTION POLICY */}
      {/* ========================================== */}
      {activeTab === 'backup' && backupPolicy && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <span>سياسة الحفظ والأرشفة والنسخ الاحتياطي (Data Retention & Backup Policy)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              التزام كامل بمعايير حفظ بيانات الضمان والإنتاج وأرشفة السجلات التاريخية
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-sm text-slate-900 mb-3">مدد الحفظ الإلزامية</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-600">وثائق الضمان (Warranty Records):</span>
                    <span className="font-bold text-slate-900">
                      {backupPolicy.retentionRules?.warranty_records}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-600">طلبات الضمان (Warranty Claims):</span>
                    <span className="font-bold text-slate-900">
                      {backupPolicy.retentionRules?.warranty_claims}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-600">عمليات الاستبدال (Replacements):</span>
                    <span className="font-bold text-slate-900">
                      {backupPolicy.retentionRules?.replacements}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-600">دورة حياة المراتب (Product Lifecycle):</span>
                    <span className="font-bold text-emerald-700">
                      {backupPolicy.retentionRules?.product_lifecycle}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">سجلات التدقيق الأمني (Audit Logs):</span>
                    <span className="font-bold text-emerald-700">
                      {backupPolicy.retentionRules?.audit_logs}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-sm text-slate-900 mb-3">النسخ الاحتياطي اليومي المتعدد المناطق</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-600">تردد النسخ التلقائي:</span>
                    <span className="font-mono font-bold text-slate-900">{backupPolicy.backupFrequency}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-600">موقع التخزين السحابي:</span>
                    <span className="font-bold text-slate-900">Google Cloud Storage (Multi-Regional)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">التشفير:</span>
                    <span className="font-bold text-emerald-700">AES-256 Customer Managed Keys</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Snapshots Table */}
            <div>
              <h4 className="font-bold text-xs text-slate-800 mb-2">أحدث لقطات النسخ الاحتياطي السحابية:</h4>
              <div className="space-y-2">
                {backupPolicy.backupSnapshots?.map((s: any) => (
                  <div
                    key={s.snapshot_id}
                    className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{s.snapshot_id}</span>
                      <span className="text-slate-500">({s.type})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-700 font-bold">{s.status}</span>
                      <span className="font-mono text-slate-500">{s.size_kb} KB</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CLOUD SYNC CONFIGURATION & LIVE CONNECTION TEST */}
      {/* ======================================================== */}
      {selectedConfigProvider && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white text-sm shadow-xs ${
                    selectedConfigProvider === 'SharePoint'
                      ? 'bg-teal-600'
                      : selectedConfigProvider === 'OneDrive'
                      ? 'bg-sky-600'
                      : 'bg-blue-700'
                  }`}
                >
                  {selectedConfigProvider === 'SharePoint' ? 'SP' : selectedConfigProvider === 'OneDrive' ? 'OD' : 'SAP'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    إعدادات وتوصيل {selectedConfigProvider === 'SharePoint' ? 'Microsoft SharePoint' : selectedConfigProvider === 'OneDrive' ? 'Microsoft OneDrive' : 'SAP S/4HANA OData'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    تعديل رابط المزامنة، مفاتيح التوثيق، واختبار الاتصال المباشر
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseConfig}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* Informative Explanation */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-950 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-indigo-900 block">كيف يعمل هذا الرابط؟</span>
                  <p className="text-indigo-800/90 leading-relaxed">
                    {selectedConfigProvider === 'SharePoint' &&
                      'يمكنك ربط رابط ملف Production_Master.xlsx المشترك داخل مكتبة مستندات SharePoint. إذا كان الرابط مباشراً (Direct download أو Anonymous Link) سيقوم النظام بتحميل وتفريغ السيريالات الحية فوراً، وفي حال غياب الرابط سيستخدم نموذج المحاكاة الافتراضي.'}
                    {selectedConfigProvider === 'OneDrive' &&
                      'يمكنك ربط رابط ملف إكسيل خطوط الإنتاج المشترك على OneDrive Business. يدعم النظام روابط التحميل المباشرة وروابط المشاركة التلقائية.'}
                    {selectedConfigProvider === 'SAP' &&
                      'يمكنك ربط نقطة نهاية SAP S/4HANA OData v2/v4 لجدول أوامر الإنتاج (API_PRODUCTION_ORDER_2_SRV) مع تزويد بيانات Basic Auth أو Bearer Token لسحب أوامر الشغل المعتمدة.'}
                  </p>
                </div>
              </div>

              {/* Status / Save Notice */}
              {configSaveNotice && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${
                    configSaveNotice.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {configSaveNotice.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="font-bold">{configSaveNotice.text}</span>
                </div>
              )}

              {/* Field: Sync URL */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    <span>رابط المزامنة المباشر (Sync Endpoint / File URL):</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {selectedConfigProvider === 'SAP' ? 'OData Endpoint URL' : 'Excel/CSV Direct Download Link'}
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={configUrl}
                    onChange={(e) => setConfigUrl(e.target.value)}
                    placeholder={
                      selectedConfigProvider === 'SharePoint'
                        ? 'https://your-domain.sharepoint.com/sites/.../Production_Master.xlsx'
                        : selectedConfigProvider === 'OneDrive'
                        ? 'https://1drv.ms/x/... or direct file link'
                        : 'https://s4hana-host:port/sap/opu/odata/sap/API_PRODUCTION_ORDER_2_SRV/A_ProductionOrder'
                    }
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-mono text-xs text-slate-900 dir-ltr text-left"
                  />
                  <button
                    onClick={handleTestConnection}
                    disabled={testingConnection || !configUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                    <span>{testingConnection ? 'جاري الاختبار...' : 'اختبار الرابط ⚡'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 اضغط على <strong>اختبار الرابط</strong> للتحقق الفوري من استجابة السيرفر ومعدل التأخير (Latency) دون الحاجة للمزامنة الكاملة.
                </p>
              </div>

              {/* Connection Test Result Card */}
              {testConnectionResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                    testConnectionResult.success
                      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/90 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold">
                      {testConnectionResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      )}
                      <span>{testConnectionResult.message}</span>
                    </div>
                    {testConnectionResult.latencyMs !== undefined && (
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white/80 border text-slate-700">
                        {testConnectionResult.latencyMs} ms
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1">
                    {testConnectionResult.status && (
                      <div>
                        <span>كود الاستجابة HTTP: </span>
                        <strong className="font-mono text-slate-900">{testConnectionResult.status}</strong>
                      </div>
                    )}
                    {testConnectionResult.contentType && (
                      <div>
                        <span>نوع المحتوى: </span>
                        <strong className="font-mono text-slate-900">{testConnectionResult.contentType}</strong>
                      </div>
                    )}
                    {testConnectionResult.error && (
                      <div className="text-rose-700 font-mono">
                        تفاصيل الخطأ: {testConnectionResult.error}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mode & Target File Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    وضع التشغيل المعتمد:
                  </label>
                  <select
                    value={configMode}
                    onChange={(e) => setConfigMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-xs bg-white text-slate-800 font-medium"
                  >
                    <option value="live_url">جلب حي ومباشر من الرابط (Live URL Fetch)</option>
                    <option value="simulated_fallback">
                      محاكاة مصنع Sleepee المعتمدة (Fallback Dataset)
                    </option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    إذا اخترت الرابط الحي وفشل الاتصال، سيعود تلقائياً لنموذج المحاكاة الآمن.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {selectedConfigProvider === 'SAP' ? 'اسم الكيان / OData Service:' : 'اسم الملف المستهدف:'}
                  </label>
                  <input
                    type="text"
                    value={configTargetFileName}
                    onChange={(e) => setConfigTargetFileName(e.target.value)}
                    placeholder={
                      selectedConfigProvider === 'SAP' ? 'API_PRODUCTION_ORDER_2_SRV' : 'Production_Master.xlsx'
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-xs font-mono text-slate-800"
                  />
                </div>
              </div>

              {/* Authentication Type & Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    طريقة التوثيق (Auth Type):
                  </label>
                  <select
                    value={configAuthType}
                    onChange={(e) => setConfigAuthType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-xs bg-white text-slate-800 font-medium"
                  >
                    <option value="anonymous_link">رابط عام / مشاركة مجهولة (Anonymous Download Link)</option>
                    <option value="bearer_token">Bearer Token (Header Authorization)</option>
                    <option value="basic_auth">Basic Auth (SAP Username & Password / API Key)</option>
                    <option value="graph_api">Microsoft Graph API Client Credentials</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-600" />
                    <span>مفتاح التوثيق / Token / Credentials:</span>
                  </label>
                  <input
                    type="password"
                    value={configToken}
                    onChange={(e) => setConfigToken(e.target.value)}
                    placeholder={
                      configAuthType === 'anonymous_link'
                        ? 'غير مطلوب للروابط العامة'
                        : configAuthType === 'basic_auth'
                        ? 'username:password'
                        : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                    }
                    disabled={configAuthType === 'anonymous_link'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-xs font-mono text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Operational Notes */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  ملاحظات التكامل ومسؤول النظام (Integration Notes):
                </label>
                <textarea
                  rows={2}
                  value={configNotes}
                  onChange={(e) => setConfigNotes(e.target.value)}
                  placeholder="سجل أي ملاحظات بخصوص صلاحيات المجلد أو بيئة SAP أو مسؤول الربط..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-xs text-slate-800 resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2">
              <button
                onClick={handleCloseConfig}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer text-center"
              >
                إغلاق
              </button>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => handleSaveConfig(false)}
                  disabled={savingConfig}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingConfig ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</span>
                </button>

                <button
                  onClick={() => handleSaveConfig(true)}
                  disabled={savingConfig || syncingSource !== null}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingSource !== null ? 'animate-spin' : ''}`} />
                  <span>حفظ وبدء المزامنة فوراً ⚡</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
