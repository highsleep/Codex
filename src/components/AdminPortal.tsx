import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Package,
  History,
  Download,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Database,
  BarChart3,
  Calendar,
  Lock,
  Trash2,
  Edit,
  RefreshCw,
  ExternalLink,
  Award,
  LogIn,
  Users,
  ArrowLeftRight,
  ShieldAlert,
  UserCheck,
  Layers,
  Printer,
  BarChart2,
  Crown,
  Factory,
  Settings,
} from 'lucide-react';
import { Product, WarrantyActivation, ActivationLog, AdminStats, AppUser, WarrantyClaim } from '../types';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { CustomerService360, CS360Tab } from './CustomerService360';
import { QualityDashboard } from './QualityDashboard';
import { RBACManagement } from './RBACManagement';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { CustomerClaimModal } from './CustomerClaimModal';
import { ProductionImportCenter } from './ProductionImportCenter';
import { PowerBIIntegrationHub } from './PowerBIIntegrationHub';
import { ProductManagement } from './ProductManagement';
import { DatabaseManagementCenter } from './DatabaseManagementCenter';
import { EnterpriseAnalyticsCenter } from './EnterpriseAnalyticsCenter';
import { TraceabilityAndPrintingCenter } from './TraceabilityAndPrintingCenter';
import { UserAvatar } from './UserAvatar';
import { RoleBadge, RoleIcon } from './RoleBadge';
import {
  AUTHORIZED_SYSTEM_USERS,
  ROLES_CONFIG,
  canAccessTab,
  getDefaultTabForRole,
} from '../utils/rbac';

interface AdminPortalProps {
  onViewCertificate: (activation: WarrantyActivation, product: Product) => void;
  initialAdminTab?: 'dashboard' | 'production' | 'traceability' | 'quality' | 'customer360' | 'rbac' | 'warranties' | 'products' | 'logs' | 'schema' | 'powerbi' | 'claims' | 'replacements' | 'db_center' | 'analytics_center';
  currentUser?: AppUser;
  onSelectUser?: (user: AppUser) => void;
  systemUsers?: AppUser[];
  onUsersUpdated?: (users: AppUser[], updatedUser?: AppUser) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onViewCertificate,
  initialAdminTab,
  currentUser: propCurrentUser,
  onSelectUser: propOnSelectUser,
  systemUsers: propSystemUsers,
  onUsersUpdated: propOnUsersUpdated,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // RBAC User & Simulated Role
  const [internalUser, setInternalUser] = useState<AppUser>(() => {
    return AUTHORIZED_SYSTEM_USERS.find((u) => u.id === 'USR-03') || AUTHORIZED_SYSTEM_USERS[0];
  });
  const [internalSystemUsers, setInternalSystemUsers] = useState<AppUser[]>(AUTHORIZED_SYSTEM_USERS);

  const currentUser = propCurrentUser || internalUser;
  const systemUsers = propSystemUsers && propSystemUsers.length > 0 ? propSystemUsers : internalSystemUsers;

  const getResolvedAdminTab = (tab?: string): 'executive' | 'dashboard' | 'analytics_center' | 'production' | 'traceability' | 'quality' | 'customer360' | 'rbac' | 'products' | 'schema' | 'powerbi' | 'db_center' | 'warranties_placeholder' | 'claims_placeholder' => {
    if (tab === 'claims' || tab === 'replacements' || tab === 'repairs' || tab === 'warranties' || tab === 'logs' || tab === 'customer360') {
      return 'customer360';
    }
    if (tab === 'executive') return 'executive';
    if (tab === 'analytics_center') return 'analytics_center';
    if (tab === 'traceability') return 'traceability';
    if (tab) return tab as any;
    return canAccessTab(currentUser?.role || 'SUPER_ADMIN', 'executive') ? 'executive' : 'dashboard';
  };

  const getResolved360Tab = (tab?: string): CS360Tab => {
    if (tab === 'warranties') return 'warranties';
    if (tab === 'logs') return 'logs';
    if (tab === 'claims') return 'claims_history';
    if (tab === 'replacements' || tab === 'repairs') return 'repairs_replacements';
    return 'customer_profile';
  };

  const [adminTab, setAdminTab] = useState<
    'executive' | 'dashboard' | 'analytics_center' | 'production' | 'traceability' | 'quality' | 'customer360' | 'rbac' | 'products' | 'schema' | 'powerbi' | 'db_center' | 'warranties_placeholder' | 'claims_placeholder'
  >(getResolvedAdminTab(initialAdminTab));

  useEffect(() => {
    if (initialAdminTab) {
      setAdminTab(getResolvedAdminTab(initialAdminTab));
      if (['warranties', 'logs', 'claims', 'replacements', 'repairs'].includes(initialAdminTab)) {
        setSelected360Tab(getResolved360Tab(initialAdminTab));
      }
    }
  }, [initialAdminTab]);

