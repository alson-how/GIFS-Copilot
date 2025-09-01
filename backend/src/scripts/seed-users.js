/**
 * User Seeding Script
 * Creates initial admin and customer accounts for testing
 */

import AuthService from '../services/AuthService.js';
import UserRepository from '../repositories/UserRepository.js';
import logger from '../utils/logger.js';

const seedUsers = async () => {
  try {
    logger.info('Starting user seeding process...');

    // Admin Account
    const adminEmail = 'admin@3plcompany.com';
    const existingAdmin = await UserRepository.findByEmail(adminEmail);
    
    if (!existingAdmin) {
      const adminPasswordHash = await AuthService.hashPassword('Admin@123456');
      
      const adminData = {
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        companyName: '3PL Logistics Company',
        firstName: 'John',
        lastName: 'Administrator',
        phone: '+1-555-0100',
        emailVerified: true
      };

      const admin = await UserRepository.create(adminData);
      logger.info(`✓ Admin account created: ${admin.email} (ID: ${admin.id})`);
    } else {
      logger.info(`✓ Admin account already exists: ${adminEmail}`);
    }

    // Customer Accounts
    const customers = [
      {
        email: 'customer1@techcorp.com',
        password: 'Customer@123',
        companyName: 'Tech Corp Solutions',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '+1-555-0101'
      },
      {
        email: 'customer2@globalimports.com',
        password: 'Customer@123',
        companyName: 'Global Imports Ltd',
        firstName: 'Michael',
        lastName: 'Chen',
        phone: '+1-555-0102'
      },
      {
        email: 'customer3@fashionhouse.com',
        password: 'Customer@123',
        companyName: 'Fashion House International',
        firstName: 'Emma',
        lastName: 'Williams',
        phone: '+1-555-0103'
      }
    ];

    for (const customerData of customers) {
      const existingCustomer = await UserRepository.findByEmail(customerData.email);
      
      if (!existingCustomer) {
        const passwordHash = await AuthService.hashPassword(customerData.password);
        
        const userData = {
          email: customerData.email,
          passwordHash: passwordHash,
          role: 'CUSTOMER',
          companyName: customerData.companyName,
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          phone: customerData.phone,
          emailVerified: true
        };

        const customer = await UserRepository.create(userData);
        logger.info(`✓ Customer account created: ${customer.email} (ID: ${customer.id})`);
      } else {
        logger.info(`✓ Customer account already exists: ${customerData.email}`);
      }
    }

    logger.info('User seeding completed successfully!');
    
    // Log summary
    const adminCount = await UserRepository.getCount('ADMIN');
    const customerCount = await UserRepository.getCount('CUSTOMER');
    
    logger.info(`\n=== SEED SUMMARY ===`);
    logger.info(`Admin accounts: ${adminCount}`);
    logger.info(`Customer accounts: ${customerCount}`);
    logger.info(`Total users: ${adminCount + customerCount}`);
    
    logger.info(`\n=== TEST CREDENTIALS ===`);
    logger.info(`\nAdmin Login:`);
    logger.info(`Email: admin@3plcompany.com`);
    logger.info(`Password: Admin@123456`);
    
    logger.info(`\nCustomer Login Examples:`);
    logger.info(`Email: customer1@techcorp.com`);
    logger.info(`Password: Customer@123`);
    logger.info(`\nEmail: customer2@globalimports.com`);
    logger.info(`Password: Customer@123`);
    logger.info(`\nEmail: customer3@fashionhouse.com`);
    logger.info(`Password: Customer@123`);
    
  } catch (error) {
    logger.error('Error during user seeding:', error);
    throw error;
  }
};

const clearUsers = async () => {
  try {
    logger.info('Starting user cleanup process...');
    
    // Note: In a real application, you might want to be more selective
    // about which users to delete, especially in production
    const result = await UserRepository.pool.query('DELETE FROM users WHERE email LIKE \'%@3plcompany.com\' OR email LIKE \'%@techcorp.com\' OR email LIKE \'%@globalimports.com\' OR email LIKE \'%@fashionhouse.com\'');
    
    logger.info(`✓ Deleted ${result.rowCount} seed users`);
    logger.info('User cleanup completed!');
    
  } catch (error) {
    logger.error('Error during user cleanup:', error);
    throw error;
  }
};

// Handle command line arguments
const args = process.argv.slice(2);
const shouldClear = args.includes('--clear');

const main = async () => {
  try {
    if (shouldClear) {
      await clearUsers();
    } else {
      await seedUsers();
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Seeding script failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { seedUsers, clearUsers };