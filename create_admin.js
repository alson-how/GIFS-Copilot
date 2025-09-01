/**
 * Create Admin User Script
 * Creates an admin user with a known password for testing the API
 */

import bcrypt from 'bcrypt';
import pkg from 'pg';
import 'dotenv/config';

const { Pool } = pkg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createAdmin() {
  try {
    const email = 'test@admin.com';
    const password = 'admin123';
    const firstName = 'Test';
    const lastName = 'Admin';
    const companyName = 'GIFS Admin';
    
    // Hash the password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingAdmin.rows.length > 0) {
      // Update existing admin password
      await pool.query(
        `UPDATE users 
         SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE email = $2`,
        [hashedPassword, email]
      );
      
      console.log('✅ Updated existing admin password');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
    } else {
      // Create new admin user
      const result = await pool.query(
        `INSERT INTO users (
          id, email, password_hash, role, first_name, last_name, 
          company_name, is_active, email_verified, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'ADMIN', $3, $4, $5, true, true, 
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING id, email`,
        [email, hashedPassword, firstName, lastName, companyName]
      );
      
      console.log('✅ Created new admin user');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      console.log(`User ID: ${result.rows[0].id}`);
    }
    
    // Test login
    console.log('\n🔄 Testing admin login...');
    const loginResponse = await fetch('http://localhost:8080/api/auth/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });
    
    const loginResult = await loginResponse.json();
    
    if (loginResult.success) {
      console.log('✅ Admin login successful!');
      console.log(`Access Token: ${loginResult.data.accessToken}`);
      console.log('\n📋 You can now use this token to access admin APIs:');
      console.log(`curl -H "Authorization: Bearer ${loginResult.data.accessToken}" http://localhost:8080/api/admin/shipments`);
    } else {
      console.log('❌ Admin login failed:', loginResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
createAdmin();