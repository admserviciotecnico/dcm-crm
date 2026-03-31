import { sendError } from '../utils/http.js';

const buckets = new Map();
const CLEANUP_THRESHOLD = 10_000;

function cleanupExpiredBuckets(now, windowMs) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.start > windowMs) {
      buckets.delete(key);
    }
  }
}

export function rateLimit({ windowMs = 60_000, max = 20 } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, start: now };

    if (buckets.size > CLEANUP_THRESHOLD) {
      cleanupExpiredBuckets(now, windowMs);
    }

    if (now - bucket.start > windowMs) {
      bucket.count = 0;
      bucket.start = now;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > max) {
      return sendError(res, 429, 'Too many requests');
    }
    next();
  };
}
