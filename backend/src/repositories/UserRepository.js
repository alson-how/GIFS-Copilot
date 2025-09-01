/**
 * User Repository
 * Handles all database operations for users
 */

import pkg from 'pg';
const { Pool } = pkg;
import logger from '../utils/logger.js';

class UserRepository {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await this.pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await this.pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by refresh token
   */
  async findByRefreshToken(token) {
    try {
      const query = 'SELECT * FROM users WHERE refresh_token = $1';
      const result = await this.pool.query(query, [token]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by refresh token:', error);
      throw error;
    }
  }

  /**
   * Find user by password reset token
   */
  async findByPasswordResetToken(token) {
    try {
      const query = `
        SELECT * FROM users 
        WHERE password_reset_token = $1 
        AND password_reset_expires > CURRENT_TIMESTAMP
      `;
      const result = await this.pool.query(query, [token]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by password reset token:', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  async create(userData) {
    try {
      const {
        email,
        passwordHash,
        role,
        companyName,
        firstName,
        lastName,
        phone,
        emailVerified = false
      } = userData;

      const query = `
        INSERT INTO users (
          email, password_hash, role, company_name, 
          first_name, last_name, phone, email_verified
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        email,
        passwordHash,
        role,
        companyName,
        firstName,
        lastName,
        phone,
        emailVerified
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async update(id, userData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Build dynamic update query
      Object.keys(userData).forEach(key => {
        if (userData[key] !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(userData[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(id);
      const query = `
        UPDATE users 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Update refresh token
   */
  async updateRefreshToken(id, refreshToken) {
    try {
      const query = `
        UPDATE users 
        SET refresh_token = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const result = await this.pool.query(query, [refreshToken, id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating refresh token:', error);
      throw error;
    }
  }

  /**
   * Update last login time
   */
  async updateLastLogin(id) {
    try {
      const query = `
        UPDATE users 
        SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await this.pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw error;
    }
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(id) {
    try {
      const query = `
        UPDATE users 
        SET failed_login_attempts = failed_login_attempts + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await this.pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error recording failed login:', error);
      throw error;
    }
  }

  /**
   * Lock user account
   */
  async lockAccount(id, lockoutExpiry) {
    try {
      const query = `
        UPDATE users 
        SET locked_until = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const result = await this.pool.query(query, [lockoutExpiry, id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error locking account:', error);
      throw error;
    }
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedAttempts(id) {
    try {
      const query = `
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await this.pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error resetting failed attempts:', error);
      throw error;
    }
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(id, token, expires) {
    try {
      const query = `
        UPDATE users 
        SET password_reset_token = $1, 
            password_reset_expires = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      const result = await this.pool.query(query, [token, expires, id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error setting password reset token:', error);
      throw error;
    }
  }

  /**
   * Clear password reset token
   */
  async clearPasswordResetToken(id) {
    try {
      const query = `
        UPDATE users 
        SET password_reset_token = NULL, 
            password_reset_expires = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await this.pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error clearing password reset token:', error);
      throw error;
    }
  }

  /**
   * Record login attempt
   */
  async recordLoginAttempt(email, ipAddress, userAgent, success, failureReason = null) {
    try {
      const query = `
        INSERT INTO login_attempts (
          email, ip_address, user_agent, success, failure_reason
        ) 
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const values = [email, ipAddress, userAgent, success, failureReason];
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error recording login attempt:', error);
      throw error;
    }
  }

  /**
   * Get recent failed login attempts for rate limiting
   */
  async getRecentFailedAttempts(email, minutes = 15) {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM login_attempts
        WHERE email = $1 
        AND success = false 
        AND attempted_at > CURRENT_TIMESTAMP - INTERVAL '${minutes} minutes'
      `;
      const result = await this.pool.query(query, [email]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting recent failed attempts:', error);
      throw error;
    }
  }

  /**
   * Get all users (for admin purposes)
   */
  async findAll(role = null, limit = 100, offset = 0) {
    try {
      let query = 'SELECT * FROM users';
      const values = [];
      
      if (role) {
        query += ' WHERE role = $1';
        values.push(role);
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
      values.push(limit, offset);

      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error finding all users:', error);
      throw error;
    }
  }

  /**
   * Get user count
   */
  async getCount(role = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM users';
      const values = [];
      
      if (role) {
        query += ' WHERE role = $1';
        values.push(role);
      }

      const result = await this.pool.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting user count:', error);
      throw error;
    }
  }
}

export default new UserRepository();