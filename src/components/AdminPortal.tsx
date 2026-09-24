import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Database,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Eye,
  Settings,
  Users,
  Layers,
  Sparkles,
  Lock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Package,
  Layers3,
  QrCode,
  History,
  Workflow,
  Search,
  Server,
  Activity,
  Cpu,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { AppUser } from '../types';
import { ProductManagement } from './ProductManagement';
import { RBACManagement } from './RBACManagement';
import { CustomerService360 } from './CustomerService360';
import { ClaimsManagement } from './ClaimsManagement';
import { ReplacementManagement } from './ReplacementManagement';
import { SLATrackingBoard } from './SLATrackingBoard';
import { QualityDashboard } from './QualityDashboard';
import { PowerBIIntegrationHub } from './PowerBIIntegrationHub';
import { DatabaseManagementCenter } from './DatabaseManagementCenter';
import { TraceabilityAndPrintingCenter } from './TraceabilityAndPrintingCenter';
import { EnterpriseAnalyticsCenter } from './EnterpriseAnalyticsCenter';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { ProductionImportCenter } from './ProductionImportCenter';
import { SystemIntegrationsCenter } from './SystemIntegrationsCenter';
import { ProductMasterAdmin } from './ProductMasterAdmin';
import {
  canAccessTab,
  canManageUsers,
  ROLES_CONFIG,
  AUTHORIZED_SYSTEM_USERS,
} from '../utils/rbac';

