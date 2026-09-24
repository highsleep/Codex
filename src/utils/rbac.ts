import { UserRole, AppUser } from '../types';

export interface RoleScreenInfo {
  id: string;
  name: string;
  category: string;
}

export interface DetailedRolePermissions {
  screensAllowed: RoleScreenInfo[];
  screensBlocked: RoleScreenInfo[];
  canCreate: { allowed: boolean; description: string };
  canEdit: { allowed: boolean; description: string };
  canDelete: { allowed: boolean; description: string };
  canExport: { allowed: boolean; description: string };
}

export interface RoleConfig {
  role: UserRole;
  title: string;
  description: string;
  badge: string;
  accentColor: string;
  permissions: string[];
  allowedTabs: string[];
  defaultTab: string;
  iconName: 'Crown' | 'Factory' | 'ClipboardCheck' | 'Headset' | 'Cog' | 'Eye';
  detailed: DetailedRolePermissions;
}

export const ALL_SYSTEM_SCREENS: RoleScreenInfo[] = [
  { id: 'executive', name: 'لوحة القيادة التنفيذية', category: 'الإدارة العليا' },
  { id: 'dashboard', name: 'مركز مؤشرات الأداء', category: 'تقارير ورؤى' },
  { id: 'analytics_center', name: 'مركز التحليلات المؤسسية', category: 'الإدارة العليا' },
  { id: 'products', name: 'إدارة المنتجات والمواصفات والموديلات', category: 'العمليات' },
  { id: 'production', name: 'مركز تكامل الإنتاج', category: 'الإنتاج' },
  { id: 'traceability', name: 'مركز الطباعة والتتبع', category: 'الإنتاج والتشغيل' },
  { id: 'quality', name: 'رقابة الجودة وسجل المعاينات الفنية والهبوط', category: 'الجودة' },
  { id: 'customer360', name: 'خدمة العملاء 360 والضمان والمطالبات', category: 'خدمة العملاء' },
  { id: 'rbac', name: 'إدارة الصلاحيات والأدوار المصنعية', category: 'الإدارة العليا' },
  { id: 'schema', name: 'مخطط قواعد بيانات Cloud SQL PostgreSQL المعتمد', category: 'الإدارة العليا' },
  { id: 'powerbi', name: 'لوحة تحليلات Power BI للأداء التشغيلي', category: 'تقارير ورؤى' },
  { id: 'db_center', name: 'مركز إدارة وقوة بيانات النظام', category: 'الإدارة العليا' },
];

export const AUTHORIZED_SYSTEM_USERS: AppUser[] = [
  {
    id: 'USR-01',
    name: 'م. محمد العامودي',
    email: 'malamoudi@sleephigh.com',
    role: 'SUPER_ADMIN',
    department: 'الإدارة العليا والتنفيذية',
    status: 'ACTIVE',
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'USR-02',
    name: 'م. وجدي باعبيد',
    email: 'wsb@sleephigh.com',
    role: 'SUPER_ADMIN',
    department: 'الإدارة العليا وتوكيد الجودة',
    status: 'ACTIVE',
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'USR-08',
    name: 'أ.د. عبد الرحمن الفارس',
    email: 'gm@sleephigh.com',
    role: 'GENERAL_MANAGER',
    department: 'الإدارة العامة والتنفيذية',
    status: 'ACTIVE',
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'USR-03',
    name: 'م. حسام سليمان',
    email: 'quality.eg@sleephigh.com',
    role: 'QUALITY_MANAGER',
    department: 'إدارة وتوكيد الجودة والمعاينات',
    status: 'ACTIVE',
    created_at: '2026-01-05T08:00:00Z',
  },
  {
    id: 'USR-04',
    name: 'م. محمد شرف',
    email: 'msharaf@sleephigh.com',
    role: 'PLANT_MANAGER',
    department: 'إدارة مصنع المراتب والعمليات',
    status: 'ACTIVE',
    created_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 'USR-05',
    name: 'أ. يوسف كامل',
    email: 'production.eg@sleephigh.com',
    role: 'PRODUCTION',
    department: 'إدارة وتخطيط خطوط الإنتاج والباركود',
    status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00Z',
  },
  {
    id: 'USR-06',
    name: 'أ. حسام عرفة',
    email: 'hossam@sleephigh.com',
    role: 'VIEWER',
    department: 'المتابعة والتدقيق والرقابة (Read-Only)',
    status: 'ACTIVE',
    created_at: '2026-01-20T08:00:00Z',
  },
  {
    id: 'USR-07',
    name: 'أ. محمد إبراهيم',
    email: 'm.hassan@sleephigh.com',
    role: 'CUSTOMER_SERVICE',
    department: 'خدمة العملاء وما بعد البيع والضمان 360',
    status: 'ACTIVE',
    created_at: '2026-01-25T08:00:00Z',
  },
];

