const WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 15;
const MAX_REQUESTS = parsePositiveInt(process.env.SURFACE_RATE_LIMIT_PER_MINUTE, DEFAULT_MAX_REQUESTS);
const RATE_LIMIT_SCOPE = 'lexis-surface';
const buckets = new Map();

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getClientKey(req) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function getBucket(now, key) {
  const existing = buckets.get(key);
  if (existing && existing.resetAt > now) {
    return existing;
  }

  const next = {
    count: 0,
    resetAt: now + WINDOW_MS,
  };
  buckets.set(key, next);
  return next;
}

function setRateLimitHeaders(res, bucket) {
  const remaining = Math.max(0, MAX_REQUESTS - bucket.count);
  const resetInSeconds = Math.max(0, Math.ceil((bucket.resetAt - Date.now()) / 1000));

  res.set({
    'X-RateLimit-Limit': String(MAX_REQUESTS),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(resetInSeconds),
    'X-RateLimit-Scope': RATE_LIMIT_SCOPE,
  });
}

function surfaceRateLimit(req, res, next) {
  const now = Date.now();
  const key = getClientKey(req);
  const bucket = getBucket(now, key);

  if (bucket.count >= MAX_REQUESTS) {
    setRateLimitHeaders(res, bucket);

    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    const resetAtIso = new Date(bucket.resetAt).toISOString();
    const warning = `You have reached the limit of ${MAX_REQUESTS} Lexis surface requests per minute. Try again in ${retryAfterSeconds} seconds.`;

    res.set({
      'Retry-After': String(retryAfterSeconds),
      'X-RateLimit-Warning': warning,
    });

    return res.status(429).json({
      message: 'Lexis surface request quota exceeded',
      warning,
      quota: {
        scope: RATE_LIMIT_SCOPE,
        limit: MAX_REQUESTS,
        remaining: 0,
        retryAfterSeconds,
        resetAt: resetAtIso,
      },
    });
  }

  bucket.count += 1;
  setRateLimitHeaders(res, bucket);
  return next();
}

setInterval(() => {
  const now = Date.now();
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  });
}, WINDOW_MS).unref();

module.exports = {
  surfaceRateLimit,
  MAX_REQUESTS,
  WINDOW_MS,
};
