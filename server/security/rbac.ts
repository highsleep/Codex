import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../repositories/types.js';

export const INTERNAL_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'QUALITY_MANAGER',
  'PLANT_MANAGER',
  'PRODUCTION',
  'CUSTOMER_SERVICE',
  'VIEWER',
];

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.principal) {
      return res.status(401).json({ error: 'AUTHENTICATION_REQUIRED', message: 'يلزم تسجيل الدخول لإتمام هذا الإجراء.' });
    }
    if (!roles.includes(req.principal.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'لا تملك الصلاحية اللازمة لتنفيذ هذا الإجراء.' });
    }
    return next();
  };
}
