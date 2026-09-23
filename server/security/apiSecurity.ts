import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../repositories/types.js';
import { requireAuthentication } from './auth.js';
import { INTERNAL_ROLES, requireRoles } from './rbac.js';
import { rateLimit } from './rateLimit.js';

const publicLookupLimiter = rateLimit({ scope: 'public-lookup', windowMs: 60_000, max: 60 });
const publicActivationLimiter = rateLimit({ scope: 'public-activation', windowMs: 60 * 60_000, max: 10 });

function protect(roles: UserRole[]) {
  const authorize = requireRoles(...roles);
  return (req: Request, res: Response, next: NextFunction) =>
    requireAuthentication(req, res, () => authorize(req, res, next));
}

export function apiSecurity(req: Request, res: Response, next: NextFunction) {
  const path = req.path;
  const method = req.method;

  if (path === '/health' || path.startsWith('/health/')) return next();

  // Static-password login has intentionally been retired. Firebase Auth is the
  // only supported identity source for privileged API calls.
  if (path === '/admin/login') {
    return res.status(410).json({
      error: 'LEGACY_LOGIN_RETIRED',
      message: 'تم إيقاف تسجيل الدخول التقليدي. يرجى تسجيل الدخول باستخدام حساب Google المعتمد.',
    });
  }

  if (
    (method === 'GET' && (
      path.startsWith('/warranty/verify/') ||
      path.startsWith('/products/verify-qr/') ||
      path.startsWith('/verify/qr/') ||
      path.startsWith('/claims/') ||
      (path === '/claims' && req.query.search) ||
      (path === '/replacements' && req.query.search)
    )) ||
    (method === 'POST' && path === '/warranty/activate') ||
    (method === 'POST' && path === '/claims')
  ) {
    return (method === 'POST' ? publicActivationLimiter : publicLookupLimiter)(req, res, next);
  }

  if (path === '/products/search') return publicLookupLimiter(req, res, next);

  if (path.startsWith('/admin') || path.startsWith('/users') || path.startsWith('/automation') || path.startsWith('/db')) {
    return protect(['SUPER_ADMIN'])(req, res, next);
  }

  if (path.startsWith('/production')) {
    return protect(['SUPER_ADMIN', 'PLANT_MANAGER', 'PRODUCTION'])(req, res, next);
  }

  if (path.startsWith('/powerbi')) {
    return protect(['SUPER_ADMIN', 'QUALITY_MANAGER', 'PLANT_MANAGER'])(req, res, next);
  }

  if (path.startsWith('/quality')) {
    return protect(['SUPER_ADMIN', 'QUALITY_MANAGER'])(req, res, next);
  }

  if (path.startsWith('/claims')) {
    return protect(method === 'GET'
      ? INTERNAL_ROLES
      : ['SUPER_ADMIN', 'QUALITY_MANAGER', 'CUSTOMER_SERVICE'])(req, res, next);
  }

  if (path.startsWith('/replacements')) {
    return protect(method === 'GET'
      ? INTERNAL_ROLES
      : ['SUPER_ADMIN', 'QUALITY_MANAGER'])(req, res, next);
  }

  if (path.startsWith('/lifecycle')) {
    return protect(method === 'GET'
      ? INTERNAL_ROLES
      : ['SUPER_ADMIN', 'QUALITY_MANAGER', 'PLANT_MANAGER', 'PRODUCTION', 'CUSTOMER_SERVICE'])(req, res, next);
  }

  if (path.startsWith('/attachments') || path.startsWith('/customer-service') || path.startsWith('/customer-360') || path.startsWith('/search')) {
    return protect(['SUPER_ADMIN', 'QUALITY_MANAGER', 'PLANT_MANAGER', 'CUSTOMER_SERVICE'])(req, res, next);
  }

  if (path.startsWith('/products')) {
    return protect(method === 'GET'
      ? INTERNAL_ROLES
      : ['SUPER_ADMIN', 'PLANT_MANAGER', 'PRODUCTION'])(req, res, next);
  }

  if (path.startsWith('/warranty')) {
    return protect(INTERNAL_ROLES)(req, res, next);
  }

  // New API routes are protected by default until deliberately classified.
  return protect(INTERNAL_ROLES)(req, res, next);
}
