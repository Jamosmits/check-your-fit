import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

function getKey(req: Request, prefix: string): string {
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown';
  return `${prefix}:${ip}`;
}

function createLimiter(
  maxRequests: number,
  windowMs: number,
  prefix: string,
  message: string
) {
  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const key = getKey(req, prefix);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
      res.status(429).json({ error: message });
      return;
    }

    entry.count += 1;
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
    next();
  };
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/** Strict limiter for auth endpoints: 10 requests per 15 minutes */
export const authRateLimit = createLimiter(
  10,
  15 * 60 * 1000,
  'auth',
  'Too many authentication attempts. Please try again later.'
);

/** General API limiter: 100 requests per minute */
export const apiRateLimit = createLimiter(
  100,
  60 * 1000,
  'api',
  'Too many requests. Please slow down.'
);

/** Heavy AI operation limiter: 20 requests per 10 minutes */
export const aiRateLimit = createLimiter(
  20,
  10 * 60 * 1000,
  'ai',
  'Too many AI requests. Please wait before trying again.'
);

/** Scan job limiter: 5 scans per hour */
export const scanRateLimit = createLimiter(
  5,
  60 * 60 * 1000,
  'scan',
  'Scan limit reached. You can start up to 5 scans per hour.'
);
