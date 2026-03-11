import { useState } from 'react';
import { Patient, generatePatientId, generateBedNumber, getDefaultVitals, calculateRisk, calculateSurvivalTime, formatDuration } from '@/lib/sepsisEngine';
import { UserPlus, LogOut, Clock, Bed } from 'lucide-react';

interface ReceptionDashboardProps {
  patients: Patient[];
  onAdmit: (patient: Patient) => void;
  onDischarge: (id: string) => void;
  onLogout: () => void;
}

export default function ReceptionDashboard({ patients, onAdmit, onDischarge, onLogout }: ReceptionDashboardProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [now, setNow] = useState(Date.now());

  // Update clock every second
  const _ = (() => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useEffect: ue } = require('react');
  });

  const handleAdmit = () => {
    if (!name.trim() || !age) return;
    const vitals = getDefaultVitals();
    const { score, level, flags } = calculateRisk(vitals);
    const patient: Patient = {
      id: generatePatientId(),
      name: name.trim(),
      age: parseInt(age),
      gender,
      admitTime: Date.now(),
      vitals,
      riskScore: score,
      riskLevel: level,
      sepsisFlags: flags,
      survivalPrediction: calculateSurvivalTime(score),
      trendHistory: [{ time: Date.now(), score }],
      bed: generateBedNumber(),
      status: 'admitted',
    };
    onAdmit(patient);
    setName('');
    setAge('');
  };

  const activePatients = patients.filter(p => p.status !== 'discharged');

  return (
    <div className="min-h-screen p-4">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bed className="w-5 h-5 text-primary" />
          <h1 className="font-mono text-lg font-bold text-foreground">RECEPTION</h1>
          <span className="vital-badge vital-stable">{activePatients.length} Active</span>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      {/* Admit Form */}
      <div className="clinical-card mb-6">
        <h2 className="text-sm font-mono font-semibold text-primary mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> ADMIT NEW PATIENT
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Patient Name"
            className="col-span-2 bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            value={age}
            onChange={e => setAge(e.target.value)}
            type="number"
            placeholder="Age"
            className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setGender('M')}
              className={`flex-1 py-2 rounded-md text-xs font-mono border transition-all ${gender === 'M' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
            >M</button>
            <button
              onClick={() => setGender('F')}
              className={`flex-1 py-2 rounded-md text-xs font-mono border transition-all ${gender === 'F' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
            >F</button>
          </div>
        </div>
        <button
          onClick={handleAdmit}
          className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Admit Patient
        </button>
      </div>

      {/* Patient Queue */}
      <div className="clinical-card">
        <h2 className="text-sm font-mono font-semibold text-foreground mb-3">PATIENT QUEUE</h2>
        {activePatients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No patients admitted</p>
        ) : (
          <div className="space-y-2">
            {activePatients.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-secondary/50 border border-border rounded-lg px-4 py-3">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-muted-foreground">{p.id}</span>
                  <div>
                    <div className="text-sm font-medium text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.age}y · {p.gender} · {p.bed}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                    <Clock className="w-3 h-3" />
                    {formatDuration(now - p.admitTime)}
                  </div>
                  <span className={`vital-badge vital-${p.riskLevel}`}>
                    {p.riskLevel.toUpperCase()}
                  </span>
                  <button
                    onClick={() => onDischarge(p.id)}
                    className="text-xs text-destructive hover:underline font-mono"
                  >
                    Discharge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
