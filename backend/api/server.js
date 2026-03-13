import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const app = express();
app.use(cors());
app.use(express.json());

// ── MySQL connection pool ────────────────────────────────────
const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'Siva1226',
  database: 'sepsisguard',
  waitForConnections: true,
  connectionLimit: 10,
});

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── GET /api/doctors ─────────────────────────────────────────
app.get('/api/doctors', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, specialty, photo_url, email, phone, department, is_active FROM doctors WHERE is_active = true'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching doctors:', err);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { staffId, accessKey } = req.body;

  if (!staffId || !accessKey) {
    return res.status(400).json({ error: 'staffId and accessKey are required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, staff_id, name, role, doctor_id FROM staff_users WHERE staff_id = ? AND access_key = ? AND is_active = true',
      [staffId, accessKey]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    res.json({
      role: user.role,
      staffId: user.staff_id,
      name: user.name,
      doctorId: user.doctor_id,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── POST /api/auth/register ──────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { staffId, name, role, accessKey, email } = req.body;

  if (!staffId || !name || !role || !accessKey) {
    return res.status(400).json({ error: 'staffId, name, role, and accessKey are required' });
  }

  const validRoles = ['receptionist', 'physician', 'machinehub'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
  }

  try {
    // Check if staff_id already exists
    const [existing] = await pool.query(
      'SELECT id FROM staff_users WHERE staff_id = ?',
      [staffId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Staff ID already exists' });
    }

    // Insert new staff user
    await pool.query(
      'INSERT INTO staff_users (staff_id, name, role, access_key, email) VALUES (?, ?, ?, ?, ?)',
      [staffId, name, role, accessKey, email || null]
    );

    res.status(201).json({
      message: 'Registration successful',
      staffId,
      name,
      role,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── GET /api/staff ───────────────────────────────────────────
app.get('/api/staff', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, staff_id, name, role, email, is_active, doctor_id FROM staff_users WHERE is_active = true'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching staff:', err);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// ── Start server ─────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ SepsisGuard API running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Doctors: http://localhost:${PORT}/api/doctors`);
  console.log(`   Login:   POST http://localhost:${PORT}/api/auth/login`);
});
