import React, { useState, useEffect } from 'react';
import {
  Database,
  ShieldAlert,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calendar,
  Layers,
  FileJson,
  Check,
  Play,
  FileText,
  Clock,
  User,
  ExternalLink,
  HelpCircle,
  TrendingUp,
  Award,
  BarChart2
} from 'lucide-react';
import { AppUser } from '../types';
import { PowerBIIntegrationHub } from './PowerBIIntegrationHub';

interface DatabaseManagementCenterProps {
  currentUser: AppUser;
}

interface KPIStats {
  completeness: number;
  integrity: number;
  traceability: number;
  warrantyLinkage: number;
  attachmentCoverage: number;
  trends: Array<{
    month: string;
    completeness: number;
    integrity: number;
    traceability: number;
    linkage: number;
    attachments: number;
  }>;
}

interface HealthData {
  metrics: {
    totalProducts: number;
    totalWarranties: number;
    totalClaims: number;
    totalReplacements: number;
    totalAttachments: number;
    totalLifecycleEvents: number;
  };
  indicators: {
    brokenReferences: { count: number; status: 'Healthy' | 'Warning' | 'Critical' };
    orphanRecords: { count: number; status: 'Healthy' | 'Warning' | 'Critical' };
    duplicateSerials: { count: number; status: 'Healthy' | 'Warning' | 'Critical' };
    duplicateWarranties: { count: number; status: 'Healthy' | 'Warning' | 'Critical' };
    missingLifecycles: { count: number; status: 'Healthy' | 'Warning' | 'Critical' };
    missingAttachments: { count: number; status: 'Healthy' | 'Warning' | 'Critical' };
  };
}

interface AuditIssue {
  id: string;
  category: string;
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  entity_id: string;
  entity_type: string;
  impact: string;
  suggestion: string;
}

interface SyncSourceState {
  source: string;
  lastSync: string;
  recordsImported: number;
  status: 'Healthy' | 'Warning' | 'Critical';
  failedImports: number;
  syncUrl: string;
  mode: string;
}

interface AuditTrailItem {
  id: string;
  timestamp: string;
  type: string;
  typeAr: string;
  entityId: string;
  performedBy: string;
  description: string;
  refNum: string;
}