export const ROLES_CONFIG: Record<UserRole, RoleConfig> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    title: 'مدير النظام الفائق (Super Admin)',
    description: 'صلاحيات كاملة وغير مقيدة على كافة أجزاء النظام وإدارة الحسابات، الأدوار، المنتجات، والسياسات.',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    accentColor: '#D62828',
    iconName: 'Crown',
    permissions: [
      'Full system access (وصول كامل للنظام)',
      'Executive dashboard (لوحة القيادة التنفيذية)',
      'User management (إدارة المستخدمين)',
      'Role management (إدارة الصلاحيات والأدوار)',
      'Product management (إدارة المنتجات الكاملة)',
      'Warranty management (إدارة وتوثيق الضمان)',
      'Customer Service 360 (خدمة العملاء الشاملة)',
      'Quality dashboard (لوحة الجودة والعيوب)',
      'Reports (التقارير المتقدمة وتصدير البيانات)',
      'System settings (إعدادات النظام والتهيئة)',
    ],
    allowedTabs: ['executive', 'dashboard', 'analytics_center', 'products', 'production', 'traceability', 'quality', 'customer360', 'rbac', 'schema', 'powerbi', 'db_center'],
    defaultTab: 'executive',
    detailed: {
      screensAllowed: ALL_SYSTEM_SCREENS,
      screensBlocked: [],
      canCreate: { allowed: true, description: 'إضافة كاملة للمستخدمين، الموديلات، الدفعات، والوثائق' },
      canEdit: { allowed: true, description: 'تعديل كافة السجلات والأدوار والسياسات بدون قيود' },
      canDelete: { allowed: true, description: 'حذف السجلات والمنتجات والمطالبات (مع الحماية)' },
      canExport: { allowed: true, description: 'تصدير شامل لكافة التقارير (Excel / PDF / CSV / SQL)' },
    },
  },
  GENERAL_MANAGER: {
    role: 'GENERAL_MANAGER',
    title: 'المدير العام (General Manager)',
    description: 'إشراف كلي ورؤية استراتيجية لمؤشرات الأداء الرئيسية (KPIs) وجودة التصنيع والضمان ورضا العملاء.',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentColor: '#4F46E5',
    iconName: 'Crown',
    permissions: [
      'Executive dashboard (لوحة القيادة التنفيذية ومؤشرات الأداء)',
      'Enterprise Analytics & BI (مركز التحليلات المؤسسية وذكاء الأعمال)',
      'Quality KPIs (مؤشرات الجودة ومعدلات الهبوط والعيوب)',
      'Manufacturing KPIs (مؤشرات الإنتاج ونسب الهالك وتكلفة الضمان)',
      'Customer Service KPIs (رضا العملاء وأوقات الاستجابة والإغلاق)',
      'Executive export (تصدير التقارير التنفيذية PDF / Excel / CSV)',
    ],
    allowedTabs: ['executive', 'dashboard', 'analytics_center', 'products', 'traceability', 'quality', 'customer360', 'powerbi', 'db_center'],
    defaultTab: 'executive',
    detailed: {
      screensAllowed: ALL_SYSTEM_SCREENS,
      screensBlocked: [],
      canCreate: { allowed: false, description: 'صلاحية استعراض تنفيذي واطلاع شامل' },
      canEdit: { allowed: false, description: 'صلاحية اتخاذ القرارات والاستعراض دون تعديل مباشر' },
      canDelete: { allowed: false, description: 'محظور الحذف نهائياً' },
      canExport: { allowed: true, description: 'تصدير كامل للتقارير التنفيذية والبيانات الإحصائية' },
    },
  },
  QUALITY_MANAGER: {
    role: 'QUALITY_MANAGER',
    title: 'مدير رقابة الجودة (Quality Manager)',
    description: 'المسؤول عن تقارير المعاينة الفنية، تحليل أسباب العيوب والهبوط، ومراجعة واعتماد الشكاوى.',
    badge: 'bg-amber-50 text-amber-800 border-amber-300',
    accentColor: '#D4AF37',
    iconName: 'ClipboardCheck',
    permissions: [
      'Quality dashboard (لوحة مؤشرات الجودة)',
      'Inspections (تقارير المعاينات والفحص الميداني)',
      'Defect analysis (تحليل العيوب وأسباب الهبوط)',
      'Claims review (مراجعة واعتماد الشكاوى والمطالبات)',
      'Read-only access to products (اطلاع فقط على سجلات المنتجات)',
    ],
    allowedTabs: ['quality', 'customer360', 'products', 'dashboard'],
    defaultTab: 'quality',
    detailed: {
      screensAllowed: ALL_SYSTEM_SCREENS.filter((s) => ['quality', 'customer360', 'products', 'dashboard'].includes(s.id)),
      screensBlocked: ALL_SYSTEM_SCREENS.filter((s) => ['rbac', 'schema', 'production', 'powerbi', 'executive', 'db_center', 'analytics_center'].includes(s.id)),
      canCreate: { allowed: true, description: 'إنشاء تقارير الفحص والمعاينة الفنية الميدانية للعيوب' },
      canEdit: { allowed: true, description: 'اعتماد نتائج الفحص وتحديد نسب الهبوط والقرارات الفنية' },
      canDelete: { allowed: false, description: 'محظور حذف أي سجلات جودة أو مطالبات معتمدة' },
      canExport: { allowed: true, description: 'تصدير تقارير الجودة ومؤشرات أسباب الهبوط والعيوب المصنعية' },
    },
  },
  PLANT_MANAGER: {
    role: 'PLANT_MANAGER',
    title: 'مدير المصنع (Plant Manager)',
    description: 'الإشراف على خطوط التصنيع وسجلات المنتجات، استيراد وتصدير بيانات التشغيل، وتقارير الإنتاج.',
    badge: 'bg-slate-900 text-white border-slate-800',
    accentColor: '#0F172A',
    iconName: 'Factory',
    permissions: [
      'Executive dashboard (لوحة القيادة التنفيذية)',
      'Enterprise Analytics & BI (مركز التحليلات المؤسسية وذكاء الأعمال)',
      'Production data (بيانات الإنتاج والتشغيل)',
      'Product records (سجلات المنتجات وأوامر التشغيل)',
      'Import/export (استيراد وتصدير بيانات التصنيع)',
      'Production reports (تقارير الإنتاج ومعدلات الإنجاز)',
      'Read-only warranty access (اطلاع فقط على وثائق الضمان)',
    ],
    allowedTabs: ['executive', 'dashboard', 'analytics_center', 'production', 'traceability', 'products', 'customer360', 'db_center'],
    defaultTab: 'executive',
    detailed: {
      screensAllowed: ALL_SYSTEM_SCREENS.filter((s) => ['executive', 'production', 'products', 'dashboard', 'customer360', 'db_center'].includes(s.id)),
      screensBlocked: ALL_SYSTEM_SCREENS.filter((s) => ['rbac', 'schema', 'quality', 'powerbi'].includes(s.id)),
      canCreate: { allowed: true, description: 'استيراد دفعات التصنيع، إضافة سجلات خطوط الإنتاج وأوامر التشغيل' },
      canEdit: { allowed: true, description: 'تحديث بيانات أوامر التشغيل ومزامنة بيانات التصنيع مع SAP' },
      canDelete: { allowed: false, description: 'غير مصرح بحذف المنتجات أو الحسابات' },
      canExport: { allowed: true, description: 'تصدير تقارير خطوط الإنتاج ومعدلات الإنجاز وCSV' },
    },
  },
  PRODUCTION: {
    role: 'PRODUCTION',
    title: 'مسؤول الإنتاج (Production)',
    description: 'توليد وتسجيل الأرقام التسلسلية، استيراد دفعات التصنيع، وطباعة ملصقات الباركود وQR.',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    accentColor: '#059669',
    iconName: 'Cog',
    permissions: [
      'Product creation (إنشاء وإضافة مراتب جديدة)',
      'Product import (استيراد دفعات الإنتاج من إكسل وCSV)',
      'QR generation (توليد وطباعة رموز QR والباركود Zebra)',
      'Production records (إدارة ومتابعة سجلات الإنتاج)',
    ],
    allowedTabs: ['production', 'products'],
    defaultTab: 'production',
    detailed: {
      screensAllowed: ALL_SYSTEM_SCREENS.filter((s) => ['production', 'products'].includes(s.id)),
      screensBlocked: ALL_SYSTEM_SCREENS.filter((s) => ['rbac', 'schema', 'quality', 'customer360', 'dashboard', 'powerbi', 'executive', 'db_center', 'analytics_center'].includes(s.id)),
      canCreate: { allowed: true, description: 'تسجيل مراتب جديدة، استيراد دفعات التصنيع، وتوليد رموز QR والباركود' },
      canEdit: { allowed: true, description: 'تحديث حالة الإنتاج وطباعة ملصقات التغليف والباركود' },
      canDelete: { allowed: false, description: 'محظور حذف أي سجل منتج أو دفعة تصنيع' },
      canExport: { allowed: true, description: 'تصدير وطباعة بطاقات وملصقات الباركود Zebra وZPL' },
    },
  },
  CUSTOMER_SERVICE: {
    role: 'CUSTOMER_SERVICE',
    title: 'خدمة العملاء (Customer Service)',
    description: 'تفعيل بطاقات الضمان، إدارة ملفات المستهلكين 360، تسجيل البلاغات، وطباعة الشهادات.',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    accentColor: '#2563EB',
    iconName: 'Headset',
    permissions: [
      'Warranty activation (تفعيل وثائق وبطاقات الضمان)',
      'Warranty verification (التحقق والاستعلام عن سريان الضمان)',
      'Customer Service 360 (إدارة الحالة الكاملة للمستهلك)',
      'Claims management (تسجيل ومتابعة شكاوى العملاء)',
      'Certificate printing (عرض وطباعة شهادات الضمان والاستبدال)',
    ],
    allowedTabs: ['customer360', 'dashboard'],
    defaultTab: 'customer360',
    detailed: {
      screensAllowed: ALL_SYSTEM_SCREENS.filter((s) => ['customer360', 'dashboard'].includes(s.id)),
      screensBlocked: ALL_SYSTEM_SCREENS.filter((s) => ['rbac', 'schema', 'products', 'production', 'quality', 'powerbi', 'executive', 'db_center', 'analytics_center'].includes(s.id)),
      canCreate: { allowed: true, description: 'تفعيل وثائق الضمان، تسجيل شكاوى ومطالبات العملاء وبلاغات الصيانة' },
      canEdit: { allowed: true, description: 'تحديث بيانات اتصال العميل، إضافة اتصالات وملاحظات المتابعة' },
      canDelete: { allowed: false, description: 'محظور حذف أي وثيقة ضمان أو شكوى مسجلة' },
      canExport: { allowed: true, description: 'تصدير وطباعة شهادات الضمان الرقمية وشهادات الاستبدال PDF' },
    },
  },
  VIEWER: {
    role: 'VIEWER',
    title: 'مشاهد / مدقق (Viewer)',
    description: 'صلاحيات اطلاع وقراءة فقط (Read-only)، بحث وتحقق من السجلات دون أي صلاحية إنشاء أو تعديل أو حذف.',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    accentColor: '#64748B',
    iconName: 'Eye',
    permissions: [
      'Read-only access (صلاحية استعراض فقط لكافة البيانات)',
      'Search and verification only (البحث والتحقق فقط)',
      'No create, edit or delete permissions (محظور الإضافة أو التعديل أو الحذف)',
    ],
    allowedTabs: ['dashboard', 'products', 'customer360'],
    defaultTab: 'dashboard',
    detailed: {
      screensAllowed: ALL_SYSTEM_SCREENS.filter((s) => ['dashboard', 'products', 'customer360'].includes(s.id)),
      screensBlocked: ALL_SYSTEM_SCREENS.filter((s) => ['rbac', 'schema', 'production', 'quality', 'powerbi', 'executive', 'db_center', 'analytics_center'].includes(s.id)),
      canCreate: { allowed: false, description: 'محظور الإضافة نهائياً (حساب تدقيق واطلاع فقط)' },
      canEdit: { allowed: false, description: 'محظور التعديل نهائياً على أي سجل' },
      canDelete: { allowed: false, description: 'محظور الحذف نهائياً' },
      canExport: { allowed: true, description: 'استعراض البيانات والبحث والتحقق وتصدير للاستعلام فقط' },
    },
  },
};

