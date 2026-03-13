-- ============================================================
-- Migration: Create doctors and staff_users tables
-- ============================================================

-- ── Doctors table ────────────────────────────────────────────
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  photo_url TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  department TEXT NOT NULL DEFAULT 'ICU',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ── Staff users table ────────────────────────────────────────
CREATE TABLE public.staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('receptionist', 'physician', 'machinehub')),
  access_key TEXT NOT NULL DEFAULT '0',
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ── Enable RLS ───────────────────────────────────────────────
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;

-- Open policies (demo / clinical app)
CREATE POLICY "Anyone can read doctors"     ON public.doctors     FOR SELECT USING (true);
CREATE POLICY "Anyone can insert doctors"   ON public.doctors     FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update doctors"   ON public.doctors     FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete doctors"   ON public.doctors     FOR DELETE USING (true);

CREATE POLICY "Anyone can read staff"       ON public.staff_users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert staff"     ON public.staff_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update staff"     ON public.staff_users FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete staff"     ON public.staff_users FOR DELETE USING (true);

-- ── Auto-update timestamps ───────────────────────────────────
CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_users_updated_at
  BEFORE UPDATE ON public.staff_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Realtime ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_users;

-- ── Seed: Default doctors ────────────────────────────────────
INSERT INTO public.doctors (id, name, specialty, photo_url, department) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Dr. Arjun Raj',    'Intensivist',    '/dr-raj.png',   'ICU'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Dr. Sarah Chen',   'Critical Care',  '/dr-chen.png',  'ICU'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Dr. Marcus James',  'Emergency Med',  '/dr-james.png', 'Emergency');

-- ── Seed: Default staff users ────────────────────────────────
INSERT INTO public.staff_users (staff_id, name, role, access_key, doctor_id) VALUES
  ('r0', 'Reception Staff',  'receptionist', '0', NULL),
  ('d0', 'Dr. Arjun Raj',    'physician',    '0', 'a1b2c3d4-0001-4000-8000-000000000001'),
  ('p0', 'Lab Technician',   'machinehub',   '0', NULL);
