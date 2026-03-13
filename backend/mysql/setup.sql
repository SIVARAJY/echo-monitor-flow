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
INSERT INTO doctors (name, specialty, photo_url, department) VALUES
  ('Dr. Arjun Raj',    'Intensivist',    '/dr-raj.png',   'ICU'),
  ('Dr. Sarah Chen',   'Critical Care',  '/dr-chen.png',  'ICU'),
  ('Dr. Marcus James', 'Emergency Med',  '/dr-james.png', 'Emergency');

-- ── Seed: Default staff users ────────────────────────────────
INSERT INTO staff_users (staff_id, name, role, access_key, doctor_id) VALUES
  ('r0', 'Reception Staff',  'receptionist', '0', NULL),
  ('d0', 'Dr. Arjun Raj',    'physician',    '0', 1),
  ('p0', 'Lab Technician',   'machinehub',   '0', NULL);
