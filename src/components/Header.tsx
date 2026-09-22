import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  PhoneCall,
  Award,
  QrCode,
  LayoutDashboard,
  Bed,
  Search,
  Bell,
  CheckCircle2,
  ChevronDown,
  User,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  Package,
} from 'lucide-react';
import { AppUser } from '../types';
import { UserAvatar } from './UserAvatar';
import { ROLES_CONFIG, AUTHORIZED_SYSTEM_USERS } from '../utils/rbac';

interface HeaderProps {
  activeTab: 'warranty' | 'products' | 'admin' | string;
  setActiveTab: (tab: any) => void;
  hasActiveCertificate?: boolean;
  onOpenOmniSearch?: () => void;
  currentUser?: AppUser | null;
  onSelectUser?: (user: AppUser) => void;
  systemUsers?: AppUser[];
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  hasActiveCertificate,
  onOpenOmniSearch,
  currentUser,
  onSelectUser,
  systemUsers,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const defaultUser = AUTHORIZED_SYSTEM_USERS.find((u) => u.id === 'USR-03') || AUTHORIZED_SYSTEM_USERS[0];
  const activeUser = currentUser || defaultUser;
  const availableUsers = systemUsers && systemUsers.length > 0 ? systemUsers : AUTHORIZED_SYSTEM_USERS;

  const notifications = [
    {
      id: 1,
      title: 'اكتمال مزامنة الإنتاج (SharePoint)',
      desc: 'تم استيراد 12 مرتبة جديدة بنجاح في خط التشغيل',
      time: 'منذ 15 دقيقة',
      type: 'production',
    },
    {
      id: 2,
      title: 'تفعيل وثيقة ضمان جديدة',
      desc: 'تم تفعيل ضمان المرتبة رويال بوكيت للعميل د. أحمد محمود',
      time: 'منذ 35 دقيقة',
      type: 'warranty',
    },
    {
      id: 3,
      title: 'جاهزية طابعات Zebra ZD220',
      desc: 'قالب الليبل القياسي 4"×3" معتمد ومتصل عبر الشبكة',
      time: 'منذ ساعة',
      type: 'hardware',
    },
  ];

