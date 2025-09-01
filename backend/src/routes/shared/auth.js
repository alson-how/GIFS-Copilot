/**
 * Shared Authentication Routes
 * Common authentication endpoints for both customer and admin portals
 */

import express from 'express';
import AuthService from '../../services/AuthService.js';
import UserRepository from '../../repositories/UserRepository.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// POST /api/auth/customer/login - Customer portal login
router.post('/customer/login', async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    logger.info(`Customer login attempt: ${email}`);

    // Validate required fields
    if (!email || !password) {
      await UserRepository.recordLoginAttempt(email, ipAddress, userAgent, false, 'Missing credentials');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Check rate limiting
    const recentFailedAttempts = await UserRepository.getRecentFailedAttempts(email);
    if (recentFailedAttempts >= 5) {
      await UserRepository.recordLoginAttempt(email, ipAddress, userAgent, false, 'Rate limit exceeded');
      return res.status(429).json({
        success: false,
        error: 'Too many failed attempts. Please try again in 15 minutes.'
      });
    }

    // Find user by email
    const user = await UserRepository.findByEmail(email);
    if (!user || user.role !== 'CUSTOMER') {
      await UserRepository.recordLoginAttempt(email, ipAddress, userAgent, false, 'User not found');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (AuthService.isAccountLocked(user)) {
      await UserRepository.recordLoginAttempt(email, ipAddress, userAgent, false, 'Account locked');
      return res.status(401).json({
        success: false,
        error: 'Account is temporarily locked due to failed login attempts.'
      });
    }

    // Check if account is active
    if (!user.is_active) {
      await UserRepository.recordLoginAttempt(email, ipAddress, userAgent, false, 'Account inactive');
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isValidPassword = await AuthService.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      await UserRepository.recordFailedLogin(user.id);
      await UserRepository.recordLoginAttempt(email, ipAddress, userAgent, false, 'Invalid password');
      
      // Lock account if too many failed attempts
      const updatedUser = await UserRepository.findById(user.id);
      if (updatedUser.failed_login_attempts >= 5) {
        const lockoutExpiry = AuthService.calculateLockoutExpiry();
        await UserRepository.lockAccount(user.id, lockoutExpiry);
      }
      
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Reset failed attempts on successful login
    await UserRepository.resetFailedAttempts(user.id);
    await UserRepository.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = AuthService.generateCustomerAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user.id, 'customer');
    
    // Store refresh token
    await UserRepository.updateRefreshToken(user.id, refreshToken);

    // Record successful login
    await UserRepository.recordLoginAttempt(email, ipAddress, userAgent, true);

    logger.info(`Customer login successful: ${email}`);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        customer: AuthService.sanitizeUser(user),
        expiresIn: AuthService.accessTokenExpiry
      },
      message: 'Login successful'
    });

  } catch (error) {
    logger.error('Customer login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login service temporarily unavailable'
    });
  }
});

// POST /api/auth/admin/login - Admin portal login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    logger.info(`Admin login attempt: ${email}`);

    // Validate required fields
    if (!email || !password) {
      await UserRepository.recordLoginAttempt(email, ipAddress, userAgent, false, 'Missing credentials');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Check rate limiting
    const recentFailedAttempts = await UserRepository.getRecentFailedAttempts(email);
    if (recentFailedAttempts >= 5) {
      await UserRepository.recordLoginAttempt(email, ipAddress, userAgent, false, 'Rate limit exceeded');
      return res.status(429).json({
        success: false,
        error: 'Too many failed attempts. Please try again in 15 minutes.'
      });
    }

    // Find user by email
    const user = await UserRepository.findByEmail(email);
    if (!user || user.role !== 'ADMIN') {
      await UserRepository.recordLoginAttempt(email, ipAddress, userAgent, false, 'User not found');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (AuthService.isAccountLocked(user)) {
      await UserRepository.recordLoginAttempt(email, ipAddress, userAgent, false, 'Account locked');
      return res.status(401).json({
        success: false,
        error: 'Account is temporarily locked due to failed login attempts.'
      });
    }

    // Check if account is active
    if (!user.is_active) {
      await UserRepository.recordLoginAttempt(email, ipAddress, userAgent, false, 'Account inactive');
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated. Please contact system administrator.'
      });
    }

    // Verify password
    const isValidPassword = await AuthService.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      await UserRepository.recordFailedLogin(user.id);
      await UserRepository.recordLoginAttempt(email, ipAddress, userAgent, false, 'Invalid password');
      
      // Lock account if too many failed attempts
      const updatedUser = await UserRepository.findById(user.id);
      if (updatedUser.failed_login_attempts >= 5) {
        const lockoutExpiry = AuthService.calculateLockoutExpiry();
        await UserRepository.lockAccount(user.id, lockoutExpiry);
      }
      
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Reset failed attempts on successful login
    await UserRepository.resetFailedAttempts(user.id);
    await UserRepository.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = AuthService.generateAdminAccessToken(user);
    const refreshToken = AuthService.generateRefreshToken(user.id, 'admin');
    
    // Store refresh token
    await UserRepository.updateRefreshToken(user.id, refreshToken);

    // Record successful login
    await UserRepository.recordLoginAttempt(email, ipAddress, userAgent, true);

    logger.info(`Admin login successful: ${email}`);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        admin: AuthService.sanitizeUser(user),
        expiresIn: AuthService.accessTokenExpiry
      },
      message: 'Login successful'
    });

  } catch (error) {
    logger.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login service temporarily unavailable'
    });
  }
});