interface AdminPortalProps {
  currentUser?: AppUser | null;
  onSelectUser?: (user: AppUser) => void;
  systemUsers?: AppUser[];
  onUsersUpdated?: (users: AppUser[], updatedUser?: AppUser) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentUser: propUser,
  onSelectUser: propOnSelectUser,
  systemUsers: propSystemUsers,
  onUsersUpdated: propOnUsersUpdated,
}) => {
  const [internalUser, setInternalUser] = useState<AppUser>(
    propUser || AUTHORIZED_SYSTEM_USERS[0]
  );
  const currentUser = propUser || internalUser;

  const [internalSystemUsers, setInternalSystemUsers] = useState<AppUser[]>(
    propSystemUsers || AUTHORIZED_SYSTEM_USERS
  );
  const systemUsers = propSystemUsers || internalSystemUsers;

  // 4 Primary Hub Modules
  const [adminTab, setAdminTab] = useState<
    'manufacturing' | 'executive' | 'customer_ops' | 'system_settings'
  >('manufacturing');

  // Sub-tabs for Customer Operations
  const [customerSubTab, setCustomerSubTab] = useState<
    'cs360' | 'claims' | 'replacements' | 'sla'
  >('cs360');

  // Sub-tabs for System Settings
  const [settingsSubTab, setSettingsSubTab] = useState<
    'master_data' | 'integrations' | 'rbac' | 'db_center' | 'products' | 'schema' | 'powerbi'
  >('master_data');

  const [schemaSql, setSchemaSql] = useState<string>('');

  useEffect(() => {
    fetch('/schema.sql')
      .then((res) => (res.ok ? res.text() : ''))
      .then((text) => setSchemaSql(text))
      .catch(() => setSchemaSql('-- لم يتم العثور على ملف schema.sql'));
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6 font-['Cairo'] text-right" dir="rtl">
      
      {/* 1. Standardized Module Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-[#E5E7EB] dark:border-slate-800 shadow-xs relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#08152F] via-[#E53935] to-[#D4AF37]" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#08152F] dark:bg-slate-800 text-[#D4AF37] flex items-center justify-center shadow-md shrink-0 border border-slate-700/50">
              <Cpu className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                <span className="text-[#E53935] font-bold">بوابة الإدارة المركزية (ERP)</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800 dark:text-slate-200 font-bold">
                  {adminTab === 'manufacturing' && 'إدارة الإنتاج والطباعة'}
                  {adminTab === 'executive' && 'التحليلات والتقارير'}
                  {adminTab === 'customer_ops' && 'خدمة العملاء والضمان'}
                  {adminTab === 'system_settings' && 'الإعدادات والإدارة'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#08152F] dark:text-white tracking-tight">
                {adminTab === 'manufacturing' && 'إدارة الإنتاج والطباعة'}
                {adminTab === 'executive' && 'التحليلات والتقارير'}
                {adminTab === 'customer_ops' && 'خدمة العملاء والضمان'}
                {adminTab === 'system_settings' && 'الإعدادات والإدارة'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                {adminTab === 'manufacturing' && 'إدارة أوامر الإنتاج اليومية، توليد السيريالات، طباعة ملصقات Zebra ZD220، وتتبع المنتجات.'}
                {adminTab === 'executive' && 'المؤشرات التشغيلية للمصنع، نسب الإنجاز، وبيانات جودة خطوط التجميع.'}
                {adminTab === 'customer_ops' && 'إدارة وثائق الضمان، فحص مطالبات الصيانة، وتتبع تذاكر الاستبدال مع اتفاقيات SLA.'}
                {adminTab === 'system_settings' && 'إعدادات ربط قواعد البيانات، التكاملات الصناعية، وإدارة أدوار المستخدمين RBAC.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
              المستخدم: <span className="text-[#E53935]">{currentUser.name}</span> ({ROLES_CONFIG[currentUser.role]?.title || currentUser.role})
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Admin Module Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-1.5 border border-[#E5E7EB] dark:border-slate-800 shadow-xs grid grid-cols-2 md:grid-cols-4 gap-1.5">
        <button
          onClick={() => setAdminTab('manufacturing')}
          className={`h-11 px-4 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
            adminTab === 'manufacturing'
              ? 'bg-[#E53935] text-white shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>إدارة الإنتاج والطباعة</span>
        </button>

        <button
          onClick={() => setAdminTab('executive')}
          className={`h-11 px-4 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
            adminTab === 'executive'
              ? 'bg-[#E53935] text-white shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>التحليلات والتقارير</span>
        </button>

        <button
          onClick={() => setAdminTab('customer_ops')}
          className={`h-11 px-4 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
            adminTab === 'customer_ops'
              ? 'bg-[#E53935] text-white shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>خدمة العملاء والضمان</span>
        </button>

        <button
          onClick={() => setAdminTab('system_settings')}
          className={`h-11 px-4 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
            adminTab === 'system_settings'
              ? 'bg-[#E53935] text-white shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>الإعدادات والإدارة</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* 1. MANUFACTURING & PRODUCTION HUB */}
      {/* ================================================================= */}
      {adminTab === 'manufacturing' && (
        <ProductionImportCenter currentUser={currentUser} />
      )}

      {/* ================================================================= */}
      {/* 2. EXECUTIVE DASHBOARD & ANALYTICS */}
      {/* ================================================================= */}
      {adminTab === 'executive' && (
        <div className="space-y-6">
          <ExecutiveDashboard currentUser={currentUser} />
          <EnterpriseAnalyticsCenter currentUser={currentUser} />
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. CUSTOMER OPERATIONS & SERVICE 360 */}
      {/* ================================================================= */}
      {adminTab === 'customer_ops' && (
        <div className="space-y-6">
          {/* Sub-nav for Customer Ops */}
          <div className="bg-white rounded-2xl p-1.5 border border-[#E5E7EB] shadow-xs flex flex-wrap gap-1.5">
            <button
              onClick={() => setCustomerSubTab('cs360')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                customerSubTab === 'cs360'
                  ? 'bg-[#08152F] text-[#D4AF37]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              خدمة العملاء الشاملة (CS 360°)
            </button>
            <button
              onClick={() => setCustomerSubTab('claims')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                customerSubTab === 'claims'
                  ? 'bg-[#08152F] text-[#D4AF37]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              إدارة المطالبات الفنية
            </button>
            <button
              onClick={() => setCustomerSubTab('replacements')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                customerSubTab === 'replacements'
                  ? 'bg-[#08152F] text-[#D4AF37]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              استبدال المراتب وبدل التالف
            </button>
            <button
              onClick={() => setCustomerSubTab('sla')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                customerSubTab === 'sla'
                  ? 'bg-[#08152F] text-[#D4AF37]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              لوحة متابعة اتفاقية مستوى الخدمة (SLA)
            </button>
          </div>

          {customerSubTab === 'cs360' && <CustomerService360 currentUser={currentUser} />}
          {customerSubTab === 'claims' && <ClaimsManagement currentUser={currentUser} />}
          {customerSubTab === 'replacements' && <ReplacementManagement currentUser={currentUser} />}
          {customerSubTab === 'sla' && <SLATrackingBoard currentUser={currentUser} />}
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. SYSTEM SETTINGS & ENTERPRISE INTEGRATIONS */}
      {/* ================================================================= */}
      {adminTab === 'system_settings' && (
        <div className="space-y-6">
          {/* Sub-nav for System Settings */}
          <div className="bg-white rounded-2xl p-1.5 border border-[#E5E7EB] shadow-xs flex flex-wrap gap-1.5">
            <button
              onClick={() => setSettingsSubTab('master_data')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                settingsSubTab === 'master_data'
                  ? 'bg-[#08152F] text-[#D4AF37]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              البيانات الأساسية للمنتجات (Product Master)
            </button>

            <button
              onClick={() => setSettingsSubTab('integrations')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                settingsSubTab === 'integrations'
                  ? 'bg-[#08152F] text-[#D4AF37]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              التكاملات (SAP, SharePoint, GitHub, Zebra, Backup)
            </button>

            <button
              onClick={() => setSettingsSubTab('rbac')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                settingsSubTab === 'rbac'
                  ? 'bg-[#08152F] text-[#D4AF37]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              إدارة المستخدمين والصلاحيات (RBAC)
            </button>

            <button
              onClick={() => setSettingsSubTab('products')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                settingsSubTab === 'products'
                  ? 'bg-[#08152F] text-[#D4AF37]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              كتالوج وموديلات المراتب
            </button>

            <button
              onClick={() => setSettingsSubTab('db_center')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                settingsSubTab === 'db_center'
                  ? 'bg-[#08152F] text-[#D4AF37]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              إدارة وتطهير قواعد البيانات
            </button>

            <button
              onClick={() => setSettingsSubTab('schema')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                settingsSubTab === 'schema'
                  ? 'bg-[#08152F] text-[#D4AF37]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              مخطط PostgreSQL Cloud SQL
            </button>

            <button
              onClick={() => setSettingsSubTab('powerbi')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                settingsSubTab === 'powerbi'
                  ? 'bg-[#08152F] text-[#D4AF37]'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              تكامل Power BI المباشر
            </button>
          </div>

          {settingsSubTab === 'master_data' && (
            <ProductMasterAdmin currentUser={currentUser} />
          )}

          {settingsSubTab === 'integrations' && (
            <SystemIntegrationsCenter currentUser={currentUser} />
          )}

          {settingsSubTab === 'rbac' && (
            <RBACManagement
              currentUser={currentUser}
              systemUsers={systemUsers}
              onUsersUpdated={(updatedList, updatedUser) => {
                if (propOnUsersUpdated) {
                  propOnUsersUpdated(updatedList, updatedUser);
                } else {
                  setInternalSystemUsers(updatedList);
                  if (updatedUser && updatedUser.id === currentUser.id) {
                    setInternalUser(updatedUser);
                  }
                }
              }}
            />
          )}

          {settingsSubTab === 'products' && (
            <ProductManagement currentUser={currentUser} />
          )}

          {settingsSubTab === 'db_center' && (
            <DatabaseManagementCenter currentUser={currentUser} />
          )}

          {settingsSubTab === 'schema' && (
            <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-xs p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-black text-[#111111] font-['Cairo'] flex items-center gap-2">
                    <Database className="w-5 h-5 text-[#D62828]" />
                    <span>مخطط قواعد بيانات Google Cloud SQL PostgreSQL المعتمد</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    جداول: products, warranty_activations, activation_logs مع قيود الفهارس والمفاتيح الأجنبية
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(schemaSql);
                    alert('تم نسخ كود SQL إلى الحافظة');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#111111] text-[#D4AF37] text-xs font-bold hover:bg-black transition cursor-pointer"
                >
                  نسخ كود SQL بالكامل
                </button>
              </div>
              <pre className="bg-[#111111] text-emerald-400 p-4 rounded-2xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800 max-h-96">
                {schemaSql || 'جاري تحميل ملف schema.sql...'}
              </pre>
            </div>
          )}

          {settingsSubTab === 'powerbi' && (
            <PowerBIIntegrationHub />
          )}
        </div>
      )}

    </div>
  );
};
