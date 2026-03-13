import { useState, useEffect } from 'react';
import { Patient, generatePatientId, generateBedNumber, getDefaultVitals, calculateRisk, calculateSurvivalTime, formatDuration } from '@/lib/sepsisEngine';
import { useDoctors } from '@/hooks/useDoctors';
import { UserPlus, LogOut, Clock, Bed, Activity } from 'lucide-react';

interface ReceptionDashboardProps {
  patients: Patient[];
  onAdmit: (patient: Patient) => void;
  onDischarge: (id: string) => void;
  onLogout: () => void;
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Clock className="w-3.5 h-3.5" />
      <span className="font-mono text-xs tracking-widest">
        {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
}

export default function ReceptionDashboard({ patients, onAdmit, onDischarge, onLogout }: ReceptionDashboardProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [now, setNow] = useState(Date.now());
  const { pickDoctor } = useDoctors();

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const handleAdmit = () => {
    if (!name.trim() || !age) return;
    const vitals = getDefaultVitals();
    const { score, level, flags } = calculateRisk(vitals);
    const doctor = pickDoctor();
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
      doctorName: doctor.name,
      doctorPhoto: doctor.photo,
      doctorSpecialty: doctor.specialty,
    };
    onAdmit(patient);
    setName('');
    setAge('');
  };

  const activePatients = patients
    .filter(p => p.status !== 'discharged')
    .sort((a, b) => a.admitTime - b.admitTime);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="hospital-header sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Bed className="w-5 h-5 text-primary flex-shrink-0" />
          <h1 className="font-mono text-base font-bold text-foreground tracking-wide">RECEPTION</h1>
          <span className="vital-badge vital-stable">{activePatients.length} Active</span>
        </div>
        <div className="flex items-center gap-4">
          <LiveClock />
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-4">
        {/* ── Admit Form ─────────────────────────────────────────── */}
        <div className="clinical-card">
          <h2 className="text-sm font-mono font-semibold text-primary mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> ADMIT NEW PATIENT
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground mb-1.5 tracking-widest uppercase">Patient Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full name"
                className="w-full bg-secondary border border-border rounded-md px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-muted-foreground mb-1.5 tracking-widest uppercase">Age</label>
                <input
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  type="number"
                  placeholder="Years"
                  className="w-full bg-secondary border border-border rounded-md px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-muted-foreground mb-1.5 tracking-widest uppercase">Gender</label>
                <div className="flex gap-2 h-[46px]">
                  <button
                    onClick={() => setGender('M')}
                    className={`flex-1 rounded-md text-sm font-mono font-semibold border transition-all ${gender === 'M' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
                  >Male</button>
                  <button
                    onClick={() => setGender('F')}
                    className={`flex-1 rounded-md text-sm font-mono font-semibold border transition-all ${gender === 'F' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
                  >Female</button>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleAdmit}
            disabled={!name.trim() || !age}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-mono font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" /> Admit Patient
          </button>
        </div>

        {/* ── Patient Queue ──────────────────────────────────────── */}
        <div className="clinical-card">
          <h2 className="text-sm font-mono font-semibold text-foreground mb-4 tracking-wide">PATIENT QUEUE</h2>
          {activePatients.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
              <p className="text-sm text-muted-foreground font-mono">No patients admitted</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                    <th className="text-left pb-2 pr-4">ID</th>
                    <th className="text-left pb-2 pr-4">Patient</th>
                    <th className="text-left pb-2 pr-4">Age / Sex</th>
                    <th className="text-left pb-2 pr-4">Bed</th>
                    <th className="text-left pb-2 pr-4">Admitted</th>
                    <th className="text-left pb-2 pr-4">Risk</th>
                    <th className="text-left pb-2 pr-4">Assigned Doctor</th>
                    <th className="text-right pb-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {activePatients.map(p => (
                    <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{p.id}</td>
                      <td className="py-3 pr-4 font-medium text-foreground">{p.name}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{p.age}y · {p.gender}</td>
                      <td className="py-3 pr-4">
                        <span className="bg-secondary border border-border px-2 py-0.5 rounded font-mono text-xs">{p.bed}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                          <Clock className="w-3 h-3" />
                          {formatDuration(now - p.admitTime)}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`vital-badge vital-${p.riskLevel}`}>{p.riskLevel.toUpperCase()}</span>
                      </td>
                      {/* Doctor column */}
                      <td className="py-3 pr-4">
                        {p.doctorPhoto ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={p.doctorPhoto}
                              alt={p.doctorName}
                              className="w-8 h-8 rounded-full object-cover border-2 border-primary/40"
                            />
                            <div>
                              <div className="text-xs font-semibold text-foreground leading-tight">{p.doctorName}</div>
                              <div className="text-[10px] font-mono text-muted-foreground">{(p as any).doctorSpecialty}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onDischarge(p.id)}
                          className="px-3 py-1.5 text-xs font-mono text-destructive border border-destructive/40 rounded-md hover:bg-destructive/10 transition-colors"
                        >
                          Discharge
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
