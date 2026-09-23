import type { NextFunction, Request, Response } from 'express';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import type { UserRole } from '../repositories/types.js';

export interface AuthenticatedPrincipal {
  uid: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  source: 'firebase-token';
}

declare global {
  namespace Express {
    interface Request {
      principal?: AuthenticatedPrincipal;
    }
  }
}

const VALID_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'QUALITY_MANAGER',
  'PLANT_MANAGER',
  'PRODUCTION',
  'CUSTOMER_SERVICE',
  'VIEWER',
];

function initializeFirebaseAdmin(): boolean {
  if (getApps().length > 0) return true;

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    initializeApp(
      serviceAccount
        ? { credential: cert(JSON.parse(serviceAccount)) }
        : { credential: applicationDefault() }
    );
    return true;
  } catch (error) {
    console.error('Firebase Admin authentication is not configured:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

function resolveRole(token: DecodedIdToken): UserRole {
  const tokenRole = token.role;
  if (typeof tokenRole === 'string' && VALID_ROLES.includes(tokenRole as UserRole)) {
    return tokenRole as UserRole;
  }

  // Existing Firebase rules use this verified-email role map. Keep it server-side
  // until a managed role store/custom claims migration is complete.
  const email = (token.email || '').toLowerCase();
  const roles: Record<string, UserRole> = {
    'malamoudi@sleephigh.com': 'SUPER_ADMIN',
    'wsb@sleephigh.com': 'SUPER_ADMIN',
    'highsleepwarranty@gmail.com': 'SUPER_ADMIN',
    'sleepyqualitydept@gmail.com': 'SUPER_ADMIN',
    'quality.eg@sleephigh.com': 'QUALITY_MANAGER',
    'msharaf@sleephigh.com': 'PLANT_MANAGER',
    'production.eg@sleephigh.com': 'PRODUCTION',
    'm.hassan@sleephigh.com': 'CUSTOMER_SERVICE',
    'hossam@sleephigh.com': 'VIEWER',
  };

  return roles[email] || 'VIEWER';
}

export async function requireAuthentication(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'AUTHENTICATION_REQUIRED', message: 'يلزم تسجيل الدخول لإتمام هذا الإجراء.' });
  }

  if (!initializeFirebaseAdmin()) {
    return res.status(503).json({
      error: 'AUTHENTICATION_NOT_CONFIGURED',
      message: 'تعذر التحقق من الهوية على الخادم. يرجى التواصل مع مسؤول النظام.',
    });
  }

  try {
    const token = await getAuth().verifyIdToken(match[1], true);
    if (!token.email || token.email_verified !== true) {
      return res.status(403).json({ error: 'VERIFIED_EMAIL_REQUIRED', message: 'يلزم استخدام بريد إلكتروني تم التحقق منه.' });
    }

    req.principal = {
      uid: token.uid,
      email: token.email.toLowerCase(),
      emailVerified: true,
      role: resolveRole(token),
      source: 'firebase-token',
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'INVALID_AUTHENTICATION_TOKEN', message: 'رمز تسجيل الدخول غير صالح أو منتهي الصلاحية.' });
  }
}

export function authenticatedActor(req: Request): string {
  const principal = req.principal;
  if (!principal) return 'unknown-authenticated-actor';
  return `${principal.email} (${principal.role})`;
}
