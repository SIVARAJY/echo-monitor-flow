import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Patient, Vitals, calculateRisk, calculateSurvivalTime } from '@/lib/sepsisEngine';

function rowToPatient(row: any): Patient {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    gender: row.gender as 'M' | 'F',
    admitTime: row.admit_time,
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

  // Fetch patients from DB
  const fetchPatients = useCallback(async () => {
    const { data, error } = await supabase.from('patients').select('*');
    if (!error && data) {
      setPatients(data.map(rowToPatient));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('patients-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, () => {
        fetchPatients();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchPatients]);

  // Trend tracking: snapshot every 5 seconds
  useEffect(() => {
    const iv = setInterval(async () => {
      const { data } = await supabase.from('patients').select('id, risk_score, trend_history, status');
      if (!data) return;
      for (const row of data) {
        if (row.status === 'discharged') continue;
        const history = (row.trend_history as any[]) || [];
        const updated = [...history, { time: Date.now(), score: row.risk_score }].slice(-60);
        await supabase.from('patients').update({ trend_history: updated }).eq('id', row.id);
      }
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  const handleAdmit = useCallback(async (patient: Patient) => {
    await supabase.from('patients').insert({
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
      trend_history: patient.trendHistory as any,
    });
  }, []);

  const handleDischarge = useCallback(async (id: string) => {
    await supabase.from('patients').update({ status: 'discharged' }).eq('id', id);
  }, []);

  const handleUpdateVitals = useCallback(async (id: string, vitals: Vitals) => {
    const { score, level, flags } = calculateRisk(vitals);
    await supabase.from('patients').update({
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
      status: 'monitoring',
    }).eq('id', id);
  }, []);

  return { patients, handleAdmit, handleDischarge, handleUpdateVitals };
}
