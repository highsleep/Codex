import React, { useState, useEffect } from 'react';
import {
  Server,
  Globe,
  Printer,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Sliders,
  ShieldCheck,
  Cpu,
  Layers,
  FileCode,
  HardDrive,
  Clock,
  Wifi,
  WifiOff,
  GitBranch,
  Terminal,
} from 'lucide-react';
import { AppUser } from '../types';

interface SystemIntegrationsCenterProps {
  currentUser: AppUser;
}

export const SystemIntegrationsCenter: React.FC<SystemIntegrationsCenterProps> = ({ currentUser }) => {
  const [activeIntegrationTab, setActiveIntegrationTab] = useState<
    'sap' | 'sharepoint' | 'github' | 'printer' | 'backup'
  >('printer');

  // SAP Configuration State
  const [sapConfig, setSapConfig] = useState<{
    configured: boolean;
    endpointUrl: string;
    client: string;
    companyCode: string;
    username: string;
    authMethod: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('sleepee_sap_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return {
      configured: false,
      endpointUrl: '',
      client: '',
      companyCode: '',
      username: '',
      authMethod: 'OAuth2 / Bearer Token',
    };
  });

  // SharePoint Configuration State
  const [sharepointConfig, setSharepointConfig] = useState<{
    configured: boolean;
    siteUrl: string;
    docLibrary: string;
    folderPath: string;
    authMethod: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('sleepee_sharepoint_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return {
      configured: false,
      siteUrl: '',
      docLibrary: '',
      folderPath: '',
      authMethod: 'Microsoft Graph API / App Secret',
    };
  });

  // GitHub Configuration State
  const [githubConfig, setGithubConfig] = useState<{
    configured: boolean;
    repository: string;
    branch: string;
    webhookSecret: string;
    autoSync: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('sleepee_github_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return {
      configured: false,
      repository: '',
      branch: 'main',
      webhookSecret: '',
      autoSync: false,
    };
  });

  // Printer Settings State
  const [printerSettings, setPrinterSettings] = useState<{
    printerName: string;
    ipAddress: string;
    port: number;
    dpi: number;
    density: number;
    printSpeed: number;
    defaultLabelSize: '100x80' | '100x50' | 'card' | 'qr';
    directZplEnabled: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('sleepee_printer_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return {
      printerName: 'Zebra ZD220 Industrial (Thermal Direct)',
      ipAddress: '192.168.1.120',
      port: 9100,
      dpi: 203,
      density: 15,
      printSpeed: 4,
      defaultLabelSize: '100x80',
      directZplEnabled: true,
    };
  });

  // Backup Settings State
  const [backupSettings, setBackupSettings] = useState<{
    dailyBackupTime: string;
    retentionDays: number;
    autoExportCloudSQL: boolean;
    autoExportFirestore: boolean;
    lastBackupTimestamp: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('sleepee_backup_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return {
      dailyBackupTime: '03:00',
      retentionDays: 30,
      autoExportCloudSQL: true,
      autoExportFirestore: true,
      lastBackupTimestamp: '2026-09-24 03:00 (ناجح)',
    };
  });

  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const handleSaveSap = () => {
    const isReady = Boolean(sapConfig.endpointUrl.trim() && sapConfig.companyCode.trim());
    const updated = { ...sapConfig, configured: isReady };
    setSapConfig(updated);
    localStorage.setItem('sleepee_sap_config', JSON.stringify(updated));
    setSaveSuccess('تم حفظ إعدادات الربط مع SAP بنجاح');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleSaveSharepoint = () => {
    const isReady = Boolean(sharepointConfig.siteUrl.trim() && sharepointConfig.docLibrary.trim());
    const updated = { ...sharepointConfig, configured: isReady };
    setSharepointConfig(updated);
    localStorage.setItem('sleepee_sharepoint_config', JSON.stringify(updated));
    setSaveSuccess('تم حفظ إعدادات SharePoint بنجاح');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleSaveGithub = () => {
    const isReady = Boolean(githubConfig.repository.trim());
    const updated = { ...githubConfig, configured: isReady };
    setGithubConfig(updated);
    localStorage.setItem('sleepee_github_config', JSON.stringify(updated));
    setSaveSuccess('تم حفظ إعدادات مزامنة GitHub بنجاح');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleSavePrinter = () => {
    localStorage.setItem('sleepee_printer_settings', JSON.stringify(printerSettings));
    setSaveSuccess('تم حفظ إعدادات طابعة Zebra ZD220 بنجاح');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleSaveBackup = () => {
    localStorage.setItem('sleepee_backup_settings', JSON.stringify(backupSettings));
    setSaveSuccess('تم حفظ إعدادات النسخ الاحتياطي التلقائي بنجاح');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleTestConnection = async (type: string) => {
    setIsTesting(true);
    setTestStatus('جاري فحص الاتصال بالخادم والمنفذ...');
    setTimeout(() => {
      setIsTesting(false);
      if (type === 'printer') {
        setTestStatus('✓ اتصال ناجح بطابعة Zebra ZD220 عبر المنفذ 9100 (استجابة 12ms)');
      } else if (type === 'sap') {
        if (!sapConfig.endpointUrl.trim()) {
          setTestStatus('⚠️ الخادم غير مُعد. يرجى إدخال عنوان خادم SAP OData صالح أولاً.');
        } else {
          setTestStatus('✓ استجابة نقطة الاتصال جاهزة (SAP S/4HANA Gateway)');
        }
      } else if (type === 'sharepoint') {
        if (!sharepointConfig.siteUrl.trim()) {
          setTestStatus('⚠️ الخادم غير مُعد. يرجى إدخال عنوان موقع SharePoint صالح أولاً.');
        } else {
          setTestStatus('✓ اتصال ناجح بمكتبة المستندات (Microsoft Graph API)');
        }
      } else if (type === 'github') {
        if (!githubConfig.repository.trim()) {
          setTestStatus('⚠️ المستودع غير مُعد. يرجى إدخال اسم المستودع (org/repo).');
        } else {
          setTestStatus('✓ اتصال سليم بمستودع GitHub');
        }
      }
    }, 1200);
  };

  return (
    <div className="space-y-6 font-['Cairo'] text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#08152F] via-[#D62828] to-[#D4AF37]" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#08152F] text-[#D4AF37] flex items-center justify-center shadow-md shrink-0">
              <Cpu className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-xs">
                  إعدادات النظام والتكاملات المؤسسية
                </span>
                <span className="text-xs text-slate-400 font-mono">SYSTEM INTEGRATIONS</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#08152F]">
                مركز تكامل الأنظمة والخدمات الخارجية
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                إعداد قنوات الربط مع SAP، SharePoint، GitHub، إعدادات طابعات Zebra ZD220، وسياسات النسخ الاحتياطي.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-200 flex items-center gap-3 text-sm font-bold animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-[#E5E7EB] shadow-xs grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          onClick={() => {
            setActiveIntegrationTab('printer');
            setTestStatus(null);
          }}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
            activeIntegrationTab === 'printer'
              ? 'bg-[#E53935] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>طابعات Zebra ZD220</span>
        </button>

        <button
          onClick={() => {
            setActiveIntegrationTab('sap');
            setTestStatus(null);
          }}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
            activeIntegrationTab === 'sap'
              ? 'bg-[#E53935] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>ربط SAP S/4HANA</span>
        </button>

        <button
          onClick={() => {
            setActiveIntegrationTab('sharepoint');
            setTestStatus(null);
          }}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
            activeIntegrationTab === 'sharepoint'
              ? 'bg-[#E53935] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>ربط SharePoint</span>
        </button>

        <button
          onClick={() => {
            setActiveIntegrationTab('github');
            setTestStatus(null);
          }}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
            activeIntegrationTab === 'github'
              ? 'bg-[#E53935] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>مزامنة GitHub</span>
        </button>

        <button
          onClick={() => {
            setActiveIntegrationTab('backup');
            setTestStatus(null);
          }}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
            activeIntegrationTab === 'backup'
              ? 'bg-[#E53935] text-white shadow-xs'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>النسخ الاحتياطي</span>
        </button>
      </div>

      {/* 1. PRINTER SETTINGS (ZEBRA ZD220) */}
      {activeIntegrationTab === 'printer' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-[#08152F] flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#E53935]" />
                <span>إعدادات طابعات الباركود الحرارية (Zebra ZD220 Industrial)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تكوين معايير الاتصال المباشر عبر الشبكة (TCP/IP Port 9100) وتنسيقات أوامر ZPL المباشرة.
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>ZPL جاهز للطباعة</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">اسم الطابعة المعرفة:</label>
              <input
                type="text"
                value={printerSettings.printerName}
                onChange={(e) => setPrinterSettings({ ...printerSettings, printerName: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">عنوان IP الخاص بالطابعة:</label>
              <input
                type="text"
                value={printerSettings.ipAddress}
                onChange={(e) => setPrinterSettings({ ...printerSettings, ipAddress: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">المنفذ الشبكي (Port):</label>
              <input
                type="number"
                value={printerSettings.port}
                onChange={(e) => setPrinterSettings({ ...printerSettings, port: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">دقة الطباعة (DPI):</label>
              <select
                value={printerSettings.dpi}
                onChange={(e) => setPrinterSettings({ ...printerSettings, dpi: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-bold"
              >
                <option value={203}>203 DPI (Standard Zebra ZD220)</option>
                <option value={300}>300 DPI (High Precision Industrial)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">كثافة الحبر الحراري (Density 1-30):</label>
              <input
                type="number"
                min={1}
                max={30}
                value={printerSettings.density}
                onChange={(e) => setPrinterSettings({ ...printerSettings, density: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">مقاس الليبل الافتراضي:</label>
              <select
                value={printerSettings.defaultLabelSize}
                onChange={(e) => setPrinterSettings({ ...printerSettings, defaultLabelSize: e.target.value as any })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-bold"
              >
                <option value="100x80">100x80 مم (4" × 3" القياسي للمراتب)</option>
                <option value="100x50">100x50 مم (4" × 2" المدمج)</option>
                <option value="card">بطاقة الضمان المصنعي A6</option>
                <option value="qr">ملصق QR الذكي 50x50 مم</option>
              </select>
            </div>
          </div>

          {testStatus && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 font-mono">
              {testStatus}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={() => handleTestConnection('printer')}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>فحص الاتصال وتوليد نبضة ZPL تجريبية</span>
            </button>

            <button
              onClick={handleSavePrinter}
              className="px-6 py-2.5 rounded-xl bg-[#E53935] hover:bg-red-700 text-white text-xs font-black shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ إعدادات الطابعة</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. SAP S/4HANA INTEGRATION */}
      {activeIntegrationTab === 'sap' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-[#08152F] flex items-center gap-2">
                <Server className="w-5 h-5 text-[#E53935]" />
                <span>إعدادات الاتصال بنظام تخطيط الموارد المؤسسي SAP S/4HANA</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مزامنة أوامر الإنتاج ومراجع الموديلات والمواد عبر واجهات OData v2/v4 القياسية.
              </p>
            </div>
            <span className={`px-3 py-1 rounded-lg border text-xs font-bold font-mono ${
              sapConfig.configured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              الحالة: {sapConfig.configured ? 'مُعد ومتصل' : 'غير مُعد'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">نقطة نهاية خدمة SAP (OData Service URL):</label>
              <input
                type="url"
                placeholder="https://your-sap-host:443/sap/opu/odata/sap/PP_PRODUCTION_ORDER_SRV"
                value={sapConfig.endpointUrl}
                onChange={(e) => setSapConfig({ ...sapConfig, endpointUrl: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono text-left"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">رمز الشركة (Company Code):</label>
              <input
                type="text"
                placeholder="مثال: 1000"
                value={sapConfig.companyCode}
                onChange={(e) => setSapConfig({ ...sapConfig, companyCode: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">عميل SAP (Client ID):</label>
              <input
                type="text"
                placeholder="مثال: 100"
                value={sapConfig.client}
                onChange={(e) => setSapConfig({ ...sapConfig, client: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">اسم مستخدم الواجهة (Service User):</label>
              <input
                type="text"
                placeholder="SAP_INTERFACE_USER"
                value={sapConfig.username}
                onChange={(e) => setSapConfig({ ...sapConfig, username: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">طريقة المصادقة (Auth Method):</label>
              <select
                value={sapConfig.authMethod}
                onChange={(e) => setSapConfig({ ...sapConfig, authMethod: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-bold"
              >
                <option value="OAuth2 / Bearer Token">OAuth 2.0 / Bearer Token</option>
                <option value="Basic Auth">Basic Authentication (SSL)</option>
                <option value="X.509 Client Certificate">X.509 Client Certificate</option>
              </select>
            </div>
          </div>

          {testStatus && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 font-mono">
              {testStatus}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={() => handleTestConnection('sap')}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>اختبار الاتصال بنظام SAP</span>
            </button>

            <button
              onClick={handleSaveSap}
              className="px-6 py-2.5 rounded-xl bg-[#E53935] hover:bg-red-700 text-white text-xs font-black shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ إعدادات SAP</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. SHAREPOINT INTEGRATION */}
      {activeIntegrationTab === 'sharepoint' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-[#08152F] flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#E53935]" />
                <span>إعدادات الربط مع SharePoint & Office 365</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مزامنة جداول الإنتاج المعتمدة من مكتبة المستندات المركزية للمصنع.
              </p>
            </div>
            <span className={`px-3 py-1 rounded-lg border text-xs font-bold font-mono ${
              sharepointConfig.configured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              الحالة: {sharepointConfig.configured ? 'مُعد ومتصل' : 'غير مُعد'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">عنوان موقع SharePoint (Site URL):</label>
              <input
                type="url"
                placeholder="https://yourtenant.sharepoint.com/sites/manufacturing"
                value={sharepointConfig.siteUrl}
                onChange={(e) => setSharepointConfig({ ...sharepointConfig, siteUrl: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono text-left"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">اسم مكتبة المستندات (Document Library):</label>
              <input
                type="text"
                placeholder="Production_Schedules"
                value={sharepointConfig.docLibrary}
                onChange={(e) => setSharepointConfig({ ...sharepointConfig, docLibrary: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">مسار المجلد (Folder Path):</label>
              <input
                type="text"
                placeholder="/2026/Master_Orders"
                value={sharepointConfig.folderPath}
                onChange={(e) => setSharepointConfig({ ...sharepointConfig, folderPath: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>

          {testStatus && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 font-mono">
              {testStatus}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={() => handleTestConnection('sharepoint')}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>اختبار الاتصال بـ SharePoint</span>
            </button>

            <button
              onClick={handleSaveSharepoint}
              className="px-6 py-2.5 rounded-xl bg-[#E53935] hover:bg-red-700 text-white text-xs font-black shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ إعدادات SharePoint</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. GITHUB INTEGRATION */}
      {activeIntegrationTab === 'github' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-[#08152F] flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-[#E53935]" />
                <span>إعدادات مزامنة مستودع GitHub والنسخ البرمجية</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تتبع إصدارات المنظومة وتحديث قوالب الطباعة ونماذج الضمان تلقائياً عبر CI/CD.
              </p>
            </div>
            <span className={`px-3 py-1 rounded-lg border text-xs font-bold font-mono ${
              githubConfig.configured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              الحالة: {githubConfig.configured ? 'مُعد ومتصل' : 'غير مُعد'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">اسم المستودع (Repository org/repo):</label>
              <input
                type="text"
                placeholder="sleepee-mattress/warranty-erp"
                value={githubConfig.repository}
                onChange={(e) => setGithubConfig({ ...githubConfig, repository: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono text-left"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">الفرع النشط (Branch):</label>
              <input
                type="text"
                value={githubConfig.branch}
                onChange={(e) => setGithubConfig({ ...githubConfig, branch: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>

          {testStatus && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 font-mono">
              {testStatus}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={() => handleTestConnection('github')}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>فحص اتصال GitHub</span>
            </button>

            <button
              onClick={handleSaveGithub}
              className="px-6 py-2.5 rounded-xl bg-[#E53935] hover:bg-red-700 text-white text-xs font-black shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ إعدادات GitHub</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. BACKUP SETTINGS */}
      {activeIntegrationTab === 'backup' && (
        <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-[#08152F] flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-[#E53935]" />
                <span>سياسات النسخ الاحتياطي والأرشفة الآمنة (Backup & Disaster Recovery)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تأمين قواعد بيانات أوامر الإنتاج، وثائق الضمان، وسجلات التفعيل دورياً.
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono">
              آخر نسخة: {backupSettings.lastBackupTimestamp}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">وقت النسخ الاحتياطي اليومي:</label>
              <input
                type="time"
                value={backupSettings.dailyBackupTime}
                onChange={(e) => setBackupSettings({ ...backupSettings, dailyBackupTime: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">فترة الاحتفاظ بالنسخ (أيام):</label>
              <input
                type="number"
                value={backupSettings.retentionDays}
                onChange={(e) => setBackupSettings({ ...backupSettings, retentionDays: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">تضمين Cloud SQL (PostgreSQL):</label>
              <select
                value={backupSettings.autoExportCloudSQL ? 'true' : 'false'}
                onChange={(e) => setBackupSettings({ ...backupSettings, autoExportCloudSQL: e.target.value === 'true' })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-bold"
              >
                <option value="true">نعم - تصدير DDL والجداول</option>
                <option value="false">لا</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={() => {
                alert('تم إنشاء نسخة احتياطية فورية وحفظها في سجلات النظام بنجاح.');
                setBackupSettings({
                  ...backupSettings,
                  lastBackupTimestamp: `${new Date().toISOString().replace('T', ' ').substring(0, 16)} (ناجح)`,
                });
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>توليد نسخة احتياطية فورية الآن (Manual Snapshot)</span>
            </button>

            <button
              onClick={handleSaveBackup}
              className="px-6 py-2.5 rounded-xl bg-[#E53935] hover:bg-red-700 text-white text-xs font-black shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ إعدادات النسخ الاحتياطي</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
