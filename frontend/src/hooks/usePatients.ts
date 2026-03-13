import { useState, useEffect, useCallback } from 'react';
import { Patient, Vitals, calculateRisk, calculateSurvivalTime } from '@/lib/sepsisEngine';

/**
 * Convert a DB row from the MySQL API to the app's Patient interface.
 */
function rowToPatient(row: any): Patient {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    gender: row.gender as 'M' | 'F',
    admitTime: Number(row.admit_time),
    vitals: {
      hr: Number(row.hr),
      sys: Number(row.sys),
      dia: Number(row.dia),
      rr: Number(row.rr),
      spo2: Number(row.spo2),
      temp: Number(row.temp),
    },
    riskScore: row.risk_score,
    riskLevel: row.risk_level as Patient['riskLevel'],
    sepsisFlags: row.sepsis_flags || [],
    survivalPrediction: row.survival_prediction,
    trendHistory: (row.trend_history as any[]) || [],
    bed: row.bed,
    status: row.status as Patient['status'],
    doctorName: row.doctor_name,
    doctorPhoto: row.doctor_photo,
  };
}

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);

  // Fetch patients from MySQL API
  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const data = await res.json();
        setPatients(data.map(rowToPatient));
      }
    } catch {
      // API unreachable — keep current state
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Poll for changes every 2 seconds (replaces Supabase realtime)
  useEffect(() => {
    const iv = setInterval(fetchPatients, 2000);
    return () => clearInterval(iv);
  }, [fetchPatients]);

  // Trend tracking: snapshot every 5 seconds
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch('/api/patients');
        if (!res.ok) return;
        const data = await res.json();
        for (const row of data) {
          if (row.status === 'discharged') continue;
          const history = (row.trend_history as any[]) || [];
          const updated = [...history, { time: Date.now(), score: row.risk_score }].slice(-60);
          await fetch(`/api/patients/${row.id}/trends`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trend_history: updated }),
          });
        }
      } catch {
        // API unreachable
      }
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  const handleAdmit = useCallback(async (patient: Patient) => {
    try {
      await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: patient.id,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          admit_time: patient.admitTime,
          bed: patient.bed,
          status: patient.status,
          hr: patient.vitals.hr,
          sys: patient.vitals.sys,
          dia: patient.vitals.dia,
          rr: patient.vitals.rr,
          spo2: patient.vitals.spo2,
          temp: patient.vitals.temp,
          risk_score: patient.riskScore,
          risk_level: patient.riskLevel,
          sepsis_flags: patient.sepsisFlags,
          survival_prediction: patient.survivalPrediction,
          trend_history: patient.trendHistory,
          doctor_name: patient.doctorName || null,
          doctor_photo: patient.doctorPhoto || null,
        }),
      });
      // Refresh after admit
      fetchPatients();
    } catch {
      // API unreachable
    }
  }, [fetchPatients]);

  const handleDischarge = useCallback(async (id: string) => {
    try {
      await fetch(`/api/patients/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'discharged' }),
      });
      fetchPatients();
    } catch {
      // API unreachable
    }
  }, [fetchPatients]);

  const handleUpdateVitals = useCallback(async (id: string, vitals: Vitals) => {
    const { score, level, flags } = calculateRisk(vitals);
    try {
      await fetch(`/api/patients/${id}/vitals`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hr: vitals.hr,
          sys: vitals.sys,
          dia: vitals.dia,
          rr: vitals.rr,
          spo2: vitals.spo2,
          temp: vitals.temp,
          risk_score: score,
          risk_level: level,
          sepsis_flags: flags,
          survival_prediction: calculateSurvivalTime(score),
        }),
      });
      fetchPatients();
    } catch {
      // API unreachable
    }
  }, [fetchPatients]);

  return { patients, handleAdmit, handleDischarge, handleUpdateVitals };
}
