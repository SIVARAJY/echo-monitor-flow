// Repair script to port missing physicians to the doctors table
import mysql from 'mysql2/promise';

async function repair() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'Siva1226',
      database: 'sepsisguard',
    });

    const [staff] = await conn.query('SELECT * FROM staff_users WHERE role = ? AND doctor_id IS NULL', ['physician']);
    console.log(`Found ${staff.length} physicians missing doctor_id`);

    for (const user of staff) {
      console.log(`Porting ${user.name}...`);
      const [doctorResult] = await conn.query(
        'INSERT INTO doctors (name, specialty, photo_url, email) VALUES (?, ?, ?, ?)',
        [user.name, 'General Physician', '', user.email || null]
      );
      const newDoctorId = doctorResult.insertId;
      await conn.query('UPDATE staff_users SET doctor_id = ? WHERE id = ?', [newDoctorId, user.id]);
      console.log(`Assigned new doctor_id ${newDoctorId} to ${user.name}`);
    }

    console.log('✅ Repair complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

repair();