// POST /api/auth/customer/register - Customer registration
router.post('/customer/register', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      companyName, 
      firstName, 
      lastName, 
      phone,
      agreeToTerms 
    } = req.body;

    logger.info(`Customer registration attempt: ${email}`);

    // Validate required fields
    const required = ['email', 'password', 'companyName', 'firstName', 'lastName'];
    const missing = required.filter(field => !req.body[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`
      });
    }

    if (!agreeToTerms) {
      return res.status(400).json({
        success: false,
        error: 'You must agree to the terms and conditions'
      });
    }

    // Validate password strength
    const passwordValidation = AuthService.validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Password requirements not met',
        details: passwordValidation.errors
      });
    }

    // Check if customer already exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await AuthService.hashPassword(password);

    // Create user
    const userData = {
      email,
      passwordHash,
      role: 'CUSTOMER',
      companyName,
      firstName,
      lastName,
      phone: phone || null,
      emailVerified: false
    };

    const newUser = await UserRepository.create(userData);

    logger.info(`Customer registered successfully: ${email}`);

    res.status(201).json({
      success: true,
      data: {
        customerId: newUser.id,
        email: newUser.email,
        message: 'Registration successful. Your account has been created.'
      }
    });

  } catch (error) {
    logger.error('Customer registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration service temporarily unavailable'
    });
  }
});

// POST /api/auth/customer/refresh - Refresh customer token
router.post('/customer/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const tokenValidation = AuthService.verifyRefreshToken(refreshToken);
    if (!tokenValidation.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Find user and verify refresh token
    const user = await UserRepository.findByRefreshToken(refreshToken);
    if (!user || user.role !== 'CUSTOMER' || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newAccessToken = AuthService.generateCustomerAccessToken(user);
    const newRefreshToken = AuthService.generateRefreshToken(user.id, 'customer');

    // Update refresh token in database
    await UserRepository.updateRefreshToken(user.id, newRefreshToken);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: AuthService.accessTokenExpiry
      },
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    logger.error('Customer token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

// POST /api/auth/admin/refresh - Refresh admin token
router.post('/admin/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const tokenValidation = AuthService.verifyRefreshToken(refreshToken);
    if (!tokenValidation.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Find user and verify refresh token
    const user = await UserRepository.findByRefreshToken(refreshToken);
    if (!user || user.role !== 'ADMIN' || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newAccessToken = AuthService.generateAdminAccessToken(user);
    const newRefreshToken = AuthService.generateRefreshToken(user.id, 'admin');

    // Update refresh token in database
    await UserRepository.updateRefreshToken(user.id, newRefreshToken);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: AuthService.accessTokenExpiry
      },
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    logger.error('Admin token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

// POST /api/auth/logout - Logout (both portals)
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    logger.info('User logout');

    // If refresh token provided, clear it from database
    if (refreshToken) {
      const user = await UserRepository.findByRefreshToken(refreshToken);
      if (user) {
        await UserRepository.updateRefreshToken(user.id, null);
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// GET /api/auth/customer/profile - Get customer profile
router.get('/customer/profile', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    const token = AuthService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const tokenValidation = AuthService.verifyAccessToken(token, 'customer');
    if (!tokenValidation.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const user = await UserRepository.findById(tokenValidation.decoded.id);
    if (!user || user.role !== 'CUSTOMER' || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Invalid user'
      });
    }

    res.json({
      success: true,
      data: {
        customer: AuthService.sanitizeUser(user)
      }
    });

  } catch (error) {
    logger.error('Get customer profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile'
    });
  }
});

// GET /api/auth/admin/profile - Get admin profile
router.get('/admin/profile', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    const token = AuthService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const tokenValidation = AuthService.verifyAccessToken(token, 'admin');
    if (!tokenValidation.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const user = await UserRepository.findById(tokenValidation.decoded.id);
    if (!user || user.role !== 'ADMIN' || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Invalid user'
      });
    }

    res.json({
      success: true,
      data: {
        admin: AuthService.sanitizeUser(user)
      }
    });

  } catch (error) {
    logger.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile'
    });
  }
});

// GET /api/auth/verify-token - Verify token validity
router.get('/verify-token', (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    const token = AuthService.extractTokenFromHeader(authHeader);
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No valid token provided' 
      });
    }

    // Try to verify as customer first, then admin
    let tokenValidation = AuthService.verifyAccessToken(token, 'customer');
    if (!tokenValidation.valid) {
      tokenValidation = AuthService.verifyAccessToken(token, 'admin');
    }

    if (!tokenValidation.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    res.json({
      success: true,
      data: {
        valid: true,
        userType: tokenValidation.decoded.userType,
        expiresAt: new Date(tokenValidation.decoded.exp * 1000)
      }
    });

  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed'
    });
  }
});

export default router;