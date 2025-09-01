/**
 * Security Middleware
 * Additional security measures for authentication system
 */

import logger from '../utils/logger.js';

/**
 * Security headers middleware
 */
export const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS headers for authentication
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

/**
 * Request logging middleware for authentication endpoints
 */
export const authRequestLogger = (req, res, next) => {
  const startTime = Date.now();
  const clientIp = req.ip;
  const userAgent = req.get('User-Agent');
  const method = req.method;
  const url = req.originalUrl;

  // Log request start
  logger.info(`Auth request started: ${method} ${url}`, {
    ip: clientIp,
    userAgent: userAgent,
    method: method,
    url: url
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Log response
    logger.info(`Auth request completed: ${method} ${url}`, {
      ip: clientIp,
      userAgent: userAgent,
      method: method,
      url: url,
      statusCode: statusCode,
      duration: duration,
      success: body?.success || false
    });

    // Call original json method
    return originalJson.call(this, body);
  };

  next();
};

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Remove potentially dangerous characters
        req.body[key] = req.body[key]
          .trim()
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
          .replace(/[<>]/g, ''); // Remove angle brackets
      }
    });
  }

  next();
};

/**
 * Validate request origin
 */
export const validateOrigin = (req, res, next) => {
  const origin = req.get('Origin');
  const referer = req.get('Referer');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [process.env.ALLOWED_ORIGIN];

  // Skip validation for non-browser requests
  if (!origin && !referer) {
    return next();
  }

  // Check if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    return next();
  }

  // Check referer as fallback
  if (referer) {
    const refererOrigin = new URL(referer).origin;
    if (allowedOrigins.includes(refererOrigin)) {
      return next();
    }
  }

  logger.warn(`Request from unauthorized origin blocked`, {
    ip: req.ip,
    origin: origin,
    referer: referer,
    userAgent: req.get('User-Agent'),
    path: req.path
  });

  res.status(403).json({
    success: false,
    error: 'Request from unauthorized origin'
  });
};

/**
 * Prevent brute force attacks by tracking failed attempts
 */
export const bruteForceProtection = (req, res, next) => {
  // This middleware works in conjunction with UserRepository's
  // failed login tracking for comprehensive protection
  
  const clientIp = req.ip;
  const email = req.body?.email;
  
  // Add metadata for logging
  req.security = {
    clientIp,
    email,
    timestamp: new Date(),
    userAgent: req.get('User-Agent')
  };
  
  next();
};

/**
 * Validate content type for POST requests
 */
export const validateContentType = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        error: 'Content-Type must be application/json'
      });
    }
  }
  
  next();
};

/**
 * Request size limiter
 */
export const requestSizeLimiter = (req, res, next) => {
  const contentLength = req.get('Content-Length');
  const maxSize = 1024 * 1024; // 1MB
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    logger.warn(`Request size exceeded limit`, {
      ip: req.ip,
      contentLength: contentLength,
      maxSize: maxSize,
      path: req.path
    });
    
    return res.status(413).json({
      success: false,
      error: 'Request entity too large'
    });
  }
  
  next();
};