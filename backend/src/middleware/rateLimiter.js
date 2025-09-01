/**
 * Rate Limiting Middleware
 * Implements various rate limiting strategies for authentication endpoints
 */

import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

/**
 * General authentication rate limiter
 * 5 attempts per 15 minutes per IP
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const clientIp = req.ip;
    logger.warn(`Auth rate limit exceeded for IP: ${clientIp}`, {
      ip: clientIp,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts. Please try again in 15 minutes.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  },
  skip: (req) => {
    // Skip rate limiting for successful authentication
    return false;
  }
});

/**
 * Strict rate limiter for password reset requests
 * 3 attempts per hour per IP
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    error: 'Too many password reset requests. Please try again in 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const clientIp = req.ip;
    logger.warn(`Password reset rate limit exceeded for IP: ${clientIp}`, {
      ip: clientIp,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many password reset requests. Please try again in 1 hour.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Registration rate limiter
 * 3 registrations per hour per IP
 */
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again in 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const clientIp = req.ip;
    logger.warn(`Registration rate limit exceeded for IP: ${clientIp}`, {
      ip: clientIp,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many registration attempts. Please try again in 1 hour.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const clientIp = req.ip;
    logger.warn(`General rate limit exceeded for IP: ${clientIp}`, {
      ip: clientIp,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Token refresh rate limiter
 * 10 refresh attempts per 5 minutes per IP
 */
export const tokenRefreshRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 attempts per window
  message: {
    success: false,
    error: 'Too many token refresh attempts. Please try again in 5 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const clientIp = req.ip;
    logger.warn(`Token refresh rate limit exceeded for IP: ${clientIp}`, {
      ip: clientIp,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many token refresh attempts. Please try again in 5 minutes.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});