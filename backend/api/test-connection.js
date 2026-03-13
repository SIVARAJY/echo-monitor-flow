import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Force load .env from the backend/api directory
dotenv.config({ path: 'd:/TN/off/echo-monitor-flow/backend/api/.env' });

async function testConnection() {
  console.log('Testing connection with config:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    database: process.env.DB_NAME
  });

  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sepsisguard',
    });
    console.log('✅ SUCCESS: Connected to database');
    
    const [rows] = await conn.query('SHOW TABLES');
    console.log('Tables found:', rows.map(r => Object.values(r)[0]).join(', '));
    
  } catch (err) {
    console.error('❌ FAILURE:', err.message);
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.log('Suggestion: Database does not exist. Run setup script.');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('Suggestion: MySQL server is not running or port is wrong.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('Suggestion: Invalid username or password.');
    }
  } finally {
    if (conn) await conn.end();
  }
}

testConnection();
