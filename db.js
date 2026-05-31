/**
 * db.js — MySQL Database Connection Configuration
 * Establishes connection pool to MySQL database
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wtg_commuters_guide',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log('✓ MySQL Database connected successfully!');
    connection.release();
  })
  .catch(err => {
    console.error('✗ Error connecting to MySQL Database:', err.message);
    console.error('  Please ensure:');
    console.error('  1. MySQL server is running');
    console.error('  2. Database credentials in .env are correct');
    console.error('  3. Database "' + process.env.DB_NAME + '" exists');
    process.exit(1);
  });

module.exports = pool;
