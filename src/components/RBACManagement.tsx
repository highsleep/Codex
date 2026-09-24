import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Users,
  CheckCircle2,
  Lock,
  UserCheck,
  AlertCircle,
  Key,
  RefreshCw,
  Search,
  History,
  Info,
  Sliders,
  ExternalLink,
  Check,
  X,
  UserX,
  Power,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Clock,
  UserCog,
  FileSpreadsheet,
  Trash2,
  Edit3,
  PlusCircle,
  Eye,
} from 'lucide-react';
import { AppUser, UserRole, RoleAuditLog } from '../types';
import {
  ROLES_CONFIG,
  AUTHORIZED_SYSTEM_USERS,
  ALL_SYSTEM_SCREENS,
  RoleConfig,
} from '../utils/rbac';
import { UserAvatar } from './UserAvatar';
import { RoleBadge, RoleIcon, ROLE_COLOR_CONFIGS, ROLE_ICONS } from './RoleBadge';

interface RBACManagementProps {
  currentUser?: AppUser | null;
  onSelectActiveUser: (user: AppUser) => void;
  systemUsers?: AppUser[];
  onUsersUpdated?: (users: AppUser[], updatedUser?: AppUser) => void;
}

export const RBACManagement: React.FC<RBACManagementProps> = ({
  currentUser,
  onSelectActiveUser,
  systemUsers: propSystemUsers,
  onUsersUpdated,
}) => {
  const [users, setUsers] = useState<AppUser[]>(
    propSystemUsers && propSystemUsers.length > 0
      ? propSystemUsers
      : AUTHORIZED_SYSTEM_USERS
  );
  const [roleLogs, setRoleLogs] = useState<RoleAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'matrix' | 'logs'>(
    'users'
  );

  // Edit Role Modal State
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('QUALITY_MANAGER');
  const [updatingRole, setUpdatingRole] = useState(false);

  // Detail Modal State
  const [inspectingUser, setInspectingUser] = useState<AppUser | null>(null);

  // Matrix Selected Role State
  const [matrixRole, setMatrixRole] = useState<UserRole>('SUPER_ADMIN');

  // Success Notification
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'warning' = 'success'
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Sync with propSystemUsers if it updates externally
  useEffect(() => {
    if (propSystemUsers && propSystemUsers.length > 0) {
      setUsers(propSystemUsers);
    }
  }, [propSystemUsers]);

  // Fetch users & logs from server
  const fetchUsersAndLogs = async () => {
    setLoading(true);
    try {
      const [usersRes, logsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/users/role-logs'),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData) && usersData.length > 0) {
          setUsers(usersData);
          if (onUsersUpdated) {
            onUsersUpdated(usersData);
          }
        }
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (Array.isArray(logsData)) {
          setRoleLogs(logsData);
        }
      }
    } catch (err) {
      console.error('Error fetching RBAC data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndLogs();
  }, []);

  // Compute active super admins count for guardrail
  const activeSuperAdminsCount = useMemo(() => {
    return users.filter(
      (u) =>
        u.role === 'SUPER_ADMIN' &&
        u.status !== 'SUSPENDED' &&
        u.status !== 'INACTIVE'
    ).length;
  }, [users]);

  // Handle Role Update
  const handleSaveRole = async () => {
    if (!editingUser) return;

    // Guardrail: prevent removing last active super admin
    if (
      editingUser.role === 'SUPER_ADMIN' &&
      selectedRole !== 'SUPER_ADMIN' &&
      activeSuperAdminsCount <= 1
    ) {
      showNotification(
        'لا يمكن تغيير دور آخر مدير نظام فائق (SUPER_ADMIN) في النظام للحفاظ على أمان المنظومة.',
        'error'
      );
      return;
    }

    setUpdatingRole(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          acting_user: currentUser ? currentUser.name : 'Super Admin',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث الدور');

      const updatedUser: AppUser = data.user;

      // Update local state immediately without refresh
      const updatedList = users.map((u) =>
        u.id === editingUser.id ? updatedUser : u
      );
      setUsers(updatedList);

      // Append new log immediately
      if (data.log) {
        setRoleLogs((prev) => [data.log, ...prev]);
      }

      // Notify parent AdminPortal so top bar & user switcher update simultaneously
      if (onUsersUpdated) {
        onUsersUpdated(updatedList, updatedUser);
      }

      // If updating currently logged in simulated user, sync parent active user
      if (currentUser && currentUser.id === editingUser.id) {
        onSelectActiveUser(updatedUser);
      }

      showNotification(
        `تم تحديث دور "${updatedUser.name}" بنجاح إلى "${ROLES_CONFIG[selectedRole].title}"`,
        'success'
      );
      setEditingUser(null);
    } catch (err: any) {
      showNotification(err.message || 'حدث خطأ أثناء حفظ التعديل', 'error');
    } finally {
      setUpdatingRole(false);
    }
  };

  // Handle Status Toggle (ACTIVE / INACTIVE / SUSPENDED)
  const handleToggleStatus = async (
    user: AppUser,
    newStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  ) => {
    if (user.status === newStatus) return;

    if (
      user.role === 'SUPER_ADMIN' &&
      newStatus !== 'ACTIVE' &&
      activeSuperAdminsCount <= 1
    ) {
      showNotification(
        'لا يمكن إيقاف أو تعطيل حساب آخر مدير نظام فائق (SUPER_ADMIN) في المنظومة.',
        'error'
      );
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          acting_user: currentUser ? currentUser.name : 'مدير النظام',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تعديل حالة الحساب');

      const updatedUser: AppUser = data.user;
      const updatedList = users.map((u) =>
        u.id === user.id ? updatedUser : u
      );
      setUsers(updatedList);

      if (data.log) {
        setRoleLogs((prev) => [data.log, ...prev]);
      }

      if (onUsersUpdated) {
        onUsersUpdated(updatedList, updatedUser);
      }

      if (currentUser && currentUser.id === user.id) {
        onSelectActiveUser(updatedUser);
      }

      const statusLabels = {
        ACTIVE: 'تنشيط',
        INACTIVE: 'إلغاء تفعيل',
        SUSPENDED: 'إيقاف مؤقت',
      };
      showNotification(
        `تم ${statusLabels[newStatus]} حساب "${user.name}" بنجاح`,
        'success'
      );
    } catch (err: any) {
      showNotification(err.message || 'حدث خطأ أثناء تغيير الحالة', 'error');
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.department &&
          u.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

      const userStatus = u.status || 'ACTIVE';
      const matchesStatus =
        statusFilter === 'ALL' || userStatus === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Stats Card Calculations
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter(
    (u) => (u.status || 'ACTIVE') === 'ACTIVE'
  ).length;
  const distinctRolesCount = Object.keys(ROLES_CONFIG).length;
  const latestLog = roleLogs[0];

  // User count per role
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: users.length };
    (Object.keys(ROLES_CONFIG) as UserRole[]).forEach((role) => {
      counts[role] = users.filter((u) => u.role === role).length;
    });
    return counts;
  }, [users]);

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold border transition-all animate-bounce ${
            notification.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-500 shadow-emerald-900/30'
              : notification.type === 'error'
              ? 'bg-rose-900 text-white border-rose-500 shadow-rose-900/30'
              : 'bg-amber-900 text-white border-amber-500 shadow-amber-900/30'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-white p-5 rounded-3xl shadow-xs border border-[#E5E7EB] flex flex-col md:flex-row gap-4 items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D62828] via-[#D4AF37] to-[#111111]" />

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#D62828] text-white flex items-center justify-center shadow-lg shadow-[#D62828]/25 flex-shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[#111111] font-['Cairo']">
                إدارة الصلاحيات والأدوار المصنعية (RBAC Engine)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                مزامنة فورية (Realtime Sync)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              التحكم في أدوار موظفي مصنع سليبي هاي، الصلاحيات الممنوحة للشاشات،
              وتتبع سجل التعديلات
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsersAndLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200"
            title="تحديث البيانات من الخادم"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث السجلات</span>
          </button>
        </div>
      </div>

      {/* STATS CARDS (بطاقات إحصائية أعلى الصفحة) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">
              إجمالي المستخدمين
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-['Cairo']">
                {totalUsersCount}
              </span>
              <span className="text-[11px] text-slate-500 font-bold">موظف مسجل</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 block mb-1">
              المستخدمون النشطون
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700 font-['Cairo']">
                {activeUsersCount}
              </span>
              <span className="text-[11px] text-emerald-600/80 font-bold">
                من أصل {totalUsersCount}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Defined Roles */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-700 block mb-1">
              عدد الأدوار المعرفة
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-800 font-['Cairo']">
                {distinctRolesCount}
              </span>
              <span className="text-[11px] text-amber-700/80 font-bold">أدوار وظيفية</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <Key className="w-5 h-5" />
          </div>
        </div>

        {/* Last Modified */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-600 block mb-1">
              آخر تعديل للصلاحيات
            </span>
            <div className="text-xs font-bold text-slate-800 truncate max-w-[150px]">
              {latestLog ? latestLog.user_name : 'لا يوجد سجل بعد'}
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">
              {latestLog
                ? new Date(latestLog.timestamp).toLocaleDateString('ar-EG', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeSubTab === 'users'
              ? 'bg-[#111111] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-[#E5E7EB]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>جدول المستخدمين والأدوار ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeSubTab === 'matrix'
              ? 'bg-[#111111] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-[#E5E7EB]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>مصفوفة الصلاحيات التفصيلية (Permissions Matrix)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeSubTab === 'logs'
              ? 'bg-[#111111] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-[#E5E7EB]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل تغييرات الأدوار (Role Change Logs)</span>
          {roleLogs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800 font-mono">
              {roleLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: USERS LIST & ROLE MANAGEMENT */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Filters & Search Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-2xs space-y-3">
            {/* Row 1: Search & Status Filter */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="البحث بالاسم، البريد الإلكتروني، أو القسم..."
                  className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#D62828] focus:outline-hidden transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    مسح
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                  الحالة:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-[#E5E7EB] rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#D62828] focus:outline-hidden cursor-pointer w-full sm:w-auto"
                >
                  <option value="ALL">كافة الحالات (الكل)</option>
                  <option value="ACTIVE">نشط (Active)</option>
                  <option value="INACTIVE">غير نشط (Inactive)</option>
                  <option value="SUSPENDED">موقوف (Suspended)</option>
                </select>
              </div>
            </div>

            {/* Row 2: Role Filter Chips with User Counts */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold pt-1 border-t border-slate-100">
              <span className="text-slate-400 whitespace-nowrap ml-1">
                تصفية حسب الدور:
              </span>
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                  roleFilter === 'ALL'
                    ? 'bg-[#111111] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الكل ({roleCounts.ALL})
              </button>

              {(Object.keys(ROLES_CONFIG) as UserRole[]).map((r) => {
                const count = roleCounts[r] || 0;
                const isSelected = roleFilter === r;
                return (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer border ${
                      isSelected
                        ? 'bg-[#D62828] text-white border-[#D62828] shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-[#E5E7EB]'
                    }`}
                  >
                    <RoleIcon role={r} className="w-3.5 h-3.5" />
                    <span>{r}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-[#E5E7EB] font-bold">
                    <th className="p-4">الموظف / المستخدم</th>
                    <th className="p-4">البريد الإلكتروني</th>
                    <th className="p-4">الدور المصنعي الحالي</th>
                    <th className="p-4">حالة الحساب</th>
                    <th className="p-4 text-center">الإجراءات والتحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        لا يوجد موظفون يطابقون خيارات البحث والتصفية المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const userStatus = u.status || 'ACTIVE';
                      const isCurrentActive =
                        currentUser && currentUser.id === u.id;

                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-slate-50/70 transition ${
                            isCurrentActive ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          {/* User Info with Avatar & Status Dot */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                name={u.name}
                                role={u.role}
                                avatar={u.avatar}
                                size="md"
                                status={userStatus}
                                showStatusDot={true}
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 text-sm block">
                                    {u.name}
                                  </span>
                                  {isCurrentActive && (
                                    <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-rose-100 text-rose-700 font-bold">
                                      الحساب المحاكى حالياً
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {u.id} {u.department ? `• ${u.department}` : ''}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="p-4 text-slate-600 font-mono text-xs">
                            {u.email}
                          </td>

                          {/* Role Badge with Icon & Distinct Color */}
                          <td className="p-4">
                            <RoleBadge
                              role={u.role}
                              size="sm"
                              showIcon={true}
                              showArabic={true}
                            />
                          </td>

                          {/* Account Status with Direct Dropdown/Toggle */}
                          <td className="p-4">
                            <div className="inline-flex items-center gap-1.5">
                              {userStatus === 'ACTIVE' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>نشط (Active)</span>
                                </span>
                              )}
                              {userStatus === 'INACTIVE' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  <span>غير نشط (Inactive)</span>
                                </span>
                              )}
                              {userStatus === 'SUSPENDED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span>موقوف (Suspended)</span>
                                </span>
                              )}

                              {/* Quick Toggle Status Menu */}
                              <select
                                value={userStatus}
                                onChange={(e) =>
                                  handleToggleStatus(
                                    u,
                                    e.target.value as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
                                  )
                                }
                                className="text-[11px] bg-white border border-[#E5E7EB] rounded-lg px-2 py-1 text-slate-600 font-bold focus:ring-1 focus:ring-[#D62828] cursor-pointer hover:bg-slate-50"
                                title="تغيير حالة الحساب"
                              >
                                <option value="ACTIVE">تنشيط الحساب</option>
                                <option value="INACTIVE">تعطيل الحساب</option>
                                <option value="SUSPENDED">إيقاف مؤقت</option>
                              </select>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Edit Role Button */}
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setSelectedRole(u.role);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-[#111111] hover:bg-black text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>تعديل الدور</span>
                              </button>

                              {/* Inspect Permissions Details */}
                              <button
                                onClick={() => setInspectingUser(u)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200"
                                title="معاينة تفاصيل الصلاحيات"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">التفاصيل</span>
                              </button>

                              {/* Switch Simulation User */}
                              <button
                                onClick={() => {
                                  onSelectActiveUser(u);
                                  showNotification(
                                    `تم تفعيل محاكاة المستخدم: ${u.name} (${u.role})`,
                                    'success'
                                  );
                                }}
                                disabled={isCurrentActive}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                                  isCurrentActive
                                    ? 'bg-rose-50 text-rose-400 border border-rose-100 cursor-default'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-[#E5E7EB]'
                                }`}
                                title="محاكاة جلسة هذا المستخدم"
                              >
                                {isCurrentActive ? 'المستخدم الحالي' : 'تبديل إليه'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED PERMISSIONS MATRIX (صفحة الصلاحيات التفصيلية لكل دور) */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-6">
          {/* Role Selector Header */}
          <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#D62828]" />
                <span>مصفوفة الصلاحيات التفصيلية حسب الدور الوظيفي</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                استعرض تفاصيل الشاشات المسموح بها والمحجوبة، وصلاحيات الإضافة،
                التعديل، الحذف والتصدير لكل دور
              </p>
            </div>

            {/* Role Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(Object.keys(ROLES_CONFIG) as UserRole[]).map((r) => {
                const isSelected = matrixRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => setMatrixRole(r)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-[#111111] text-white border-[#111111] shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-[#E5E7EB]'
                    }`}
                  >
                    <RoleIcon role={r} className="w-4 h-4" />
                    <span>{r}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Role Detailed Overview */}
          {(() => {
            const currentCfg = ROLES_CONFIG[matrixRole] || ROLES_CONFIG['VIEWER'];
            const detailed = currentCfg.detailed;

            return (
              <div className="space-y-6">
                {/* Role Banner */}
                <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: currentCfg.accentColor }}
                  />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
                        style={{ backgroundColor: currentCfg.accentColor }}
                      >
                        <RoleIcon role={matrixRole} className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-black text-slate-900 font-['Cairo']">
                            {currentCfg.title}
                          </h4>
                          <RoleBadge role={matrixRole} showIcon={false} size="sm" />
                        </div>
                        <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                          {currentCfg.description}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs">
                      <span className="text-slate-400 block font-bold">
                        الشاشة الافتراضية عند الدخول:
                      </span>
                      <span className="font-mono font-black text-slate-800">
                        {currentCfg.defaultTab}
                      </span>
                    </div>
                  </div>
                </div>

                {/* CRUD & Export Operations Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Create Permission */}
                  <div
                    className={`p-4 rounded-2xl border ${
                      detailed.canCreate.allowed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50/60 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black font-['Cairo']">
                        صلاحيات الإضافة (Create)
                      </span>
                      {detailed.canCreate.allowed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <X className="w-5 h-5 text-rose-600" />
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700">
                      {detailed.canCreate.description}
                    </p>
                  </div>

                  {/* Edit Permission */}
                  <div
                    className={`p-4 rounded-2xl border ${
                      detailed.canEdit.allowed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50/60 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black font-['Cairo']">
                        صلاحيات التعديل (Update)
                      </span>
                      {detailed.canEdit.allowed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <X className="w-5 h-5 text-rose-600" />
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700">
                      {detailed.canEdit.description}
                    </p>
                  </div>

                  {/* Delete Permission */}
                  <div
                    className={`p-4 rounded-2xl border ${
                      detailed.canDelete.allowed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50/60 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black font-['Cairo']">
                        صلاحيات الحذف (Delete)
                      </span>
                      {detailed.canDelete.allowed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <X className="w-5 h-5 text-rose-600" />
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700">
                      {detailed.canDelete.description}
                    </p>
                  </div>

                  {/* Export Permission */}
                  <div
                    className={`p-4 rounded-2xl border ${
                      detailed.canExport.allowed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50/60 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black font-['Cairo']">
                        صلاحيات التصدير والطباعة (Export)
                      </span>
                      {detailed.canExport.allowed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <X className="w-5 h-5 text-rose-600" />
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700">
                      {detailed.canExport.description}
                    </p>
                  </div>
                </div>

                {/* Screens Allowed vs Blocked */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Allowed Screens */}
                  <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                      <h5 className="text-sm font-black text-emerald-800 font-['Cairo'] flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>الشاشات المسموح بها ({detailed.screensAllowed.length})</span>
                      </h5>
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                        صلاحية وصول كاملة
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(detailed.screensAllowed || []).map((screen) => (
                        <div
                          key={screen.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-100 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-bold text-slate-800">
                              {screen.name}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-700 font-bold">
                            tab: {screen.id}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Blocked Screens */}
                  <div className="bg-white p-5 rounded-3xl border border-rose-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                      <h5 className="text-sm font-black text-rose-800 font-['Cairo'] flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <span>الشاشات المحجوبة والمقيدة ({detailed.screensBlocked.length})</span>
                      </h5>
                      <span className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-bold">
                        محظور الوصول
                      </span>
                    </div>

                    <div className="space-y-2">
                      {detailed.screensBlocked.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-xs">
                          لا توجد أي شاشات محجوبة عن هذا الدور (Super Admin).
                        </div>
                      ) : (
                        detailed.screensBlocked?.map((screen) => (
                          <div
                            key={screen.id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/40 border border-rose-100 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-rose-500" />
                              <span className="font-bold text-slate-700">
                                {screen.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-rose-700 font-bold">
                              محجوب 403
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: ROLE CHANGE LOGS (سجل تغييرات الأدوار) */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
                <History className="w-5 h-5 text-[#D62828]" />
                <span>سجل تدقيق وتغييرات الأدوار (Role Change Audit Log)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تتبع رسمي لكافة عمليات تعديل أدوار الموظفين، المستخدم المعدل،
                والتاريخ والوقت
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1 rounded-xl text-slate-700">
              إجمالي السجلات: {roleLogs.length}
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-[#E5E7EB] font-bold">
                    <th className="p-4">رقم السجل</th>
                    <th className="p-4">الموظف المعدل</th>
                    <th className="p-4">الدور السابق</th>
                    <th className="p-4">الدور الجديد</th>
                    <th className="p-4">القائم بالتعديل</th>
                    <th className="p-4">التاريخ والوقت</th>
                    <th className="p-4">ملاحظات العملية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {roleLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        لا يوجد سجل تغييرات مسجل حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    roleLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-4 font-mono font-bold text-slate-400">
                          {log.id}
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          {log.user_name}
                        </td>
                        <td className="p-4">
                          <RoleBadge
                            role={log.old_role}
                            size="xs"
                            showArabic={false}
                          />
                        </td>
                        <td className="p-4">
                          <RoleBadge
                            role={log.new_role}
                            size="xs"
                            showArabic={false}
                          />
                        </td>
                        <td className="p-4 font-bold text-slate-700">
                          {log.modified_by}
                        </td>
                        <td className="p-4 font-mono text-slate-500 text-[11px]">
                          {new Date(log.timestamp).toLocaleString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-4 text-slate-600 text-xs">
                          {log.notes || 'تعديل الدور المصنعي'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL WITH INSTANT PREVIEW (شاشة تعديل الدور والمعاينة الفورية) */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-2xl max-w-2xl w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D62828] text-white flex items-center justify-center shadow-md">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-['Cairo']">
                    تعديل الدور الوظيفي للموظف
                  </h3>
                  <span className="text-xs text-slate-500">
                    تغيير الصلاحيات والمستوى الإداري في النظام
                  </span>
                </div>
              </div>

              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target User Info Banner */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={editingUser.name}
                  role={editingUser.role}
                  avatar={editingUser.avatar}
                  size="md"
                  status={editingUser.status || 'ACTIVE'}
                />
                <div>
                  <span className="font-bold text-slate-900 text-sm block">
                    {editingUser.name}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {editingUser.email} • ID: {editingUser.id}
                  </span>
                </div>
              </div>

              <div className="text-left">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">
                  الدور الحالي:
                </span>
                <RoleBadge role={editingUser.role} size="xs" />
              </div>
            </div>

            {/* Role Selection Dropdown / Grid */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 block">
                اختر الدور المصنعي الجديد:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(ROLES_CONFIG) as UserRole[]).map((roleKey) => {
                  const rConfig = ROLES_CONFIG[roleKey];
                  const isSelected = selectedRole === roleKey;

                  return (
                    <div
                      key={roleKey}
                      onClick={() => setSelectedRole(roleKey)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-white/10 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <RoleIcon role={roleKey} className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs truncate">
                            {roleKey}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          )}
                        </div>
                        <span
                          className={`text-[10px] block truncate ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {rConfig.title.split('(')[0].trim()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Guardrail Warning Banner */}
            {editingUser.role === 'SUPER_ADMIN' &&
              selectedRole !== 'SUPER_ADMIN' &&
              activeSuperAdminsCount <= 1 && (
                <div className="bg-rose-50 border border-rose-300 p-3.5 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-bold">
                    تحذير أمني صارم: هذا المستخدم هو مدير النظام الفائق الوحيد
                    النشط حالياً. يمنع النظام تقليص صلاحياته لتجنب إقفال إدارة
                    المنظومة.
                  </p>
                </div>
              )}

            {/* Quick Permission Preview Box (المعاينة السريعة للصلاحيات) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#D62828]" />
                  <span>معاينة الصلاحيات الممنوحة لدور ({selectedRole}):</span>
                </span>
                <span className="text-[11px] text-slate-500 font-bold">
                  {ROLES_CONFIG[selectedRole].title}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>
                    الشاشات المسموح بها:{' '}
                    <strong>
                      {ROLES_CONFIG[selectedRole].allowedTabs.length} شاشات
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>
                    الشاشة التلقائية: <strong>{ROLES_CONFIG[selectedRole].defaultTab}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  {ROLES_CONFIG[selectedRole].detailed.canCreate.allowed ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                  )}
                  <span>
                    صلاحية الإضافة:{' '}
                    <strong>
                      {ROLES_CONFIG[selectedRole].detailed.canCreate.allowed
                        ? 'متاحة'
                        : 'محظورة'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  {ROLES_CONFIG[selectedRole].detailed.canDelete.allowed ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                  )}
                  <span>
                    صلاحية الحذف:{' '}
                    <strong>
                      {ROLES_CONFIG[selectedRole].detailed.canDelete.allowed
                        ? 'متاحة'
                        : 'محظورة'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>

              <button
                onClick={handleSaveRole}
                disabled={
                  updatingRole ||
                  (editingUser.role === 'SUPER_ADMIN' &&
                    selectedRole !== 'SUPER_ADMIN' &&
                    activeSuperAdminsCount <= 1)
                }
                className="flex items-center gap-1.5 px-6 py-2.5 bg-[#D62828] hover:bg-[#B71C1C] disabled:bg-slate-300 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-[#D62828]/20"
              >
                {updatingRole && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>حفظ وتطبيق الدور فوراً</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER DETAIL INSPECTOR MODAL (شاشة تفاصيل المستخدم والصلاحيات) */}
      {inspectingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-black text-slate-900 font-['Cairo'] flex items-center gap-2">
                <Info className="w-5 h-5 text-[#D62828]" />
                <span>الملف الإداري والصلاحيات: {inspectingUser.name}</span>
              </h3>
              <button
                onClick={() => setInspectingUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Card */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <UserAvatar
                name={inspectingUser.name}
                role={inspectingUser.role}
                avatar={inspectingUser.avatar}
                size="lg"
                status={inspectingUser.status || 'ACTIVE'}
              />
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900">
                  {inspectingUser.name}
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  {inspectingUser.email}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <RoleBadge role={inspectingUser.role} size="xs" />
                  <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                    {inspectingUser.department || 'إدارة العمليات'}
                  </span>
                </div>
              </div>
            </div>

            {/* Allowed Screens Preview */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-800 block">
                الشاشات التي يمكن لهذا المستخدم الوصول إليها:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ROLES_CONFIG[inspectingUser.role]?.detailed?.screensAllowed?.map(
                  (screen) => (
                    <div
                      key={screen.id}
                      className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs font-bold text-emerald-900"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">{screen.name}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectingUser(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition cursor-pointer"
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
