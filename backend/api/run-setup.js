// Temporary script to test MySQL connection and run setup SQL
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function setup() {
  console.log('Connecting to MySQL...');
  
  // First connect without specifying a database to create it
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });
    console.log('✅ Connected to MySQL successfully!');
  } catch (err) {
    console.error('❌ Failed to connect:', err.message);
    process.exit(1);
  }

  try {
    const sql = readFileSync('../mysql/setup.sql', 'utf8');
    console.log('Running setup SQL...');
    await conn.query(sql);
    console.log('✅ Database and tables created successfully!');
    
    // Verify
    const [doctors] = await conn.query('SELECT * FROM sepsisguard.doctors');
    console.log(`   Doctors: ${doctors.length} rows`);
    const [staff] = await conn.query('SELECT * FROM sepsisguard.staff_users');
    console.log(`   Staff users: ${staff.length} rows`);
  } catch (err) {
    console.error('❌ SQL Error:', err.message);
  } finally {
    await conn.end();
  }
}

setup();
