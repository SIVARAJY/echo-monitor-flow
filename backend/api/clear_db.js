import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function clearDB() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sepsisguard',
      multipleStatements: true,
    });

    console.log('Clearing old data...');
    // Disable foreign keys temporarily so we can truncate
    await conn.query(`
      SET FOREIGN_KEY_CHECKS = 0;
      TRUNCATE TABLE patients;
      TRUNCATE TABLE staff_users;
      TRUNCATE TABLE doctors;
      SET FOREIGN_KEY_CHECKS = 1;
    `);

    console.log('Re-inserting default staff users (r0, p0)...');
    await conn.query(`
      INSERT INTO staff_users (staff_id, name, role, access_key, doctor_id) VALUES
        ('r0', 'Reception Staff',  'receptionist', '0', NULL),
        ('p0', 'Lab Technician',   'machinehub',   '0', NULL);
    `);

    // Verify
    const [doctors] = await conn.query('SELECT * FROM doctors');
    console.log(`Doctors: ${doctors.length}`);
    const [staff] = await conn.query('SELECT * FROM staff_users');
    console.log(`Staff users: ${staff.length}`);

    console.log('✅ Database cleared and reset successfully!');
  } catch (err) {
    console.error('❌ SQL Error:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

clearDB();