  return (
    <header className="no-print bg-white text-[#111111] sticky top-0 z-40 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.06)] border-b border-[#E5E7EB]">
      {/* Top Red Brand Accent Line with Sub-Header */}
      <div className="h-1 bg-gradient-to-r from-[#D62828] via-[#B71C1C] to-[#D4AF37]" />
      
      {/* Secondary Top Strip: Brand Heritage & Hotline */}
      <div className="bg-[#F5F5F5] border-b border-[#E5E7EB] text-xs py-1.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#111111]">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#D62828]/10 text-[#D62828] font-bold text-[11px]">
              <Award className="w-3 h-3 text-[#D62828]" />
              <span>ضمان المصنع المعتمد</span>
            </span>
            <span className="hidden sm:inline text-slate-600 font-medium">
              الشركة العربية لتصنيع مراتب السوست والإسفنج
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:19707"
              className="flex items-center gap-1.5 text-[#D62828] hover:text-[#B71C1C] font-mono font-bold transition"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#D62828]" />
              <span className="tracking-wider">الخط الساخن: 19707</span>
            </a>
            <span className="text-[#E5E7EB] hidden md:inline">|</span>
            <span className="text-slate-500 text-[11px] hidden md:inline">
              خدمة العملاء على مدار 24 ساعة
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Large Brand Presence */}
          <div
            onClick={() => setActiveTab('warranty')}
            className="flex items-center gap-3.5 cursor-pointer select-none group"
            title="الصفحة الرئيسية لمنظومة سليبي - الضمان الإلكتروني"
          >
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D62828] to-[#B71C1C] flex items-center justify-center shadow-md shadow-[#D62828]/25 group-hover:scale-105 transition duration-200">
              <Bed className="w-6 h-6 text-white" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#D4AF37] rounded-full border-2 border-white flex items-center justify-center shadow-xs" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-[#111111] font-['Cairo']">سليبي</span>
                <span className="text-sm font-extrabold tracking-widest text-[#D62828] uppercase font-mono">
                  SLEEPEE
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 tracking-wide">
                نظام إدارة وتوثيق الضمان الإلكتروني
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs - Consolidated Single Warranty Hub + Central Admin Portal */}
          <nav className="hidden md:flex items-center gap-2 bg-[#F5F5F5] p-1.5 rounded-2xl border border-[#E5E7EB]">
            <button
              id="tab-warranty-btn"
              onClick={() => setActiveTab('warranty')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'warranty' || activeTab === 'customer' || activeTab === 'certificate' || activeTab === 'verify'
                  ? 'bg-[#D62828] text-white shadow-md shadow-[#D62828]/25'
                  : 'text-[#111111] hover:text-[#D62828] hover:border-[#D62828] border border-transparent hover:shadow-[0_0_12px_rgba(214,40,40,0.15)] bg-transparent'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>الضمان الإلكتروني</span>
            </button>

            <button
              id="tab-admin-btn"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                activeTab === 'admin' || activeTab === 'products'
                  ? 'bg-[#D62828] text-white shadow-md shadow-[#D62828]/25'
                  : 'text-[#111111] hover:text-[#D62828] hover:border-[#D62828] border border-transparent hover:shadow-[0_0_12px_rgba(214,40,40,0.15)] bg-transparent'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>بوابة الإدارة المركزية</span>
            </button>
          </nav>

          {/* Right Actions: Quick Search, Notification Center, User Profile Area */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Search */}
            {onOpenOmniSearch && (
              <button
                onClick={onOpenOmniSearch}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F5F5F5] text-slate-700 hover:text-[#D62828] border border-[#E5E7EB] hover:border-[#D62828] transition text-xs font-bold shadow-xs cursor-pointer group"
                title="البحث السريع (Ctrl+K)"
              >
                <Search className="w-4 h-4 text-[#D62828] group-hover:scale-110 transition" />
                <span className="hidden lg:inline">بحث سريع</span>
                <kbd className="hidden sm:inline text-[10px] bg-[#F5F5F5] px-1.5 py-0.5 rounded text-slate-500 font-mono border border-[#E5E7EB]">
                  Ctrl+K
                </kbd>
              </button>
            )}

            {/* Notification Center Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) setUnreadCount(0);
                }}
                className="relative p-2.5 rounded-xl bg-white hover:bg-[#F5F5F5] text-slate-700 hover:text-[#D62828] border border-[#E5E7EB] hover:border-[#D62828] transition cursor-pointer shadow-xs"
                title="مركز الإشعارات والتنبيهات"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D62828] text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] py-3 z-50 text-right animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 pb-3 border-b border-[#E5E7EB] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#D62828]">تحديثات المصنع الحية</span>
                    <span className="text-sm font-black text-[#111111] font-['Cairo']">مركز الإشعارات</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#E5E7EB]">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-3.5 hover:bg-[#F5F5F5] transition text-right">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {n.time}
                          </span>
                          <span className="text-xs font-bold text-[#111111]">{n.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 pt-2 border-t border-[#E5E7EB] text-center">
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-[#D62828] hover:text-[#B71C1C] font-bold"
                    >
                      إغلاق القائمة
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Area */}
            <div className="relative" ref={userMenuRef}>
              <div
                onClick={() => {
                  setActiveTab('admin');
                }}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#F5F5F5] hover:bg-white border border-[#E5E7EB] hover:border-[#D62828] transition cursor-pointer select-none group"
                title="ملف المستخدم والمسؤول - انقر للانتقال للوحة الإدارة"
              >
                <UserAvatar
                  name={activeUser.name}
                  role={activeUser.role}
                  avatar={activeUser.avatar}
                  status={activeUser.status || 'ACTIVE'}
                  size="sm"
                  showStatusDot={true}
                />
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-[#111111] group-hover:text-[#D62828] transition leading-tight font-['Cairo']">
                    {activeUser.name}
                  </div>
                  <div className="text-[10px] text-[#D62828] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span>{ROLES_CONFIG[activeUser.role]?.title || activeUser.role}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                  }}
                  className="p-1 -mr-1 rounded-lg text-slate-400 hover:text-[#D62828] hover:bg-slate-200/60 transition"
                  title="تبديل حساب الموظف"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showUserMenu ? 'rotate-180 text-[#D62828]' : ''}`} />
                </button>
              </div>

              {/* Quick User Switcher Menu */}
              {showUserMenu && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 font-['Cairo']">تبديل حساب المسؤول</span>
                    <span className="text-[10px] bg-red-50 text-[#D62828] px-2 py-0.5 rounded-full font-bold">RBAC</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1 divide-y divide-slate-50">
                    {availableUsers.map((u) => {
                      const isSelected = u.id === activeUser.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            if (onSelectUser) onSelectUser(u);
                            setShowUserMenu(false);
                          }}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-right transition ${
                            isSelected ? 'bg-red-50 text-[#D62828] font-bold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <UserAvatar
                            name={u.name}
                            role={u.role}
                            avatar={u.avatar}
                            status={u.status || 'ACTIVE'}
                            size="sm"
                            showStatusDot={true}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate leading-tight">{u.name}</div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">
                              {ROLES_CONFIG[u.role]?.title || u.role}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#D62828] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="px-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('admin');
                        setShowUserMenu(false);
                      }}
                      className="text-xs text-[#D62828] font-bold hover:underline"
                    >
                      إدارة الصلاحيات (RBAC) ←
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Admin Trigger */}
            <button
              onClick={() => setActiveTab('admin')}
              className="md:hidden p-2 rounded-xl bg-[#F5F5F5] text-[#D62828] border border-[#E5E7EB]"
              title="لوحة الإدارة"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2.5 border-t border-[#E5E7EB] text-xs font-bold">
          <button
            onClick={() => setActiveTab('warranty')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'warranty' || activeTab === 'customer' || activeTab === 'certificate' || activeTab === 'verify' ? 'text-[#D62828]' : 'text-slate-500'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span>الضمان الإلكتروني</span>
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'admin' || activeTab === 'products' ? 'text-[#D62828]' : 'text-slate-500'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>بوابة الإدارة المركزية</span>
          </button>
        </div>
      </div>
    </header>
  );
};
