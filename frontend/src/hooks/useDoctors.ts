import { useState, useEffect, useCallback } from 'react';
import { DOCTORS, Doctor } from '@/lib/sepsisEngine';

export interface DBDoctor {
  id: number;
  name: string;
  specialty: string;
  photo_url: string;
  email: string | null;
  phone: string | null;
  department: string;
  is_active: boolean;
}

/** Convert DB doctor row to the app's Doctor interface */
function toDoctor(row: DBDoctor): Doctor {
  return { name: row.name, specialty: row.specialty, photo: row.photo_url };
}

export function useDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>(DOCTORS);
  const [dbDoctors, setDbDoctors] = useState<DBDoctor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch('/api/doctors');
      if (res.ok) {
        const data: DBDoctor[] = await res.json();
        if (data.length > 0) {
          setDbDoctors(data);
          setDoctors(data.map(toDoctor));
        }
      }
      // If fetch fails or returns empty, keep the hardcoded DOCTORS fallback
    } catch {
      // API unreachable — use fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  /** Pick a random doctor */
  const pickDoctor = useCallback((): Doctor => {
    return doctors[Math.floor(Math.random() * doctors.length)];
  }, [doctors]);

  return { doctors, dbDoctors, loading, pickDoctor, refetch: fetchDoctors };
}
