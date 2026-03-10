
-- Create patients table
CREATE TABLE public.patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  admit_time BIGINT NOT NULL,
  bed TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'admitted' CHECK (status IN ('admitted', 'monitoring', 'discharged')),
  hr NUMERIC NOT NULL DEFAULT 75,
  sys NUMERIC NOT NULL DEFAULT 120,
  dia NUMERIC NOT NULL DEFAULT 80,
  rr NUMERIC NOT NULL DEFAULT 16,
  spo2 NUMERIC NOT NULL DEFAULT 98,
  temp NUMERIC NOT NULL DEFAULT 36.8,
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'stable' CHECK (risk_level IN ('stable', 'warning', 'danger', 'critical')),
  sepsis_flags TEXT[] NOT NULL DEFAULT '{}',
  survival_prediction TEXT NOT NULL DEFAULT 'Stable',
  trend_history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Allow all users to read/write (clinical demo app)
CREATE POLICY "Anyone can read patients" ON public.patients FOR SELECT USING (true);
CREATE POLICY "Anyone can insert patients" ON public.patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update patients" ON public.patients FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete patients" ON public.patients FOR DELETE USING (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
