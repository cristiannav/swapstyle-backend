import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { sendError } from '../utils/response.js';

export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'TOO_MANY_REQUESTS', 'Too many requests, please try again later');
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: 'Too many authentication attempts',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'TOO_MANY_AUTH_ATTEMPTS', 'Too many authentication attempts, please try again later');
  },
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Upload limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'UPLOAD_LIMIT_EXCEEDED', 'Upload limit exceeded, please try again later');
  },
});

export const swipeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 swipes per minute
  message: 'Swipe limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'SWIPE_LIMIT_EXCEEDED', 'Swipe limit exceeded, please slow down');
  },
});
