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
  initialAdminTab?: 'dashboard' | 'production' | 'quality' | 'customer360' | 'rbac' | 'warranties' | 'products' | 'logs' | 'schema' | 'powerbi' | 'claims' | 'replacements' | 'db_center' | 'analytics_center';
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

  // Active Admin Sub-tab (claims, replacements, repairs, warranties & logs consolidated into Customer Service 360 Case Management Center)
  const getResolvedAdminTab = (tab?: string): 'executive' | 'dashboard' | 'analytics_center' | 'production' | 'quality' | 'customer360' | 'rbac' | 'products' | 'schema' | 'powerbi' | 'db_center' => {
    if (tab === 'claims' || tab === 'replacements' || tab === 'repairs' || tab === 'warranties' || tab === 'logs' || tab === 'customer360') {
      return 'customer360';
    }
    if (tab === 'executive') return 'executive';
    if (tab === 'analytics_center') return 'analytics_center';
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
    'executive' | 'dashboard' | 'analytics_center' | 'production' | 'quality' | 'customer360' | 'rbac' | 'products' | 'schema' | 'powerbi' | 'db_center'
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

  // Cross-Navigation & Preloads
  const [selected360Query, setSelected360Query] = useState<string>('SLP-2026-9082');
  const [selected360Tab, setSelected360Tab] = useState<CS360Tab>('customer_profile');
  const [preloadReplacementClaim, setPreloadReplacementClaim] = useState<{
    serial_number: string;
    warranty_id: string;
    reason: string;
  } | null>(null);

  // Claim Modal from Admin
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimModalProps, setClaimModalProps] = useState({
    serialNumber: '',
    warrantyId: '',
    customerName: '',
    phone: '',
  });

  // Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [warranties, setWarranties] = useState<WarrantyActivation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<ActivationLog[]>([]);
  const [schemaSql, setSchemaSql] = useState<string>('');

  // Searches
  const [warrantySearch, setWarrantySearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Modals & Forms
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    serial_number: '',
    model: 'سليبي رويال بوكيت سبرينج (Royal Pocket)',
    size: '180 × 200 سم',
    warranty_years: 10,
    production_date: new Date().toISOString().split('T')[0],
    production_order: 'ORD-2026-105',
    batch_no: 'BATCH-92A',
    image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  // Check existing session or Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setFirebaseUser(user);
        setIsAuthenticated(true);
        fetchDashboardData();
      } else {
        setFirebaseUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setLoginError(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        setFirebaseUser(res.user);
        setIsAuthenticated(true);
        fetchDashboardData();
      }
    } catch (err: any) {
      setLoginError(err.message || 'فشل تسجيل الدخول باستخدام حساب Google');
    }
  };

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoginError('تم إيقاف تسجيل الدخول التقليدي. يرجى استخدام حساب Google المعتمد.');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {}
    setFirebaseUser(null);
    setIsAuthenticated(false);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, warRes, prodRes, logsRes, schemaRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/warranties'),
        fetch('/api/admin/products'),
        fetch('/api/admin/logs'),
        fetch('/api/db/schema'),
        fetch('/api/users'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (warRes.ok) {
        const warData = await warRes.json();
        setWarranties(Array.isArray(warData) ? warData : []);
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : []);
      }
      if (logsRes.ok) {
        const logData = await logsRes.json();
        setLogs(Array.isArray(logData) ? logData : []);
      }
      if (schemaRes.ok) setSchemaSql(await schemaRes.text());
      if (usersRes && usersRes.ok) {
        const uList = await usersRes.json();
        if (Array.isArray(uList) && uList.length > 0) {
          if (propOnUsersUpdated) {
            propOnUsersUpdated(uList);
          } else {
            setInternalSystemUsers(uList);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشلت إضافة المنتج');

      setFormSuccess(`تمت إضافة المرتبة بالرقم التسلسلي ${data.product.serial_number} بنجاح`);
      setShowAddProductModal(false);
      fetchDashboardData();
      // Reset form with new serial template
      setNewProduct((prev) => ({
        ...prev,
        serial_number: `SLP-2026-${Math.floor(9000 + Math.random() * 900)}`,
      }));
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDeleteProduct = async (id: number, serial: string) => {
    if (!confirm(`هل أنت متأكد من حذف المنتج ذو الرقم التسلسلي (${serial})؟`)) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف المنتج');
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/admin/export-csv', '_blank');
  };

  // Filtered Warranties
  const filteredWarranties = (warranties || []).filter((w) => {
    const q = warrantySearch.trim().toLowerCase();
    if (!q) return true;
    return (
      w.warranty_id?.toLowerCase().includes(q) ||
      w.serial_number?.toLowerCase().includes(q) ||
      w.customer_name?.toLowerCase().includes(q) ||
      w.phone?.includes(q) ||
      w.invoice_number?.toLowerCase().includes(q) ||
      w.governorate?.toLowerCase().includes(q)
    );
  });

  // Filtered Products
  const filteredProducts = (products || []).filter((p) => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.serial_number?.toLowerCase().includes(q) ||
      p.model?.toLowerCase().includes(q) ||
      p.batch_no?.toLowerCase().includes(q) ||
      p.production_order?.toLowerCase().includes(q)
    );
  });

  // Login Gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-[#E5E7EB] text-right">
          <div className="w-16 h-16 rounded-2xl bg-[#D62828] text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#D62828]/20">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-[#111111] text-center font-['Cairo'] mb-1">
            تسجيل دخول إدارة سليبي
          </h2>
          <p className="text-xs text-slate-500 text-center mb-6">
            لوحة التحكم المركزية لإدارة المنتجات وتوثيق الضمانات وقواعد البيانات
          </p>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
              تم إيقاف اسم المستخدم وكلمة المرور التقليديين. استخدم حساب Google المعتمد للوصول إلى لوحة الإدارة.
            </div>

          {/* Google Sign In (Firebase) */}
          <div className="mt-4 pt-4 border-t border-[#E5E7EB] space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#E5E7EB] hover:bg-[#F5F5F5] text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>تسجيل الدخول عبر Google (حساب الجودة والرقابة)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#D62828]" />
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D62828] animate-pulse" />
            <span className="text-xs font-bold text-slate-500">
              {firebaseUser
                ? `متصل عبر Google: ${firebaseUser.email}`
                : 'متصل كمدير نظام سليبي | Sleepee Admin'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] font-['Cairo'] mt-0.5">
            لوحة الإدارة وإحصائيات الضمان
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowPowerBIModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 text-xs sm:text-sm font-black shadow-md shadow-amber-500/20 transition cursor-pointer"
          >
            <BarChart2 className="w-4 h-4 text-slate-950" />
            <span>تكامل وتصدير Power BI</span>
            <span className="px-1.5 py-0.2 rounded bg-black/20 text-slate-950 text-[10px] font-black">.pbids</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111111] hover:bg-black text-white text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#D4AF37]" />
            <span>تصدير ملف CSV للإكسيل</span>
          </button>

          <button
            onClick={() => {
              setNewProduct((prev) => ({
                ...prev,
                serial_number: `SLP-2026-${Math.floor(9000 + Math.random() * 900)}`,
              }));
              setShowAddProductModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D62828] hover:bg-[#B71C1C] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#D62828]/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مرتبة جديدة</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            تسجيل خروج
          </button>
        </div>
      </div>

      {/* Active User RBAC Context Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E5E7EB] shadow-xs mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <UserAvatar
            name={currentUser.name}
            role={currentUser.role}
            avatar={currentUser.avatar}
            size="lg"
            status={currentUser.status || 'ACTIVE'}
            showStatusDot={true}
          />

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-[#111111] font-['Cairo']">
                {currentUser.name}
              </h2>
              <RoleBadge
                role={currentUser.role}
                size="sm"
                showIcon={true}
                showArabic={true}
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span className="font-mono text-slate-600">{currentUser.email}</span>
              {currentUser.department && (
                <>
                  <span>•</span>
                  <span>{currentUser.department}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick User Switcher for RBAC Simulation */}
        <div className="flex items-center gap-2 w-full md:w-auto bg-[#F5F5F5] p-2 rounded-2xl border border-[#E5E7EB]">
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
            className="w-full md:w-auto bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-[#D62828] focus:outline-hidden cursor-pointer"
          >
            {systemUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — ({u.role}) {u.status && u.status !== 'ACTIVE' ? `[${u.status}]` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 border-b border-[#E5E7EB] text-xs sm:text-sm font-bold">
        {canAccessTab(currentUser.role, 'executive') && (
          <button
            onClick={() => setAdminTab('executive')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
              adminTab === 'executive'
                ? 'bg-indigo-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-300" />
            <span>لوحة القيادة التنفيذية</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-bold">KPIs</span>
          </button>
        )}

        {canAccessTab(currentUser.role, 'analytics_center') && (
          <button
            onClick={() => setAdminTab('analytics_center')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
              adminTab === 'analytics_center'
                ? 'bg-gradient-to-r from-indigo-900 to-indigo-800 text-white shadow-sm ring-1 ring-indigo-700'
                : 'text-slate-600 hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            <span>مركز التحليلات المؤسسية وذكاء الأعمال</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-200 text-indigo-950 text-[10px] font-bold">BI Center</span>
          </button>
        )}

        {canAccessTab(currentUser.role, 'dashboard') && (
          <button
            onClick={() => setAdminTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
              adminTab === 'dashboard'
                ? 'bg-[#D62828] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>نظرة عامة</span>
          </button>
        )}

        {canAccessTab(currentUser.role, 'products') && (
          <button
            onClick={() => setAdminTab('products')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
              adminTab === 'products'
                ? 'bg-[#D62828] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>إدارة المنتجات</span>
          </button>
        )}

        {canAccessTab(currentUser.role, 'production') && (
          <button
            onClick={() => setAdminTab('production')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
              adminTab === 'production'
                ? 'bg-[#D62828] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>مركز تكامل الإنتاج (Import Center)</span>
          </button>
        )}

        {canAccessTab(currentUser.role, 'quality') && (
          <button
            onClick={() => setAdminTab('quality')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
              adminTab === 'quality'
                ? 'bg-[#D62828] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>لوحة الجودة والعيوب</span>
          </button>
        )}

        {canAccessTab(currentUser.role, 'customer360') && (
          <button
            onClick={() => setAdminTab('customer360')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
              adminTab === 'customer360'
                ? 'bg-[#D62828] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>خدمة العملاء 360° (مركز إدارة الحالة)</span>
          </button>
        )}

        {canAccessTab(currentUser.role, 'rbac') && (
          <button
            onClick={() => setAdminTab('rbac')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
              adminTab === 'rbac'
                ? 'bg-[#D62828] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>الصلاحيات والأدوار</span>
          </button>
        )}

        {canAccessTab(currentUser.role, 'schema') && (
          <button
            onClick={() => setAdminTab('schema')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
              adminTab === 'schema'
                ? 'bg-[#D62828] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Cloud SQL</span>
          </button>
        )}

        {canAccessTab(currentUser.role, 'powerbi') && (
          <button
            onClick={() => setAdminTab('powerbi')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
              adminTab === 'powerbi'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-amber-600" />
            <span>تكامل Power BI</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">مباشر</span>
          </button>
        )}

        {canAccessTab(currentUser.role, 'db_center') && (
          <button
            onClick={() => setAdminTab('db_center')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
              adminTab === 'db_center'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-[#111111] hover:bg-[#F5F5F5]'
            }`}
          >
            <Database className="w-4 h-4 text-rose-500" />
            <span>إدارة البيانات</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-950 text-[10px] font-bold">Health</span>
          </button>
        )}
      </div>

      {/* TAB: DATABASE MANAGEMENT CENTER */}
      {adminTab === 'db_center' && (
        <DatabaseManagementCenter currentUser={currentUser} />
      )}

      {/* TAB: ENTERPRISE ANALYTICS & BI CENTER (PHASE 7C) */}
      {adminTab === 'analytics_center' && (
        <EnterpriseAnalyticsCenter currentUser={currentUser} />
      )}

      {/* TAB 0: EXECUTIVE MANAGEMENT DASHBOARD */}
      {adminTab === 'executive' && <ExecutiveDashboard currentUser={currentUser} />}

      {/* TAB 1: DASHBOARD & STATS */}
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
            {/* Governorates Distribution */}
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

            {/* Mattress Models Breakdown */}
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

      {/* TAB: PRODUCTION IMPORT & INTEGRATION */}
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

      {/* TAB: PRODUCTS MANAGEMENT (ADMINISTRATIVE) */}
      {adminTab === 'products' && (
        <div className="space-y-6">
          <ProductManagement currentUser={currentUser} />
        </div>
      )}

      {/* TAB 5: POSTGRESQL CLOUD SQL DDL */}
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

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-[#111111]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#E5E7EB] max-h-[90vh] overflow-y-auto text-right">
            <h3 className="text-xl font-black text-[#111111] font-['Cairo'] mb-1">
              إضافة مرتبة جديدة لخط الإنتاج
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              تسجيل منتج أصلي جديد وتوليد باركود الضمان لتسهيل تفعيله للعميل
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#111111] mb-1">الرقم التسلسلي (Serial Number) *</label>
                <input
                  type="text"
                  required
                  value={newProduct.serial_number}
                  onChange={(e) => setNewProduct({ ...newProduct, serial_number: e.target.value })}
                  placeholder="مثال: SLP-2026-9099"
                  className="w-full text-left font-mono font-bold px-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white outline-none focus:border-[#D62828] focus:ring-4 focus:ring-[#D62828]/10 transition"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111111] mb-1">موديل المرتبة *</label>
                <input
                  type="text"
                  required
                  value={newProduct.model}
                  onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })}
                  className="w-full font-bold px-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white outline-none focus:border-[#D62828] focus:ring-4 focus:ring-[#D62828]/10 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#111111] mb-1">المقاس *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.size}
                    onChange={(e) => setNewProduct({ ...newProduct, size: e.target.value })}
                    className="w-full font-bold px-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white outline-none focus:border-[#D62828] focus:ring-4 focus:ring-[#D62828]/10 transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111111] mb-1">سنوات الضمان *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={25}
                    value={newProduct.warranty_years}
                    onChange={(e) => setNewProduct({ ...newProduct, warranty_years: Number(e.target.value) })}
                    className="w-full font-mono font-bold px-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white outline-none focus:border-[#D62828] focus:ring-4 focus:ring-[#D62828]/10 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#111111] mb-1">تاريخ الإنتاج *</label>
                  <input
                    type="date"
                    required
                    value={newProduct.production_date}
                    onChange={(e) => setNewProduct({ ...newProduct, production_date: e.target.value })}
                    className="w-full font-mono px-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white outline-none focus:border-[#D62828] focus:ring-4 focus:ring-[#D62828]/10 transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#111111] mb-1">أمر الإنتاج (Order No) *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.production_order}
                    onChange={(e) => setNewProduct({ ...newProduct, production_order: e.target.value })}
                    className="w-full font-mono font-bold px-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white outline-none focus:border-[#D62828] focus:ring-4 focus:ring-[#D62828]/10 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#111111] mb-1">رقم الدفعة / التشغيلة (Batch No) *</label>
                <input
                  type="text"
                  required
                  value={newProduct.batch_no}
                  onChange={(e) => setNewProduct({ ...newProduct, batch_no: e.target.value })}
                  className="w-full font-mono font-bold px-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white outline-none focus:border-[#D62828] focus:ring-4 focus:ring-[#D62828]/10 transition"
                />
              </div>

              <div>
                <label className="block font-bold text-[#111111] mb-1">رابط صورة المرتبة</label>
                <input
                  type="url"
                  value={newProduct.image_url}
                  onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                  className="w-full text-left font-mono px-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#F5F5F5] focus:bg-white outline-none focus:border-[#D62828] focus:ring-4 focus:ring-[#D62828]/10 transition text-[11px]"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#D62828] hover:bg-[#B71C1C] text-white font-black transition cursor-pointer shadow-md shadow-[#D62828]/20"
                >
                  حفظ وتسجيل المنتج
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F5F5F5] text-slate-700 font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Quick Claim Creation Modal */}
      <CustomerClaimModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        initialSerialNumber={claimModalProps.serialNumber}
        initialWarrantyId={claimModalProps.warrantyId}
        initialCustomerName={claimModalProps.customerName}
        initialPhone={claimModalProps.phone}
        onClaimSubmitted={() => {
          fetchDashboardData();
        }}
      />

      {/* Power BI Integration Modal */}
      {showPowerBIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl my-8">
            <PowerBIIntegrationHub isModal={true} onClose={() => setShowPowerBIModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
