/**
 * Authentication Service
 * Handles JWT token generation, validation, password hashing, and security utilities
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from '../utils/logger.js';

class AuthService {
  constructor() {
    // JWT configuration
    this.jwtSecret = process.env.JWT_SECRET;
    this.adminJwtSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
    this.customerJwtSecret = process.env.CUSTOMER_JWT_SECRET || process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
    
    // Token expiry times
    this.accessTokenExpiry = process.env.TOKEN_EXPIRY || '1h';
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
    
    // Security settings
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    this.maxFailedAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.bcryptRounds);
    } catch (error) {
      logger.error('Error hashing password:', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const errors = [];
    
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate access token for customer
   */
  generateCustomerAccessToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyName: user.company_name,
      userType: 'customer'
    };

    return jwt.sign(payload, this.customerJwtSecret, {
      expiresIn: this.accessTokenExpiry
    });
  }

  /**
   * Generate access token for admin
   */
  generateAdminAccessToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      permissions: user.permissions || ['read', 'write'],
      userType: 'admin'
    };

    return jwt.sign(payload, this.adminJwtSecret, {
      expiresIn: this.accessTokenExpiry
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId, userType) {
    const payload = {
      userId,
      userType,
      tokenType: 'refresh'
    };

    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token, userType) {
    try {
      const secret = userType === 'admin' ? this.adminJwtSecret : this.customerJwtSecret;
      const decoded = jwt.verify(token, secret);
      
      // Ensure token is for the correct user type
      if (decoded.userType !== userType) {
        throw new Error('Invalid token type');
      }
      
      return { valid: true, decoded };
    } catch (error) {
      logger.warn('Invalid access token:', error.message);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret);
      
      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      return { valid: true, decoded };
    } catch (error) {
      logger.warn('Invalid refresh token:', error.message);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.replace('Bearer ', '');
  }

  /**
   * Check if account is locked due to failed attempts
   */
  isAccountLocked(user) {
    if (!user.locked_until) {
      return false;
    }
    
    return new Date() < new Date(user.locked_until);
  }

  /**
   * Calculate lockout expiry time
   */
  calculateLockoutExpiry() {
    return new Date(Date.now() + this.lockoutDuration);
  }

  /**
   * Generate secure random string
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Sanitize user data for response (remove sensitive fields)
   */
  sanitizeUser(user) {
    const {
      password_hash,
      refresh_token,
      password_reset_token,
      email_verification_token,
      failed_login_attempts,
      locked_until,
      ...sanitizedUser
    } = user;
    
    return sanitizedUser;
  }
}

export default new AuthService();