export const DatabaseManagementCenter: React.FC<DatabaseManagementCenterProps> = ({ currentUser }) => {
  // Global states
  const [activeSubTab, setActiveSubTab] = useState<'databases' | 'bi_intel' | 'backup_restore' | 'system_logs'>('databases');
  const [databasesSubSection, setDatabasesSubSection] = useState<'health_kpi' | 'sql_schema' | 'audit_repair'>('health_kpi');
  const [schemaSql, setSchemaSql] = useState<string>('');
  const [kpis, setKpis] = useState<KPIStats | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [auditIssues, setAuditIssues] = useState<AuditIssue[]>([]);
  const [syncSources, setSyncSources] = useState<SyncSourceState[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Filter states for Audit Trail Explorer
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchEntityType, setSearchEntityType] = useState<string>('All');
  const [searchUser, setSearchUser] = useState<string>('');
  const [searchStartDate, setSearchStartDate] = useState<string>('');
  const [searchEndDate, setSearchEndDate] = useState<string>('');

  // Repair states
  const [repairAction, setRepairAction] = useState<string>('repair_broken_references');
  const [repairPreview, setRepairPreview] = useState<boolean>(true);
  const [repairResult, setRepairResult] = useState<{
    success: boolean;
    preview: boolean;
    repairsCount: number;
    logs: string[];
    message: string;
  } | null>(null);

  // Backup states
  const [backupLogs, setBackupLogs] = useState<Array<{
    date: string;
    size: string;
    type: string;
    createdBy: string;
  }>>([
    {
      date: new Date().toISOString().split('T')[0],
      size: '142 KB',
      type: 'JSON Backup Archive',
      createdBy: currentUser.name
    }
  ]);

  // Load Data
  const fetchKPIs = async () => {
    try {
      const res = await fetch('/api/db-center/kpis');
      if (res.ok) {
        const data = await res.json();
        setKpis(data);
      }
    } catch (e) {
      console.error('Error fetching KPIs', e);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/db-center/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (e) {
      console.error('Error fetching Health data', e);
    }
  };

  const fetchAuditIssues = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/db-center/audit', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAuditIssues(data);
      }
    } catch (e) {
      console.error('Error fetching Audit Issues', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncSources = async () => {
    try {
      const res = await fetch('/api/db-center/sync-status');
      if (res.ok) {
        const data = await res.json();
        setSyncSources(data);
      }
    } catch (e) {
      console.error('Error fetching sync sources', e);
    }
  };

  const fetchAuditTrail = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (searchEntityType && searchEntityType !== 'All') params.append('entityType', searchEntityType);
      if (searchUser) params.append('user', searchUser);
      if (searchStartDate) params.append('startDate', searchStartDate);
      if (searchEndDate) params.append('endDate', searchEndDate);

      const res = await fetch(`/api/db-center/audit-trail?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAuditTrail(data);
      }
    } catch (e) {
      console.error('Error fetching Audit Trail', e);
    } finally {
      setLoading(false);
    }
  };

  // Initial Preloads
  useEffect(() => {
    fetchKPIs();
    fetchHealth();
    fetchSyncSources();
    fetch('/api/db/schema')
      .then(res => res.ok ? res.text() : '')
      .then(text => setSchemaSql(text))
      .catch(err => console.error('Error fetching schema DDL:', err));
  }, []);

  useEffect(() => {
    if (activeSubTab === 'system_logs') {
      fetchAuditTrail();
    } else if (activeSubTab === 'databases') {
      fetchAuditIssues();
    }
  }, [activeSubTab]);

  // Repair Action Execution
  const executeRepair = async () => {
    setActionLoading(true);
    setRepairResult(null);
    try {
      const res = await fetch('/api/db-center/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: repairAction,
          preview: repairPreview,
          actor: currentUser.name
        })
      });
      if (res.ok) {
        const data = await res.json();
        setRepairResult(data);
        // Refresh statistics if actual repair was executed
        if (!repairPreview) {
          fetchKPIs();
          fetchHealth();
        }
      }
    } catch (e) {
      console.error('Error running repair center action', e);
    } finally {
      setActionLoading(false);
    }
  };

  // Backups Execution
  const handleJSONBackupDownload = async () => {
    try {
      const res = await fetch('/api/powerbi/feed');
      if (res.ok) {
        const data = await res.json();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sleepee_master_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Add to UI backup list log
        const sizeStr = `${(jsonStr.length / 1024).toFixed(1)} KB`;
        setBackupLogs(prev => [
          {
            date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            size: sizeStr,
            type: 'JSON Database State',
            createdBy: currentUser.name
          },
          ...prev
        ]);
      }
    } catch (e) {
      alert('خطأ أثناء تصدير نسخة JSON احتياطية');
    }
  };

  const handlePostgresMetadataDownload = async () => {
    try {
      const res = await fetch('/api/db/schema');
      const text = res.ok ? await res.text() : '-- SQL schema extraction fallback';
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sleepee_postgresql_schema_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setBackupLogs(prev => [
        {
          date: new Date().toISOString().slice(0, 19).replace('T', ' '),
          size: `${(text.length / 1024).toFixed(1)} KB`,
          type: 'PostgreSQL DDL Schema',
          createdBy: currentUser.name
        },
        ...prev
      ]);
    } catch (e) {
      alert('خطأ أثناء تصدير ملف هيكلية PostgreSQL');
    }
  };

  // Sync refresh mock
  const handleSyncRefresh = async () => {
    setActionLoading(true);
    setTimeout(async () => {
      await fetchSyncSources();
      setActionLoading(false);
    }, 1200);
  };

  // Helper function for Health status classes
  const getStatusClasses = (status: 'Healthy' | 'Warning' | 'Critical') => {
    if (status === 'Healthy') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (status === 'Warning') return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-rose-50 text-rose-800 border-rose-200';
  };

  const getStatusTextAr = (status: 'Healthy' | 'Warning' | 'Critical') => {
    if (status === 'Healthy') return 'سليم (Healthy)';
    if (status === 'Warning') return 'تحذير (Warning)';
    return 'حرج (Critical)';
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Sub-Header Banner */}
      <div className="bg-gradient-to-r from-rose-900 via-slate-900 to-black p-6 rounded-3xl border border-[#E5E7EB] shadow-xs relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Database className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black border border-rose-500/30">
                بيانات آمنة وموثوقة
              </span>
              <span className="text-xs font-semibold text-slate-300">
                المحرك النشط: JsonApplicationRepository (مؤمن بقفل الفهارس وقرارات السلامة)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Cairo'] mt-2">
              مركز إدارة وتدقيق سلامة البيانات
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              شاشة الإدارة الفائقة والمسؤولة عن فحص اتساق البيانات، وإصلاح المراجع المعلقة، واستيراد ومعاينة خطوط التكامل ومزامنة الأنظمة السحابية (SAP, SharePoint, OneDrive).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchKPIs();
                fetchHealth();
                fetchSyncSources();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
              <span>تحديث البيانات الإحصائية</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Sidebar & Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-1">
          <p className="text-[11px] text-slate-400 font-bold px-3 pb-2 pt-1 border-b border-slate-100 mb-2">
            أقسام إدارة البيانات المعتمدة
          </p>

          <button
            onClick={() => setActiveSubTab('databases')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-black transition cursor-pointer ${
              activeSubTab === 'databases'
                ? 'bg-rose-50 text-rose-950 border-r-4 border-rose-600 font-black'
                : 'text-slate-600 hover:bg-[#F5F5F5] hover:text-[#111111]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-rose-600" />
              <span>قواعد البيانات</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
              نشط
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('bi_intel')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-black transition cursor-pointer ${
              activeSubTab === 'bi_intel'
                ? 'bg-rose-50 text-rose-950 border-r-4 border-rose-600 font-black'
                : 'text-slate-600 hover:bg-[#F5F5F5] hover:text-[#111111]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BarChart2 className="w-4 h-4 text-rose-600" />
              <span>ذكاء الأعمال</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
              Power BI
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('backup_restore')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-black transition cursor-pointer ${
              activeSubTab === 'backup_restore'
                ? 'bg-rose-50 text-rose-950 border-r-4 border-rose-600 font-black'
                : 'text-slate-600 hover:bg-[#F5F5F5] hover:text-[#111111]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileJson className="w-4 h-4 text-rose-600" />
              <span>النسخ الاحتياطي</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
              آمن
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('system_logs')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-black transition cursor-pointer ${
              activeSubTab === 'system_logs'
                ? 'bg-rose-50 text-rose-950 border-r-4 border-rose-600 font-black'
                : 'text-slate-600 hover:bg-[#F5F5F5] hover:text-[#111111]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-rose-600" />
              <span>سجلات النظام</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
              تدقيق
            </span>
          </button>
        </div>

        {/* Action Panel Content */}
        <div className="lg:col-span-9 bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs">

          {/* Sub-navigation bar for Databases tab */}
          {activeSubTab === 'databases' && (
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3 mb-6">
              <button
                onClick={() => setDatabasesSubSection('health_kpi')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  databasesSubSection === 'health_kpi'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-[#F5F5F5] hover:text-[#111111]'
                }`}
              >
                لوحة السلامة والمؤشرات
              </button>
              <button
                onClick={() => setDatabasesSubSection('sql_schema')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  databasesSubSection === 'sql_schema'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-[#F5F5F5] hover:text-[#111111]'
                }`}
              >
                مخطط قاعدة البيانات (Cloud SQL DDL)
              </button>
              <button
                onClick={() => setDatabasesSubSection('audit_repair')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  databasesSubSection === 'audit_repair'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-[#F5F5F5] hover:text-[#111111]'
                }`}
              >
                فحص وإصلاح الاتساق والمزامنة
              </button>
            </div>
          )}
          
          {/* SECTION 7: EXECUTIVE DATA QUALITY KPIS */}
          {activeSubTab === 'databases' && databasesSubSection === 'health_kpi' && kpis && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
                  <Award className="w-5 h-5 text-rose-600" />
                  <span>مؤشرات جودة واكتمال قواعد البيانات التنفيذية</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  حسابات دقيقة لحجم حقول البيانات المستكملة، اتساق ترابط المفاتيح الأجنبية وقابلية تتبع دورة الحياة الشاملة.
                </p>
              </div>

              {/* Grid of KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                  <span className="text-[11px] text-slate-500 font-bold block">اكتمال البيانات %</span>
                  <div className="text-3xl font-black text-indigo-700 font-mono mt-1">{kpis.completeness}%</div>
                  <span className="text-[10px] text-slate-400 block mt-1">تعبئة الحقول الأساسية</span>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                  <span className="text-[11px] text-slate-500 font-bold block">سلامة الترابط %</span>
                  <div className="text-3xl font-black text-emerald-600 font-mono mt-1">{kpis.integrity}%</div>
                  <span className="text-[10px] text-slate-400 block mt-1">اتصال المفاتيح والأرقام</span>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                  <span className="text-[11px] text-slate-500 font-bold block">مؤشر التتبع واللوجستيات</span>
                  <div className="text-3xl font-black text-rose-700 font-mono mt-1">{kpis.traceability}%</div>
                  <span className="text-[10px] text-slate-400 block mt-1">أحداث دورة حياة المنتج</span>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                  <span className="text-[11px] text-slate-500 font-bold block">ربط الضمان بالمنتج</span>
                  <div className="text-3xl font-black text-blue-700 font-mono mt-1">{kpis.warrantyLinkage}%</div>
                  <span className="text-[10px] text-slate-400 block mt-1">تفعيل مطابق للمصنع</span>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                  <span className="text-[11px] text-slate-500 font-bold block">تغطية مرفقات الشكاوى</span>
                  <div className="text-3xl font-black text-amber-700 font-mono mt-1">{kpis.attachmentCoverage}%</div>
                  <span className="text-[10px] text-slate-400 block mt-1">بلاغات بصور فحص فني</span>
                </div>
              </div>

              {/* Trends Table */}
              <div className="mt-4">
                <h4 className="text-xs font-black text-slate-800 mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>تطور مؤشر جودة البيانات في النصف السنوي الأخير</span>
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 font-bold text-slate-700">الشهر</th>
                        <th className="p-3 font-bold text-slate-700 text-center">اكتمال البيانات</th>
                        <th className="p-3 font-bold text-slate-700 text-center">سلامة الترابط</th>
                        <th className="p-3 font-bold text-slate-700 text-center">مؤشر التتبع</th>
                        <th className="p-3 font-bold text-slate-700 text-center">ربط الضمان</th>
                        <th className="p-3 font-bold text-slate-700 text-center">تغطية المرفقات</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono divide-y divide-slate-100">
                      {kpis.trends.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900 font-['Cairo']">{t.month}</td>
                          <td className="p-3 text-center text-indigo-700 font-semibold">{t.completeness}%</td>
                          <td className="p-3 text-center text-emerald-600 font-semibold">{t.integrity}%</td>
                          <td className="p-3 text-center text-rose-600 font-semibold">{t.traceability}%</td>
                          <td className="p-3 text-center text-blue-600 font-semibold">{t.linkage}%</td>
                          <td className="p-3 text-center text-amber-600 font-semibold">{t.attachments}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 1: DATA HEALTH CENTER */}
          {activeSubTab === 'databases' && databasesSubSection === 'health_kpi' && health && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-rose-600" />
                  <span>لوحة قياس الصحة والكميات الإجمالية لقواعد البيانات</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  إحصائيات فورية لعدد القيود النشطة بالإضافة إلى الكشف التلقائي عن السجلات المعلقة أو المكررة.
                </p>
              </div>

              {/* Total Metrics Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">إجمالي المنتجات</span>
                  <span className="text-2xl font-black text-slate-950 font-mono block mt-1">{health.metrics.totalProducts}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">وثائق الضمان</span>
                  <span className="text-2xl font-black text-indigo-700 font-mono block mt-1">{health.metrics.totalWarranties}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">شكاوى ومطالبات</span>
                  <span className="text-2xl font-black text-rose-600 font-mono block mt-1">{health.metrics.totalClaims}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">أذونات الاستبدال</span>
                  <span className="text-2xl font-black text-amber-600 font-mono block mt-1">{health.metrics.totalReplacements}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">ملفات مرفقة</span>
                  <span className="text-2xl font-black text-blue-600 font-mono block mt-1">{health.metrics.totalAttachments}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">أحداث دورة الحياة</span>
                  <span className="text-2xl font-black text-emerald-600 font-mono block mt-1">{health.metrics.totalLifecycleEvents}</span>
                </div>
              </div>

              {/* Indicators */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 pt-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>مؤشرات سلامة واكتشاف الأخطاء اللوجستية والمرجعية</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Broken References */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${getStatusClasses(health.indicators.brokenReferences.status)}`}>
                    <div>
                      <span className="text-xs font-black block">الارتباطات المكسورة واليتيمة</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">مراجع تشير إلى مفاتيح أو سجلات غير موجودة</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-mono font-black block">{health.indicators.brokenReferences.count} قيد</span>
                      <span className="text-[9px] font-bold block">{getStatusTextAr(health.indicators.brokenReferences.status)}</span>
                    </div>
                  </div>

                  {/* Orphan Records */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${getStatusClasses(health.indicators.orphanRecords.status)}`}>
                    <div>
                      <span className="text-xs font-black block">سجلات يتيمة معلقة (Orphans)</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">منتجات بدون أي قيد حركة أو دورة حياة</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-mono font-black block">{health.indicators.orphanRecords.count} سجل</span>
                      <span className="text-[9px] font-bold block">{getStatusTextAr(health.indicators.orphanRecords.status)}</span>
                    </div>
                  </div>

                  {/* Duplicate Serial Numbers */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${getStatusClasses(health.indicators.duplicateSerials.status)}`}>
                    <div>
                      <span className="text-xs font-black block">تكرار الأرقام التسلسلية</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">مراتب مكررة الباركود في خطوط الإنتاج</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-mono font-black block">{health.indicators.duplicateSerials.count} باركود</span>
                      <span className="text-[9px] font-bold block">{getStatusTextAr(health.indicators.duplicateSerials.status)}</span>
                    </div>
                  </div>

                  {/* Duplicate Warranty IDs */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${getStatusClasses(health.indicators.duplicateWarranties.status)}`}>
                    <div>
                      <span className="text-xs font-black block">تكرار أرقام وثائق الضمان</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">وثائق تفعيل مكررة لنفس رقم الضمان</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-mono font-black block">{health.indicators.duplicateWarranties.count} وثيقة</span>
                      <span className="text-[9px] font-bold block">{getStatusTextAr(health.indicators.duplicateWarranties.status)}</span>
                    </div>
                  </div>

                  {/* Missing Lifecycle */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${getStatusClasses(health.indicators.missingLifecycles.status)}`}>
                    <div>
                      <span className="text-xs font-black block">أحداث تتبع لوجستي مفقودة</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">منتجات ينقصها حدث دورة حياة الإنتاج الأساسي</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-mono font-black block">{health.indicators.missingLifecycles.count} منتج</span>
                      <span className="text-[9px] font-bold block">{getStatusTextAr(health.indicators.missingLifecycles.status)}</span>
                    </div>
                  </div>

                  {/* Missing Attachments */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${getStatusClasses(health.indicators.missingAttachments.status)}`}>
                    <div>
                      <span className="text-xs font-black block">بلاغات بدون صور الفحص</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">شكاوى مغلقة أو Approved تفتقر لملفات ومرفقات فحص</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-mono font-black block">{health.indicators.missingAttachments.count} بلاغ</span>
                      <span className="text-[9px] font-bold block">{getStatusTextAr(health.indicators.missingAttachments.status)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: INTEGRITY AUDIT ENGINE */}
          {activeSubTab === 'databases' && databasesSubSection === 'audit_repair' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    <span>محرك التدقيق وفحص الاتساق الهيكلي للبيانات</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    إجراء فحص شامل وفوري لقواعد البيانات عبر 9 فحوصات مرجعية وزمنية معقدة.
                  </p>
                </div>
                <button
                  onClick={fetchAuditIssues}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-55"
                >
                  <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  <span>{loading ? 'جاري فحص قواعد البيانات...' : 'تشغيل الفحص الشامل'}</span>
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="w-8 h-8 text-rose-600 animate-spin mx-auto mb-3" />
                  <p className="text-xs text-slate-500 font-bold">جاري مراجعة وتحليل كافة الجداول ومطابقة القيود مع فهارس النظام المعتمدة...</p>
                </div>
              ) : auditIssues.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-emerald-200 bg-emerald-50 rounded-3xl">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                  <h4 className="text-sm font-black text-emerald-950 font-['Cairo']">تهانينا! قواعد البيانات متسقة بالكامل</h4>
                  <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
                    لا توجد أي ارتباطات مكسورة، حقول أساسية مفقودة، أو تناقضات في تواريخ المعاينات والصلاحية في الوقت الحالي.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-950 rounded-xl text-xs font-semibold">
                    تم العثور على عدد <span className="font-mono font-black text-rose-700">{auditIssues.length}</span> تباينات تحتاج لقرارات تصحيحية. استعن بمركز الإصلاح التلقائي لمعالجة التوافق الفوري.
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                          <th className="p-3 font-bold">المشكلة</th>
                          <th className="p-3 font-bold">الدرجة</th>
                          <th className="p-3 font-bold">التوصيف والتشخيص</th>
                          <th className="p-3 font-bold">الأثر التشغيلي</th>
                          <th className="p-3 font-bold">الحل المقترح</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditIssues.map((issue) => (
                          <tr key={issue.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                              <span className="font-mono text-slate-400 block text-[10px]">{issue.id}</span>
                              <span className="text-slate-800 block text-xs mt-0.5">{issue.category}</span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                issue.severity === 'High' ? 'bg-rose-100 text-rose-800' :
                                issue.severity === 'Medium' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {issue.severity === 'High' ? 'عالي' : issue.severity === 'Medium' ? 'متوسط' : 'منخفض'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700 leading-relaxed text-xs">
                              {issue.description}
                              <span className="font-mono text-slate-400 block text-[10px] mt-0.5">معرّف الكيان: {issue.entity_id} ({issue.entity_type})</span>
                            </td>
                            <td className="p-3 text-slate-500 font-medium">{issue.impact}</td>
                            <td className="p-3 text-indigo-900 font-bold">
                              {issue.suggestion}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: DATA REPAIR CENTER */}
          {activeSubTab === 'databases' && databasesSubSection === 'audit_repair' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-rose-600" />
                  <span>مركز معالجة واستصلاح سجلات قواعد البيانات الفوري</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  أدوات برمجية ذكية لإصلاح المراجع المعلقة، توليد أحداث التتبع والإنتاج وتعديل الروابط التالفة بأمان كامل وبأثر تراجعي.
                </p>
              </div>

              {/* Selection cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setRepairAction('repair_broken_references')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition text-right ${
                    repairAction === 'repair_broken_references'
                      ? 'border-rose-600 bg-rose-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-black block text-slate-900">إصلاح الارتباطات المكسورة واليتيمة</span>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    توليد سجلات أو مراتب رمزية افتراضية للأرقام التسلسلية المفقودة والتي ترتبط بها وثائق ضمان أو شكاوى مستهلكين سارية.
                  </p>
                </div>

                <div
                  onClick={() => setRepairAction('repair_missing_lifecycles')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition text-right ${
                    repairAction === 'repair_missing_lifecycles'
                      ? 'border-rose-600 bg-rose-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-black block text-slate-900">إصلاح وتوليد أحداث التتبع المفقودة</span>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    إدراج حدث الإنتاج (Produced) تلقائياً بناءً على تاريخ إنتاج المرتبة الفعلي للمنتجات التي لا تملك أي تاريخ لوجستي في سجلات التتبع.
                  </p>
                </div>

                <div
                  onClick={() => setRepairAction('repair_missing_warranty_links')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition text-right ${
                    repairAction === 'repair_missing_warranty_links'
                      ? 'border-rose-600 bg-rose-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-black block text-slate-900">مزامنة الشكاوى بوثائق تفعيل الضمان</span>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    البحث عن وثائق تفعيل الضمان النشطة وربط شكاوى العملاء بمرجع رقم الضمان الصحيح تلقائياً اعتماداً على الباركود المتطابق.
                  </p>
                </div>

                <div
                  onClick={() => setRepairAction('repair_missing_claim_links')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition text-right ${
                    repairAction === 'repair_missing_claim_links'
                      ? 'border-rose-600 bg-rose-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-black block text-slate-900">ربط أذونات الاستبدال بمطالبات العملاء</span>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    إعادة ربط أذونات استبدال المراتب بالشكاوى وبطاقات الضمان القديمة المقابلة لضمان الإغلاق الفني والمالي والتتبع السليم.
                  </p>
                </div>
              </div>

              {/* Modes Selection */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-700">وضع المعالجة:</span>
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="repair_preview_mode"
                      checked={repairPreview === true}
                      onChange={() => setRepairPreview(true)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>معاينة مسبقة فقط (Preview Mode)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer text-rose-700">
                    <input
                      type="radio"
                      name="repair_preview_mode"
                      checked={repairPreview === false}
                      onChange={() => setRepairPreview(false)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>تنفيذ الإصلاح الفعلي (Commit Changes)</span>
                  </label>
                </div>

                <button
                  onClick={executeRepair}
                  disabled={actionLoading}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/10 flex items-center gap-2 cursor-pointer transition disabled:opacity-60"
                >
                  <Play className="w-4 h-4 fill-white text-white" />
                  <span>{actionLoading ? 'جاري تنفيذ العملية...' : 'تشغيل محرك المعالجة'}</span>
                </button>
              </div>

              {/* Execution Results logs */}
              {repairResult && (
                <div className="space-y-3.5 pt-2">
                  <div className={`p-4 rounded-2xl border ${
                    repairResult.preview ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-xs">
                      {repairResult.preview ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <Check className="w-4 h-4 text-emerald-600" />}
                      <span>{repairResult.message}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-left">
                    <span className="text-[10px] text-slate-400 font-bold block mb-2 text-right">سجل خطوات وتفاصيل المعالجة الفورية للتغييرات:</span>
                    <pre className="text-emerald-400 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                      {repairResult.logs.length === 0 
                        ? '[] لا توجد سجلات تحتاج للاستصلاح التلقائي في هذا البند حالياً.' 
                        : repairResult.logs.map((log, idx) => `[${idx+1}] ${log}\n`).join('')}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: BACKUP CENTER */}
          {activeSubTab === 'backup_restore' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-rose-600" />
                  <span>مركز النسخ الاحتياطي وحفظ البيانات في الموقع</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  حفظ نسخة أرشيفية كاملة من الجداول وقواعد البيانات أو استخراج كود هيكلية PostgreSQL السحابي بأمان كامل.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export JSON Card */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 text-right">
                  <span className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 inline-block mb-3">
                    <FileJson className="w-5 h-5" />
                  </span>
                  <h4 className="text-sm font-black text-slate-900 font-['Cairo']">نسخة احتياطية شاملة (JSON)</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    استخراج كافة بيانات المراتب، وثائق الضمان الفعّلة، شكاوى المستهلكين، والمرفقات في ملف JSON موحد وصالح للاسترجاع الفوري.
                  </p>
                  <button
                    onClick={handleJSONBackupDownload}
                    className="mt-4 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>تصدير نسخة JSON احتياطية</span>
                  </button>
                </div>

                {/* Export SQL Card */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 text-right">
                  <span className="p-2.5 rounded-xl bg-rose-100 text-rose-700 inline-block mb-3">
                    <Database className="w-5 h-5" />
                  </span>
                  <h4 className="text-sm font-black text-slate-900 font-['Cairo']">كود هيكلية قواعد بيانات Cloud SQL</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    تحميل ملفات DDL والـ SQL Schema المعتمدة للجداول مع كامل قيود فهارس الترابط والباركود المناسبة لخوادم PostgreSQL السحابية.
                  </p>
                  <button
                    onClick={handlePostgresMetadataDownload}
                    className="mt-4 flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>تنزيل مخطط هيكلية SQL</span>
                  </button>
                </div>
              </div>

              {/* Metadata Scorecard */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                <h4 className="text-xs font-black text-slate-800 mb-3">سجل النسخ الاحتياطية التشغيلية التي تم توليدها مؤخراً:</h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-2.5 font-bold text-slate-700">تاريخ التوليد</th>
                        <th className="p-2.5 font-bold text-slate-700 text-center">حجم الملف</th>
                        <th className="p-2.5 font-bold text-slate-700">نوع وهيكل الأرشيف</th>
                        <th className="p-2.5 font-bold text-slate-700">المنشئ والمشرف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {backupLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-slate-900 text-xs">{log.date}</td>
                          <td className="p-2.5 text-center font-mono text-slate-600 font-bold">{log.size}</td>
                          <td className="p-2.5 text-slate-800 font-bold">{log.type}</td>
                          <td className="p-2.5 text-slate-500">{log.createdBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: SYNC MONITORING CENTER */}
          {activeSubTab === 'databases' && databasesSubSection === 'audit_repair' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
                    <Layers className="w-5 h-5 text-rose-600" />
                    <span>سجلات ومراقبة تكامل الأنظمة مع خطوط SAP السحابية</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    متابعة خطوط المزامنة المباشرة لاستيراد أوامر تشغيل المصنع ومطابقة الباركود مع SharePoint وOneDrive.
                  </p>
                </div>
                <button
                  onClick={handleSyncRefresh}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                  <span>{actionLoading ? 'جاري مزامنة خطوط SAP...' : 'مزامنة وتحديث الحالة الآن'}</span>
                </button>
              </div>

              {/* Sync Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <th className="p-3 font-bold">بوابة النظام / التكامل</th>
                      <th className="p-3 font-bold">آخر مزامنة ناجحة</th>
                      <th className="p-3 font-bold text-center">القيود المستوردة</th>
                      <th className="p-3 font-bold text-center">حالة الاتصال</th>
                      <th className="p-3 font-bold text-center">مزامنات فاشلة</th>
                      <th className="p-3 font-bold">عنوان التكامل السحابي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {syncSources.map((state) => (
                      <tr key={state.source} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{state.source}</td>
                        <td className="p-3 font-mono text-slate-600 text-xs">{new Date(state.lastSync).toLocaleString('ar-EG')}</td>
                        <td className="p-3 text-center font-mono text-slate-800 font-bold">{state.recordsImported} قيد</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${getStatusClasses(state.status)}`}>
                            {state.status === 'Healthy' ? 'نشط (Healthy)' : state.status === 'Warning' ? 'فوات مهلة' : 'خطأ اتصال'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-rose-600 font-bold">{state.failedImports}</td>
                        <td className="p-3 font-mono text-slate-400 text-xs truncate max-w-[180px]">{state.syncUrl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 8: BUSINESS BI INTEGRATION (POWER BI) */}
          {activeSubTab === 'bi_intel' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-lg font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-rose-600" />
                  <span>بوابة ذكاء الأعمال المدمجة وربط تقارير Power BI Desktop</span>
                </h3>
                <p className="text-xs text-slate-500">
                  اتصال وتصدير خطوط البيانات مباشرة إلى Microsoft Power BI لتصميم وعرض التقارير التفاعلية ومؤشرات الأداء.
                </p>
              </div>
              <PowerBIIntegrationHub onClose={undefined} isModal={false} />
            </div>
          )}

          {/* SECTION 6: AUDIT TRAIL EXPLORER */}
          {activeSubTab === 'system_logs' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
                  <Search className="w-5 h-5 text-rose-600" />
                  <span>مستكشف سجلات التدقيق والتغييرات الموحد (Audit Trail Explorer)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  محرك بحث شامل متصل بحدث تفعيل الضمان، شكاوى الجودة، أذونات الاستبدال ومستندات الفحص الفني.
                </p>
              </div>

              {/* Filters Panel */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Search query */}
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">كلمة البحث أو الباركود:</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SLP-2026..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>

                {/* Entity Type */}
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">نوع الكيان:</span>
                  <select
                    value={searchEntityType}
                    onChange={(e) => setSearchEntityType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="All">الكل (All)</option>
                    <option value="Warranty">تفعيل الضمان (Warranty)</option>
                    <option value="Claim">شكاوى وعيوب (Claim)</option>
                    <option value="Replacement">استبدال المراتب (Replacement)</option>
                    <option value="Lifecycle">دورة حياة المنتج (Lifecycle)</option>
                    <option value="Attachment">المستندات والصور (Attachment)</option>
                  </select>
                </div>

                {/* User performedBy */}
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">الموظف المسؤول:</span>
                  <input
                    type="text"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="اسم المسؤول..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">من تاريخ:</span>
                  <input
                    type="date"
                    value={searchStartDate}
                    onChange={(e) => setSearchStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>

                {/* End Date */}
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">إلى تاريخ:</span>
                  <input
                    type="date"
                    value={searchEndDate}
                    onChange={(e) => setSearchEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 shadow-2xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Run search button */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={fetchAuditTrail}
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/10 flex items-center gap-1.5 cursor-pointer transition disabled:opacity-65"
                >
                  <Search className="w-4 h-4" />
                  <span>{loading ? 'جاري الاستعلام وتصفية الأحداث...' : 'تطبيق التصفية والبحث'}</span>
                </button>
              </div>

              {/* Table list */}
              {loading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="w-7 h-7 text-rose-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-bold">جاري استرجاع سجلات التدقيق المطابقة للتصفية...</p>
                </div>
              ) : auditTrail.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                  <p className="text-xs text-slate-500 font-bold">لم يتم العثور على أي أحداث أو تفعيل مطابق لخيارات البحث المحددة.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                        <th className="p-3 font-bold">الحدث والتصنيف</th>
                        <th className="p-3 font-bold">التوقيت والتاريخ</th>
                        <th className="p-3 font-bold">معرّف المرجع الرئيسي</th>
                        <th className="p-3 font-bold">المشرف المسؤول</th>
                        <th className="p-3 font-bold">توصيف ووصف الإجراء الفني والتشغيلي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditTrail.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-mono text-slate-400 block text-[10px]">{item.id}</span>
                            <span className="text-slate-800 font-bold text-xs mt-0.5">{item.typeAr}</span>
                          </td>
                          <td className="p-3 font-mono text-slate-500 text-xs whitespace-nowrap">
                            {new Date(item.timestamp).toLocaleString('ar-EG')}
                          </td>
                          <td className="p-3 font-mono text-indigo-700 font-black text-xs whitespace-nowrap">
                            {item.entityId}
                          </td>
                          <td className="p-3 text-slate-600 font-bold whitespace-nowrap">
                            {item.performedBy}
                          </td>
                          <td className="p-3 text-slate-700 leading-relaxed text-xs">
                            {item.description}
                          </td>
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
    </div>
  );
};
