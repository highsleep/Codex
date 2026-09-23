import type { NextFunction, Request, Response } from 'express';

interface Bucket { count: number; resetAt: number; }
const buckets = new Map<string, Bucket>();

export function rateLimit(options: { windowMs: number; max: number; scope: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.scope}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + options.windowMs } : current;
    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > options.max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ error: 'RATE_LIMITED', message: 'تم تجاوز الحد المؤقت للطلبات. يرجى المحاولة لاحقاً.' });
    }
    return next();
  };
}
