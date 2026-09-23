import React from 'react';
import { UserRole } from '../types';
import { Crown, Factory, ClipboardCheck, Headset, Cog, Eye } from 'lucide-react';
import { ROLES_CONFIG } from '../utils/rbac';

export const ROLE_ICONS: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  SUPER_ADMIN: Crown,
  GENERAL_MANAGER: Crown,
  PLANT_MANAGER: Factory,
  QUALITY_MANAGER: ClipboardCheck,
  CUSTOMER_SERVICE: Headset,
  PRODUCTION: Cog,
  VIEWER: Eye,
};

export const ROLE_COLOR_CONFIGS: Record<
  UserRole,
  {
    bg: string;
    text: string;
    border: string;
    iconBg: string;
    hex: string;
    lightHex: string;
  }
> = {
  SUPER_ADMIN: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    iconBg: 'bg-rose-600 text-white',
    hex: '#D62828',
    lightHex: '#FEE2E2',
  },
  GENERAL_MANAGER: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    iconBg: 'bg-indigo-600 text-white',
    hex: '#4F46E5',
    lightHex: '#E0E7FF',
  },
  PLANT_MANAGER: {
    bg: 'bg-slate-900',
    text: 'text-white',
    border: 'border-slate-800',
    iconBg: 'bg-slate-700 text-white',
    hex: '#0F172A',
    lightHex: '#F1F5F9',
  },
  QUALITY_MANAGER: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    iconBg: 'bg-amber-500 text-white',
    hex: '#D4AF37',
    lightHex: '#FEF3C7',
  },
  CUSTOMER_SERVICE: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    iconBg: 'bg-blue-600 text-white',
    hex: '#2563EB',
    lightHex: '#DBEAFE',
  },
  PRODUCTION: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    iconBg: 'bg-emerald-600 text-white',
    hex: '#059669',
    lightHex: '#D1FAE5',
  },
  VIEWER: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    iconBg: 'bg-slate-400 text-white',
    hex: '#64748B',
    lightHex: '#F3F4F6',
  },
};

export const RoleIcon: React.FC<{
  role: UserRole;
  className?: string;
  withContainer?: boolean;
}> = ({ role, className = 'w-4 h-4', withContainer = false }) => {
  const IconComponent = ROLE_ICONS[role] || Eye;
  const colors = ROLE_COLOR_CONFIGS[role] || ROLE_COLOR_CONFIGS.VIEWER;

  if (withContainer) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-lg p-1 ${colors.iconBg} shadow-2xs`}
      >
        <IconComponent className={className} />
      </span>
    );
  }

  return <IconComponent className={className} />;
};

interface RoleBadgeProps {
  role: UserRole;
  showIcon?: boolean;
  showArabic?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  showIcon = true,
  showArabic = true,
  size = 'sm',
  className = '',
}) => {
  const info = ROLES_CONFIG[role] || ROLES_CONFIG.VIEWER;
  const colors = ROLE_COLOR_CONFIGS[role] || ROLE_COLOR_CONFIGS.VIEWER;
  const IconComponent = ROLE_ICONS[role] || Eye;

  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3 py-1.5 gap-2',
    lg: 'text-base px-4 py-2 gap-2.5',
  };

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses[size]} transition shadow-2xs whitespace-nowrap ${className}`}
      title={info.title}
    >
      {showIcon && (
        <IconComponent className={`${iconSizes[size]} flex-shrink-0`} />
      )}
      <span className="font-mono">{role}</span>
      {showArabic && (
        <span className="opacity-80 text-[10px] font-sans">
          • {info.title.split('(')[0].trim()}
        </span>
      )}
    </span>
  );
};
