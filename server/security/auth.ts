import type { NextFunction, Request, Response } from 'express';
import { applicationDefault, cert, getApps, initializeApp, deleteApp, getApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import type { UserRole } from '../repositories/types.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';

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
  'GENERAL_MANAGER',
  'PRODUCTION',
  'CUSTOMER_SERVICE',
  'VIEWER',
];

function getFirebaseProjectId(): string | undefined {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.projectId;
    }
  } catch (err) {
    console.error('Error reading firebase-applet-config.json:', err);
  }
  return undefined;
}

async function initializeFirebaseAdmin(): Promise<boolean> {
  const targetProjectId = getFirebaseProjectId();

  if (getApps().length > 0) {
    try {
      const currentApp = getApp();
      const currentProjectId = currentApp.options.projectId;
      if (targetProjectId && currentProjectId !== targetProjectId) {
        console.log(`Re-initializing Firebase Admin: changing project ID from "${currentProjectId}" to "${targetProjectId}"`);
        await deleteApp(currentApp);
      } else {
        return true;
      }
    } catch (err) {
      console.error('Error checking existing Firebase app:', err);
    }
  }

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const options: any = {};
    if (serviceAccount) {
      options.credential = cert(JSON.parse(serviceAccount));
    } else {
      options.credential = applicationDefault();
    }
    
    if (targetProjectId) {
      options.projectId = targetProjectId;
    }

    initializeApp(options);
    console.log(`Firebase Admin initialized successfully with project ID: "${targetProjectId || 'default'}"`);
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
    'gm@sleephigh.com': 'GENERAL_MANAGER',
    'production.eg@sleephigh.com': 'PRODUCTION',
    'm.hassan@sleephigh.com': 'CUSTOMER_SERVICE',
    'hossam@sleephigh.com': 'VIEWER',
  };

  return roles[email] || 'VIEWER';
}

let cachedCertificates: Record<string, string> = {};
let certsExpiryTime = 0;

function fetchGooglePublicCertificates(): Promise<Record<string, string>> {
  if (Date.now() < certsExpiryTime && Object.keys(cachedCertificates).length > 0) {
    return Promise.resolve(cachedCertificates);
  }

  return new Promise((resolve, reject) => {
    https.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', (res) => {
      let data = '';
      const cacheControl = res.headers['cache-control'] || '';
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
      const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;

      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const certs = JSON.parse(data);
          cachedCertificates = certs;
          certsExpiryTime = Date.now() + maxAge * 1000;
          resolve(certs);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function parseJwt(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
  const signature = parts[2];
  return { header, payload, signature, rawHeaderAndPayload: `${parts[0]}.${parts[1]}` };
}

async function verifyIdTokenManually(tokenStr: string, projectId: string): Promise<DecodedIdToken> {
  const { header, payload, signature, rawHeaderAndPayload } = parseJwt(tokenStr);

  if (header.alg !== 'RS256') {
    throw new Error('Unsupported algorithm');
  }

  const expectedIssuer = `https://securetoken.google.com/${projectId}`;
  if (payload.iss !== expectedIssuer) {
    throw new Error(`Issuer mismatch. Expected: ${expectedIssuer}, got: ${payload.iss}`);
  }
  if (payload.aud !== projectId) {
    throw new Error(`Audience mismatch. Expected: ${projectId}, got: ${payload.aud}`);
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp < nowInSeconds) {
    throw new Error('Token has expired');
  }

  const certs = await fetchGooglePublicCertificates();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error('Certificate not found for the specified kid');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(rawHeaderAndPayload);
  
  const isVerified = verifier.verify(cert, signature, 'base64url');
  if (!isVerified) {
    throw new Error('JWT signature verification failed');
  }

  return {
    ...payload,
    uid: payload.sub,
    email_verified: payload.email_verified,
  } as unknown as DecodedIdToken;
}

export async function requireAuthentication(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'AUTHENTICATION_REQUIRED', message: 'يلزم تسجيل الدخول لإتمام هذا الإجراء.' });
  }

  if (!(await initializeFirebaseAdmin())) {
    return res.status(503).json({
      error: 'AUTHENTICATION_NOT_CONFIGURED',
      message: 'تعذر التحقق من الهوية على الخادم. يرجى التواصل مع مسؤول النظام.',
    });
  }

  let token: DecodedIdToken;
  try {
    token = await getAuth().verifyIdToken(match[1], false);
  } catch (err: any) {
    console.warn('verifyIdToken with firebase-admin failed, attempting self-contained manual verification:', err?.message || String(err));
    try {
      const projectId = getFirebaseProjectId() || 'ai-studio-applet-webapp-d4a64';
      token = await verifyIdTokenManually(match[1], projectId);
      console.log('Self-contained manual verification succeeded!');
    } catch (manualErr: any) {
      console.error('Self-contained manual verification failed:', manualErr?.message || String(manualErr));
      return res.status(401).json({ error: 'INVALID_AUTHENTICATION_TOKEN', message: 'رمز تسجيل الدخول غير صالح أو منتهي الصلاحية.' });
    }
  }

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
}

export function authenticatedActor(req: Request): string {
  const principal = req.principal;
  if (!principal) return 'unknown-authenticated-actor';
  return `${principal.email} (${principal.role})`;
}
