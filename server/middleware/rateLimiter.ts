import { rateLimit } from 'express-rate-limit';

export const createMessageLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 5, // 5 messages per second
  message: 'Too many messages, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
