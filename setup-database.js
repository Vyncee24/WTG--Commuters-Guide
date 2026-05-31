/**
 * setup-database.js — Database Schema Setup
 * Creates necessary tables for WTG Commuters Guide
 * Run: node setup-database.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    console.log('📦 Setting up database...\n');

    // Create database
    const dbName = process.env.DB_NAME || 'wtg_commuters_guide';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✓ Database '${dbName}' created/verified`);

    // Switch to the database
    await connection.query(`USE ${dbName}`);

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (email)
      )
    `);
    console.log('✓ Users table created/verified');

    // Create routes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        route_id VARCHAR(50) UNIQUE NOT NULL,
        from_location VARCHAR(100) NOT NULL,
        to_location VARCHAR(100) NOT NULL,
        duration VARCHAR(50),
        fare VARCHAR(50),
        transport_type VARCHAR(50),
        tags JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (from_location, to_location)
      )
    `);
    console.log('✓ Routes table created/verified');

    // Create saved_routes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS saved_routes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        route_id VARCHAR(50) NOT NULL,
        from_location VARCHAR(100) NOT NULL,
        to_location VARCHAR(100) NOT NULL,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (user_id),
        UNIQUE KEY unique_save (user_id, route_id)
      )
    `);
    console.log('✓ Saved Routes table created/verified');

    // Create comments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        route_id VARCHAR(50) NOT NULL,
        comment TEXT NOT NULL,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (route_id),
        INDEX (user_id)
      )
    `);
    console.log('✓ Comments table created/verified');

    // Insert default admin user if not exists
    const [existingAdmin] = await connection.query(
      "SELECT * FROM users WHERE email = 'janvincentreyel24@gmail.com'"
    );

    if (existingAdmin.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('janvincentreyel2406', 10);
      
      await connection.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Admin', 'janvincentreyel24@gmail.com', hashedPassword, 'admin']
      );
      console.log('✓ Default admin user created');
    } else {
      console.log('✓ Admin user already exists');
    }

    console.log('\n✅ Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. npm install');
    console.log('2. npm start (or npm run dev for development)');

  } catch (error) {
    console.error('\n❌ Database setup failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

setupDatabase();