export function canAccessTab(role: UserRole, tab: string): boolean {
  const config = ROLES_CONFIG[role];
  if (!config) return false;
  return config.allowedTabs.includes(tab);
}

export function getDefaultTabForRole(role: UserRole): string {
  const config = ROLES_CONFIG[role];
  return config ? config.defaultTab : 'dashboard';
}

export function isReadOnlyRole(role: UserRole): boolean {
  return role === 'VIEWER';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

export function canManageRoles(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

export function canCreateProducts(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'PRODUCTION';
}

export function canImportProducts(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'PLANT_MANAGER' || role === 'PRODUCTION';
}

export function canDeleteProducts(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

export function canEditProducts(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

export function canModifyWarrantyPolicy(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

export function canActivateWarranty(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'CUSTOMER_SERVICE';
}

export function canManageClaims(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'CUSTOMER_SERVICE';
}

export function canReviewClaims(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'QUALITY_MANAGER';
}

export function canApproveReplacement(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'QUALITY_MANAGER';
}

export function canApproveRepair(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'QUALITY_MANAGER';
}

export function canCloseClaim(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'QUALITY_MANAGER' || role === 'CUSTOMER_SERVICE';
}

export function canAccessQualityDashboard(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'QUALITY_MANAGER' || role === 'GENERAL_MANAGER';
}

export function canAccessExecutiveDashboard(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'PLANT_MANAGER' || role === 'GENERAL_MANAGER';
}

export function canAccessAnalyticsCenter(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'PLANT_MANAGER' || role === 'GENERAL_MANAGER';
}

export function canAccessProduction(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'PLANT_MANAGER' || role === 'PRODUCTION';
}

export function canExportReports(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'PLANT_MANAGER' || role === 'QUALITY_MANAGER' || role === 'PRODUCTION';
}

export function canPrintCertificates(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'CUSTOMER_SERVICE' || role === 'QUALITY_MANAGER';
}