  const [showPowerBIModal, setShowPowerBIModal] = useState<boolean>(false);

  // Fetch registered users from server on mount if not supplied by parent
  useEffect(() => {
    if (!propSystemUsers || propSystemUsers.length === 0) {
      fetch('/api/users')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setInternalSystemUsers(data);
            const found = data.find((u) => u.id === currentUser.id);
            if (found) setInternalUser(found);
          }
        })
        .catch((err) => console.error('Error fetching system users:', err));
    }
  }, [propSystemUsers]);

  const handleSelectUser = (user: AppUser) => {
    if (propOnSelectUser) {
      propOnSelectUser(user);
    } else {
      setInternalUser(user);
    }
    if (!canAccessTab(user.role, adminTab)) {
      setAdminTab(getDefaultTabForRole(user.role) as any);
    }
  };

  const [selected360Query, setSelected360Query] = useState<string>('SLP-2026-9082');
  const [selected360Tab, setSelected360Tab] = useState<CS360Tab>('customer_profile');
  const [preloadReplacementClaim, setPreloadReplacementClaim] = useState<{
    serial_number: string;
    warranty_id: string;
    reason: string;
  } | null>(null);

  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimModalProps, setClaimModalProps] = useState({
    serialNumber: '',
    warrantyId: '',
    customerName: '',
    customerPhone: '',
    productModel: ''
  });

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [schemaSql, setSchemaSql] = useState<string>('');
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [newProduct, setNewProduct] = useState({
    serial_number: '',
    model: 'سليبي سوبر كراون (Sleepee Super Crown)',
    size: '180x200x30 سم',
    warranty_years: 10,
    production_date: new Date().toISOString().split('T')[0],
    factory_line: 'خط الإنتاج الرئيسي (Line A)',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const fetchSchemaSql = async () => {
    try {
      const res = await fetch('/api/schema-sql');
      if (res.ok) {
        const data = await res.json();
        setSchemaSql(data.sql || '');
      }
    } catch (err) {
      console.error('Error fetching schema sql:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchSchemaSql();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to add product');
      }
      setShowAddProductModal(false);
      setNewProduct({
        serial_number: '',
        model: 'سليبي سوبر كراون (Sleepee Super Crown)',
        size: '180x200x30 سم',
        warranty_years: 10,
        production_date: new Date().toISOString().split('T')[0],
        factory_line: 'خط الإنتاج الرئيسي (Line A)',
      });
      fetchDashboardData();
      alert('تمت إضافة المرتبة لخط الإنتاج بنجاح!');
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء إضافة المرتبة');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-['Cairo'] text-right" dir="rtl">
      
      {/* LEVEL 1 & PORTAL HEADER */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-[#111111] text-[#D4AF37] text-[10px] font-black uppercase tracking-wider">
              بوابة الإدارة المركزية (Central Admin Portal)
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
              مرحلة الإنتاج والضمان المعتمدة
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111]">
            نظام إدارة ضمان مصانع سليبي (Sleepee Warranty System)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مفعل حالياً بصلاحيات المستخدم: <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.role})
          </p>
        </div>

        {/* Quick User Switcher for RBAC Simulation */}
        <div className="flex items-center gap-2 bg-[#F5F5F5] p-2 rounded-2xl border border-[#E5E7EB]">
          <Users className="w-4 h-4 text-slate-500 mr-1 flex-shrink-0" />
          <span className="text-xs font-bold text-slate-600 whitespace-nowrap hidden sm:inline">
            تبديل الموظف:
          </span>
          <select
            value={currentUser.id}
            onChange={(e) => {
              const selected = systemUsers.find((u) => u.id === e.target.value);
              if (selected) {
                handleSelectUser(selected);
              }
            }}
            className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-[#D62828] focus:outline-hidden cursor-pointer"
          >
            {systemUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — ({u.role}) {u.status && u.status !== 'ACTIVE' ? `[${u.status}]` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* LEVEL 2: EXECUTIVE LEVEL TOP HORIZONTAL NAVIGATION BAR (SAP Fiori Style) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Group 1: القيادة التنفيذية */}
        <button
          onClick={() => setAdminTab('executive')}
          className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
            ['executive', 'analytics_center', 'dashboard'].includes(adminTab)
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
          <span>القيادة التنفيذية والتحليلات</span>
        </button>

        {/* Group 2: العمليات والإنتاج */}
        <button
          onClick={() => setAdminTab('production')}
          className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
            ['production', 'traceability', 'quality', 'products'].includes(adminTab)
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Factory className="w-4 h-4 text-emerald-400" />
          <span>العمليات والإنتاج</span>
        </button>

        {/* Group 3: العملاء والضمان */}
        <button
          onClick={() => setAdminTab('customer360')}
          className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
            ['customer360', 'warranties_placeholder', 'claims_placeholder'].includes(adminTab)
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-rose-400" />
          <span>العملاء والضمان (360°)</span>
        </button>

        {/* Group 4: الإدارة والنظام */}
        <button
          onClick={() => setAdminTab('rbac')}
          className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
            ['rbac', 'db_center', 'schema', 'powerbi'].includes(adminTab)
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Settings className="w-4 h-4 text-blue-400" />
          <span>الإدارة والنظام</span>
        </button>
      </div>

      {/* Sub-navigation pills for current Level 2 section */}
      {['executive', 'analytics_center', 'dashboard'].includes(adminTab) && (
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs font-bold">
          <span className="text-[10px] text-slate-400 px-2 uppercase font-semibold">عرض قيادي:</span>
          <button
            onClick={() => setAdminTab('executive')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${adminTab === 'executive' ? 'bg-[#D62828] text-white' : 'text-slate-700 hover:bg-slate-200'}`}
          >
            لوحة القيادة التنفيذية
          </button>
          <button
            onClick={() => setAdminTab('analytics_center')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${adminTab === 'analytics_center' ? 'bg-[#D62828] text-white' : 'text-slate-700 hover:bg-slate-200'}`}
          >
            مركز التحليلات المؤسسية (BI)
          </button>
          <button
            onClick={() => setAdminTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${adminTab === 'dashboard' ? 'bg-[#D62828] text-white' : 'text-slate-700 hover:bg-slate-200'}`}
          >
            مؤشرات الأداء العامة
          </button>
        </div>
      )}

      {['production', 'traceability', 'quality', 'products'].includes(adminTab) && (
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs font-bold">
          <span className="text-[10px] text-slate-400 px-2 uppercase font-semibold">قسم العمليات:</span>
          <button
            onClick={() => setAdminTab('production')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${adminTab === 'production' ? 'bg-[#D62828] text-white' : 'text-slate-700 hover:bg-slate-200'}`}
          >
            مركز العمليات والإنتاج (Manufacturing Hub)
          </button>
          <button
            onClick={() => setAdminTab('quality')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${adminTab === 'quality' ? 'bg-[#D62828] text-white' : 'text-slate-700 hover:bg-slate-200'}`}
          >
            لوحة الجودة والعيوب
          </button>
          <button
            onClick={() => setAdminTab('products')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${adminTab === 'products' ? 'bg-[#D62828] text-white' : 'text-slate-700 hover:bg-slate-200'}`}
          >
            إدارة المنتجات
          </button>
        </div>
      )}

      {['rbac', 'db_center', 'schema', 'powerbi'].includes(adminTab) && (
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs font-bold">
          <span className="text-[10px] text-slate-400 px-2 uppercase font-semibold">إعدادات النظام:</span>
          <button
            onClick={() => setAdminTab('rbac')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${adminTab === 'rbac' ? 'bg-[#111111] text-white' : 'text-slate-700 hover:bg-slate-200'}`}
          >
            الصلاحيات والأدوار (RBAC)
          </button>
          <button
            onClick={() => setAdminTab('db_center')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${adminTab === 'db_center' ? 'bg-[#111111] text-white' : 'text-slate-700 hover:bg-slate-200'}`}
          >
            إدارة البيانات والتدقيق
          </button>
          <button
            onClick={() => setAdminTab('schema')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${adminTab === 'schema' ? 'bg-[#111111] text-white' : 'text-slate-700 hover:bg-slate-200'}`}
          >
            مخطط Cloud SQL (PostgreSQL)
          </button>
          <button
            onClick={() => setAdminTab('powerbi')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${adminTab === 'powerbi' ? 'bg-[#111111] text-white' : 'text-slate-700 hover:bg-slate-200'}`}
          >
            تكامل Power BI
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA - FULL AVAILABLE WIDTH (NO SIDEBAR) */}
      {/* ======================================================== */}
      <div className="w-full space-y-6">

        {/* TAB: PRODUCTION IMPORT & MANUFACTURING CENTER */}
        {adminTab === 'production' && (
          <ProductionImportCenter
            currentUser={currentUser}
            onRefreshData={fetchDashboardData}
          />
        )}

        {/* TAB: QUALITY DASHBOARD */}
        {adminTab === 'quality' && <QualityDashboard />}

        {/* TAB: CUSTOMER SERVICE 360 (CASE MANAGEMENT CENTER) */}
        {adminTab === 'customer360' && (
          <CustomerService360
            initialQuery={selected360Query}
            initialTab={selected360Tab}
            currentUser={currentUser}
            onViewCertificate={onViewCertificate}
          />
        )}

        {/* TAB: RBAC & USER MANAGEMENT */}
        {adminTab === 'rbac' && (
          <RBACManagement
            currentUser={currentUser}
            systemUsers={systemUsers}
            onSelectActiveUser={(u) => handleSelectUser(u)}
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

        {/* TAB: PRODUCTS MANAGEMENT */}
        {adminTab === 'products' && (
          <div className="space-y-6">
            <ProductManagement currentUser={currentUser} />
          </div>
        )}

        {/* TAB: POSTGRESQL CLOUD SQL DDL */}
        {adminTab === 'schema' && (
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

        {/* TAB: POWER BI DIRECT INTEGRATION & EXPORT HUB */}
        {adminTab === 'powerbi' && (
          <PowerBIIntegrationHub />
        )}

        {/* TAB: DATABASE MANAGEMENT CENTER */}
        {adminTab === 'db_center' && (
          <DatabaseManagementCenter currentUser={currentUser} />
        )}

        {/* TAB: TRACEABILITY & PRINTING CENTER */}
        {adminTab === 'traceability' && (
          <TraceabilityAndPrintingCenter currentUser={currentUser} />
        )}

        {/* TAB: ANALYTICS CENTER */}
        {adminTab === 'analytics_center' && (
          <EnterpriseAnalyticsCenter currentUser={currentUser} />
        )}

        {/* TAB: EXECUTIVE MANAGEMENT DASHBOARD */}
        {adminTab === 'executive' && <ExecutiveDashboard currentUser={currentUser} />}

        {/* TAB: DASHBOARD & STATS */}
        {adminTab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
                <span className="text-xs text-slate-500 font-bold block">إجمالي وثائق الضمان</span>
                <div className="text-2xl sm:text-3xl font-black text-[#D62828] font-mono mt-1">
                  {stats.totalWarranties ?? stats.totalActivated}
                </div>
                <span className="text-[11px] text-[#D62828] font-semibold">وثيقة مسجلة وموثقة</span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
                <span className="text-xs text-slate-500 font-bold block">تم التفعيل اليوم</span>
                <div className="text-2xl sm:text-3xl font-black text-blue-600 font-mono mt-1">
                  {stats.activatedToday ?? 0}
                </div>
                <span className="text-[11px] text-blue-700 font-semibold">تفعيل خلال الـ 24 ساعة</span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
                <span className="text-xs text-slate-500 font-bold block">الضمانات السارية</span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono mt-1">
                  {stats.activeWarranties}
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold">تحت فترة التغطية</span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
                <span className="text-xs text-slate-500 font-bold block">توشك على الانتهاء</span>
                <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono mt-1">
                  {stats.expiringWarranties ?? 0}
                </div>
                <span className="text-[11px] text-amber-700 font-semibold">خلال الـ 30 يوماً القادمة</span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
                <span className="text-xs text-slate-500 font-bold block">إجمالي المراتب</span>
                <div className="text-2xl sm:text-3xl font-black text-[#111111] font-mono mt-1">
                  {stats.totalProducts}
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">مسجلة بخطوط الإنتاج</span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
                <span className="text-xs text-slate-500 font-bold block">بانتظار التفعيل</span>
                <div className="text-2xl sm:text-3xl font-black text-[#D4AF37] font-mono mt-1">
                  {stats.unactivatedProducts}
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">جاهزة للتفعيل لدى العملاء</span>
              </div>
            </div>

            {/* Charts & Analytics Breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs">
                <h3 className="text-base font-black text-[#111111] font-['Cairo'] mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#D62828]" />
                  <span>توزيع تفعيل الضمان حسب المحافظات</span>
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.governorateDistribution).map(([gov, rawCount]) => {
                    const count = Number(rawCount) || 0;
                    const pct = Math.round((count / (stats.totalActivated || 1)) * 100);
                    return (
                      <div key={gov}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-[#111111]">{gov}</span>
                          <span className="font-mono text-slate-600">
                            {count} تفعيل ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#F5F5F5] rounded-full overflow-hidden border border-[#E5E7EB]">
                          <div
                            className="h-full bg-gradient-to-r from-[#D62828] to-[#B71C1C] rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs">
                <h3 className="text-base font-black text-[#111111] font-['Cairo'] mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#D62828]" />
                  <span>الموديلات الأكثر تفعيلاً للضمان</span>
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.modelDistribution).map(([model, rawCount]) => {
                    const count = Number(rawCount) || 0;
                    const pct = Math.round((count / (stats.totalActivated || 1)) * 100);
                    return (
                      <div key={model}>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-[#111111] truncate max-w-[240px]">{model}</span>
                          <span className="font-mono text-slate-600">{count} مرتبة</span>
                        </div>
                        <div className="w-full h-2.5 bg-[#F5F5F5] rounded-full overflow-hidden border border-[#E5E7EB]">
                          <div
                            className="h-full bg-gradient-to-r from-[#111111] to-slate-800 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
