-- ============================================================
-- SepsisGuard: MySQL Database Setup
-- Run this in MySQL Workbench
-- ============================================================

CREATE DATABASE IF NOT EXISTS sepsisguard;
USE sepsisguard;

-- ── Doctors table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  photo_url VARCHAR(255) NOT NULL DEFAULT '',
  email VARCHAR(100) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  department VARCHAR(50) NOT NULL DEFAULT 'ICU',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Staff users table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  role ENUM('receptionist', 'physician', 'machinehub') NOT NULL,
  access_key VARCHAR(100) NOT NULL DEFAULT '0',
  email VARCHAR(100) DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  doctor_id INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);

-- ── Seed: Default doctors ────────────────────────────────────
-- (No default doctors; must be registered via the UI)

-- ── Seed: Default staff users ────────────────────────────────
INSERT INTO staff_users (staff_id, name, role, access_key, doctor_id) VALUES
  ('r0', 'Reception Staff',  'receptionist', '0', NULL),
  ('p0', 'Lab Technician',   'machinehub',   '0', NULL);

-- ── Patients table (replaces Supabase) ───────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  age INT NOT NULL,
  gender ENUM('M','F') NOT NULL,
  admit_time BIGINT NOT NULL,
  bed VARCHAR(20) NOT NULL,
  status ENUM('admitted','monitoring','discharged') NOT NULL DEFAULT 'admitted',
  hr DECIMAL(5,1) NOT NULL DEFAULT 75,
  sys DECIMAL(5,1) NOT NULL DEFAULT 120,
  dia DECIMAL(5,1) NOT NULL DEFAULT 80,
  rr DECIMAL(5,1) NOT NULL DEFAULT 16,
  spo2 DECIMAL(5,1) NOT NULL DEFAULT 98,
  temp DECIMAL(4,1) NOT NULL DEFAULT 36.8,
  risk_score INT NOT NULL DEFAULT 0,
  risk_level ENUM('stable','warning','danger','critical') NOT NULL DEFAULT 'stable',
  sepsis_flags JSON DEFAULT NULL,
  survival_prediction VARCHAR(50) DEFAULT 'Stable',
  trend_history JSON DEFAULT NULL,
  doctor_name VARCHAR(100) DEFAULT NULL,
  doctor_photo VARCHAR(255) DEFAULT NULL,
  doctor_specialty VARCHAR(100) DEFAULT NULL,
  doctor_id INT DEFAULT NULL,
  admit_reason VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);
