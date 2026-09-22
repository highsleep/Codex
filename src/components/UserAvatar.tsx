import React, { useState } from 'react';
import { UserRole } from '../types';
import {
  Crown,
  Factory,
  ClipboardCheck,
  Headset,
  Cog,
  Eye,
  User,
} from 'lucide-react';

interface UserAvatarProps {
  name: string;
  role?: UserRole | string;
  avatar?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showStatusDot?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

// Get clean 2-letter Arabic or Latin initials
function getInitials(name: string): string {
  if (!name) return 'SH';
  // Remove titles like م., أ., د., المهندس, الأستاذ
  const clean = name
    .replace(/^(م\.|أ\.|د\.|المهندس|الأستاذ|الاستاذ)\s+/gi, '')
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Role-based gradient and visual styling
const ROLE_AVATAR_THEMES: Record<
  string,
  {
    gradient: string;
    border: string;
    textColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  SUPER_ADMIN: {
    gradient: 'from-[#111111] via-[#8B0000] to-[#D62828]',
    border: 'border-[#D62828]/40',
    textColor: 'text-white',
    icon: Crown,
  },
  QUALITY_MANAGER: {
    gradient: 'from-[#996515] via-[#B89726] to-[#D4AF37]',
    border: 'border-[#D4AF37]/50',
    textColor: 'text-white',
    icon: ClipboardCheck,
  },
  PLANT_MANAGER: {
    gradient: 'from-[#0F172A] via-[#1E293B] to-[#334155]',
    border: 'border-slate-500/40',
    textColor: 'text-white',
    icon: Factory,
  },
  CUSTOMER_SERVICE: {
    gradient: 'from-[#1E3A8A] via-[#1D4ED8] to-[#3B82F6]',
    border: 'border-blue-400/40',
    textColor: 'text-white',
    icon: Headset,
  },
  PRODUCTION: {
    gradient: 'from-[#064E3B] via-[#047857] to-[#10B981]',
    border: 'border-emerald-400/40',
    textColor: 'text-white',
    icon: Cog,
  },
  TECHNICIAN: {
    gradient: 'from-[#78350F] via-[#B45309] to-[#F59E0B]',
    border: 'border-amber-400/40',
    textColor: 'text-white',
    icon: User,
  },
  VIEWER: {
    gradient: 'from-[#374151] via-[#4B5563] to-[#6B7280]',
    border: 'border-slate-400/30',
    textColor: 'text-white',
    icon: Eye,
  },
};

const SIZE_CONFIGS = {
  xs: {
    box: 'w-7 h-7 rounded-lg text-[10px]',
    icon: 'w-2.5 h-2.5',
    dot: 'w-2 h-2',
  },
  sm: {
    box: 'w-9 h-9 rounded-xl text-xs',
    icon: 'w-3 h-3',
    dot: 'w-2.5 h-2.5',
  },
  md: {
    box: 'w-10 h-10 rounded-xl text-xs font-black',
    icon: 'w-3.5 h-3.5',
    dot: 'w-3 h-3',
  },
  lg: {
    box: 'w-12 h-12 rounded-2xl text-sm font-black',
    icon: 'w-4 h-4',
    dot: 'w-3.5 h-3.5',
  },
  xl: {
    box: 'w-16 h-16 rounded-3xl text-base font-black',
    icon: 'w-5 h-5',
    dot: 'w-4 h-4',
  },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  role = 'VIEWER',
  avatar,
  size = 'md',
  className = '',
  showStatusDot = true,
  status = 'ACTIVE',
}) => {
  const [imageFailed, setImageFailed] = useState<boolean>(false);
  const theme = ROLE_AVATAR_THEMES[role] || ROLE_AVATAR_THEMES.VIEWER;
  const sizeCfg = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  const initials = getInitials(name);
  const RoleIcon = theme.icon;

  const hasValidAvatar = avatar && !imageFailed;

  const statusColor =
    status === 'SUSPENDED'
      ? 'bg-rose-500 ring-rose-600/30'
      : status === 'INACTIVE'
      ? 'bg-slate-400 ring-slate-500/30'
      : 'bg-emerald-500 ring-emerald-600/30';

  const statusTitle =
    status === 'SUSPENDED'
      ? 'موقوف (Suspended)'
      : status === 'INACTIVE'
      ? 'غير نشط (Inactive)'
      : 'نشط في النظام (Active)';

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {hasValidAvatar ? (
        <img
          src={avatar}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className={`${sizeCfg.box} object-cover border-2 border-white shadow-xs ${theme.border}`}
        />
      ) : (
        <div
          className={`${sizeCfg.box} bg-gradient-to-br ${theme.gradient} ${theme.textColor} border-2 border-white/80 shadow-xs flex items-center justify-center font-['Cairo'] tracking-tight select-none relative overflow-hidden`}
          title={`${name} (${role})`}
        >
          {/* Subtle watermark Role Icon in background */}
          <RoleIcon className="absolute -bottom-1 -left-1 w-1/2 h-1/2 opacity-25 text-white pointer-events-none" />
          <span className="relative z-10">{initials}</span>
        </div>
      )}

      {showStatusDot && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${sizeCfg.dot} ${statusColor} border-2 border-white rounded-full ring-1`}
          title={statusTitle}
        />
      )}
    </div>
  );
};
