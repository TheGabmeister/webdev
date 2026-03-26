import rateLimit from 'express-rate-limit';

export const registerRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests, please try again later' },
});

const ALL_KEYS = ['::ffff:127.0.0.1', '127.0.0.1', '::1'];

export function resetRateLimiters() {
  for (const key of ALL_KEYS) {
    registerRateLimit.resetKey(key);
    loginRateLimit.resetKey(key);
    uploadRateLimit.resetKey(key);
  }
}
