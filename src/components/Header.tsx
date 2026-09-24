import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  PhoneCall,
  Bed,
  Search,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  Moon,
  Menu,
  X,
  LayoutDashboard,
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
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  hasActiveCertificate,
  onOpenOmniSearch,
  currentUser,
  onSelectUser,
  systemUsers,
  darkMode = false,
  onToggleDarkMode,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      title: 'اكتمال خطة الإنتاج اليومية',
      desc: 'تم اعتماد 50 مرتبة رويال بوكيت بنجاح وتوليد السيريالات',
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
    <header className="no-print bg-white dark:bg-[#08152F] text-[#111111] dark:text-slate-100 sticky top-0 z-40 shadow-xs border-b border-[#E5E7EB] dark:border-slate-800 transition-colors duration-200">
      {/* Top Red Brand Accent Line */}
      <div className="h-0.5 bg-gradient-to-r from-[#D62828] via-[#B71C1C] to-[#D4AF37]" />

      {/* Main Container - Standardized to max-w-[1400px] */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-3 sm:gap-4">
          
          {/* Brand Logo & Standard Platform Title */}
          <div
            onClick={() => setActiveTab('warranty')}
            className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
            title="الصفحة الرئيسية لمنظومة سليبي - الضمان الإلكتروني"
          >
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#E53935] to-[#B71C1C] flex items-center justify-center shadow-md group-hover:scale-105 transition duration-150 shrink-0">
              <Bed className="w-5 h-5 text-white" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#D4AF37] rounded-full border-2 border-white dark:border-[#08152F]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[19px] sm:text-[21px] font-black tracking-tight text-[#08152F] dark:text-white font-['Cairo'] leading-none">
                  سليبي
                </span>
                <span className="text-[11px] font-extrabold tracking-wider text-[#E53935] uppercase font-mono leading-none">
                  SLEEPEE
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 leading-tight mt-0.5">
                نظام إدارة وتشغيل الضمان الإلكتروني
              </span>
              <span className="hidden xl:block text-[9px] font-semibold text-slate-400 dark:text-slate-400 font-sans tracking-tight leading-none mt-0.5">
                Sleepee Warranty Management Platform
              </span>
            </div>
          </div>

          {/* Center Navigation Tabs (Desktop & Laptop) */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#F5F5F5] dark:bg-slate-900 p-1 rounded-xl border border-[#E5E7EB] dark:border-slate-800 h-[42px]">
            <button
              id="tab-warranty-btn"
              onClick={() => setActiveTab('warranty')}
              className={`flex items-center gap-2 px-3.5 h-[34px] rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'warranty' || activeTab === 'customer' || activeTab === 'certificate' || activeTab === 'verify'
                  ? 'bg-[#E53935] text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-[#E53935] hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>الضمان الإلكتروني</span>
            </button>

            <button
              id="tab-admin-btn"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3.5 h-[34px] rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'admin' || activeTab === 'products'
                  ? 'bg-[#E53935] text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-[#E53935] hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>بوابة الإدارة المركزية (ERP)</span>
            </button>
          </nav>

          {/* Corporate Header Cluster: [Company Name] | [19707] | [Dark Mode Icon] */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#F8F9FA] dark:bg-slate-900/90 border border-[#E5E7EB] dark:border-slate-800 text-xs shrink-0">
            {/* Company Name */}
            <span className="hidden md:inline font-bold text-slate-800 dark:text-slate-200 text-[11px] lg:text-xs">
              الشركة العربية لصناعة مراتب السوست والإسفنج
            </span>

            <span className="hidden md:inline text-slate-300 dark:text-slate-700 select-none">|</span>

            {/* Hotline 19707 */}
            <a
              href="tel:19707"
              className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-[#E53935] dark:hover:text-[#E53935] transition font-bold text-xs"
              title="الخط الساخن: 19707"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#E53935] shrink-0" />
              <span className="font-mono tracking-wide font-black text-[#E53935]">19707</span>
            </a>

            <span className="text-slate-300 dark:text-slate-700 select-none">|</span>

            {/* Global Dark Mode Controller - Moon Icon Only */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-1 rounded-lg text-slate-700 dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400 transition cursor-pointer flex items-center justify-center"
              title="الوضع الليلي"
              aria-label="الوضع الليلي"
            >
              {darkMode ? (
                <Moon className="w-4 h-4 fill-amber-400 text-amber-400 transition-transform hover:scale-110" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300 stroke-[2] transition-transform hover:scale-110" />
              )}
            </button>
          </div>

          {/* Left/Right Actions: Omni Search, Notifications, User Profile & Mobile Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Quick Search */}
            {onOpenOmniSearch && (
              <button
                onClick={onOpenOmniSearch}
                className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#F5F5F5] dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#D62828] border border-[#E5E7EB] dark:border-slate-800 transition text-xs font-bold cursor-pointer group"
                title="البحث السريع (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-[#D62828] group-hover:scale-110 transition" />
                <span className="hidden xl:inline text-xs">بحث</span>
                <kbd className="hidden xl:inline text-[9px] bg-white dark:bg-slate-800 px-1 py-0.5 rounded text-slate-400 font-mono border border-slate-200 dark:border-slate-700">
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
                className="relative p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#D62828] border border-[#E5E7EB] dark:border-slate-800 transition cursor-pointer shadow-xs"
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
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-[#E5E7EB] dark:border-slate-800 py-3 z-50 text-right animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 pb-3 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#D62828]">تحديثات المصنع الحية</span>
                    <span className="text-sm font-black text-[#111111] dark:text-white font-['Cairo']">مركز الإشعارات</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#E5E7EB] dark:divide-slate-800">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-3.5 hover:bg-[#F5F5F5] dark:hover:bg-slate-800/60 transition text-right">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {n.time}
                          </span>
                          <span className="text-xs font-bold text-[#111111] dark:text-white">{n.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 pt-2 border-t border-[#E5E7EB] dark:border-slate-800 text-center">
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-[#D62828] hover:text-[#B71C1C] font-bold cursor-pointer"
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
                onClick={() => setActiveTab('admin')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#F5F5F5] dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 border border-[#E5E7EB] dark:border-slate-800 hover:border-[#D62828] transition cursor-pointer select-none group"
                title="ملف المستخدم والمسؤول"
              >
                <UserAvatar
                  name={activeUser.name}
                  role={activeUser.role}
                  avatar={activeUser.avatar}
                  status={activeUser.status || 'ACTIVE'}
                  size="sm"
                  showStatusDot={true}
                />
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-bold text-[#111111] dark:text-white group-hover:text-[#D62828] transition leading-tight font-['Cairo']">
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
                  className="p-1 -mr-1 rounded-lg text-slate-400 hover:text-[#D62828] hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
                  title="تبديل حساب الموظف"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showUserMenu ? 'rotate-180 text-[#D62828]' : ''}`} />
                </button>
              </div>

              {/* Quick User Switcher Menu */}
              {showUserMenu && (
                <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 dark:text-white font-['Cairo']">تبديل حساب المسؤول</span>
                    <span className="text-[10px] bg-red-50 dark:bg-red-950/40 text-[#D62828] px-2 py-0.5 rounded-full font-bold">RBAC</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1 divide-y divide-slate-50 dark:divide-slate-800/50">
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
                          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-right transition cursor-pointer ${
                            isSelected ? 'bg-red-50 dark:bg-red-950/40 text-[#D62828] font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
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
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-[#F5F5F5] dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:text-[#E53935] border border-[#E5E7EB] dark:border-slate-800 transition"
              aria-label="القائمة الرئيسية"
              title="القائمة الرئيسية"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>

        {/* Mobile Hamburger Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 px-2 border-t border-[#E5E7EB] dark:border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Mobile Corporate Info */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                  الشركة العربية لصناعة مراتب السوست والإسفنج
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Sleepee Warranty Platform
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="tel:19707"
                  className="flex items-center gap-1 text-[#E53935] font-black font-mono text-xs bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded-lg"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>19707</span>
                </a>
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  title="الوضع الليلي"
                >
                  {darkMode ? (
                    <Moon className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Navigation Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setActiveTab('warranty');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'warranty' || activeTab === 'customer' || activeTab === 'certificate' || activeTab === 'verify'
                    ? 'bg-[#E53935] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>الضمان الإلكتروني</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('admin');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'admin' || activeTab === 'products'
                    ? 'bg-[#E53935] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>بوابة الإدارة (ERP)</span>
              </button>
            </div>

            {/* Mobile Search Button */}
            {onOpenOmniSearch && (
              <button
                onClick={() => {
                  onOpenOmniSearch();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                <Search className="w-4 h-4 text-[#D62828]" />
                <span>البحث السريع في المنظومة (Ctrl+K)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
