/**
 * Password Reset Routes
 * Handles password reset functionality for both customer and admin portals
 */

import express from 'express';
import AuthService from '../../services/AuthService.js';
import UserRepository from '../../repositories/UserRepository.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    logger.info(`Password reset requested for: ${email}`);

    // Find user by email
    const user = await UserRepository.findByEmail(email);
    
    // Always return success to prevent email enumeration
    // but only send reset email if user exists
    if (user && user.is_active) {
      // Generate password reset token
      const resetToken = AuthService.generatePasswordResetToken();
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token to database
      await UserRepository.setPasswordResetToken(user.id, resetToken, resetExpiry);

      // In a real application, you would send an email here
      // For demo purposes, we'll just log the token
      logger.info(`Password reset token for ${email}: ${resetToken}`);
      
      // TODO: Send email with reset link containing the token
      // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      // await emailService.sendPasswordResetEmail(user.email, resetLink);
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    logger.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset service temporarily unavailable'
    });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token, new password, and password confirmation are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    // Validate password strength
    const passwordValidation = AuthService.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Password requirements not met',
        details: passwordValidation.errors
      });
    }

    // Find user by reset token
    const user = await UserRepository.findByPasswordResetToken(token);
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const passwordHash = await AuthService.hashPassword(newPassword);

    // Update user password and clear reset token
    await UserRepository.update(user.id, {
      password_hash: passwordHash,
      failed_login_attempts: 0,
      locked_until: null
    });

    await UserRepository.clearPasswordResetToken(user.id);

    // Clear any existing refresh tokens to force re-login
    await UserRepository.updateRefreshToken(user.id, null);

    logger.info(`Password reset successful for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
    });

  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset failed'
    });
  }
});

// POST /api/auth/change-password - Change password for authenticated user
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const authHeader = req.header('Authorization');
    const token = AuthService.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password, new password, and confirmation are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New passwords do not match'
      });
    }

    // Validate password strength
    const passwordValidation = AuthService.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Password requirements not met',
        details: passwordValidation.errors
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

    // Find user
    const user = await UserRepository.findById(tokenValidation.decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await AuthService.verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const passwordHash = await AuthService.hashPassword(newPassword);

    // Update password
    await UserRepository.update(user.id, {
      password_hash: passwordHash
    });

    // Clear existing refresh tokens to force re-login on other devices
    await UserRepository.updateRefreshToken(user.id, null);

    logger.info(`Password changed successfully for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully. Please log in again.'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Password change failed'
    });
  }
});

export default router;