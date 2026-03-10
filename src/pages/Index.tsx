import { useState, useEffect, useCallback } from 'react';
import { Patient, User, Vitals, calculateRisk, calculateSurvivalTime } from '@/lib/sepsisEngine';
import LoginScreen from '@/components/LoginScreen';
import ReceptionDashboard from '@/components/ReceptionDashboard';
import DoctorDashboard from '@/components/DoctorDashboard';
import MachineHub from '@/components/MachineHub';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);

  // Trend tracking: snapshot every 5 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      setPatients(prev => prev.map(p => {
        if (p.status === 'discharged') return p;
        return {
          ...p,
          trendHistory: [...p.trendHistory, { time: Date.now(), score: p.riskScore }].slice(-60),
        };
      }));
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  const handleAdmit = useCallback((patient: Patient) => {
    setPatients(prev => [...prev, patient]);
  }, []);

  const handleDischarge = useCallback((id: string) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, status: 'discharged' as const } : p));
  }, []);

  const handleUpdateVitals = useCallback((id: string, vitals: Vitals) => {
    setPatients(prev => prev.map(p => {
      if (p.id !== id) return p;
      const { score, level, flags } = calculateRisk(vitals);
      return {
        ...p,
        vitals,
        riskScore: score,
        riskLevel: level,
        sepsisFlags: flags,
        survivalPrediction: calculateSurvivalTime(score),
        status: 'monitoring' as const,
      };
    }));
  }, []);

  if (!user) return <LoginScreen onLogin={setUser} />;

  switch (user.role) {
    case 'receptionist':
      return <ReceptionDashboard patients={patients} onAdmit={handleAdmit} onDischarge={handleDischarge} onLogout={() => setUser(null)} />;
    case 'physician':
      return <DoctorDashboard patients={patients} onLogout={() => setUser(null)} />;
    case 'machinehub':
      return <MachineHub patients={patients} onUpdateVitals={handleUpdateVitals} onLogout={() => setUser(null)} />;
    default:
      return null;
  }
};

export default Index;
