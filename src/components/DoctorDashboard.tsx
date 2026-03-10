import { useState, useEffect } from 'react';
import { Patient, formatDuration } from '@/lib/sepsisEngine';
import { Activity, LogOut, Eye, TrendingUp } from 'lucide-react';
import ProfessionalMonitor from './ProfessionalMonitor';

interface DoctorDashboardProps {
  patients: Patient[];
  onLogout: () => void;
}

function TrendGraph({ history }: { history: { time: number; score: number }[] }) {
  if (history.length < 2) return <span className="text-[10px] text-muted-foreground font-mono">Collecting...</span>;

  const maxScore = Math.max(...history.map(h => h.score), 10);
  const w = 120;
  const h = 40;
  const points = history.slice(-20).map((p, i, arr) => {
    const x = (i / (arr.length - 1)) * w;
    const y = h - (p.score / maxScore) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline fill="none" stroke="hsl(160, 60%, 45%)" strokeWidth="1.5" points={points} />
    </svg>
  );
}

export default function DoctorDashboard({ patients, onLogout }: DoctorDashboardProps) {
  const [monitorPatient, setMonitorPatient] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const activePatients = patients
    .filter(p => p.status !== 'discharged')
    .sort((a, b) => b.riskScore - a.riskScore);

  const monPatient = patients.find(p => p.id === monitorPatient);

  if (monPatient) {
    return <ProfessionalMonitor patient={monPatient} onClose={() => setMonitorPatient(null)} />;
  }

  const criticalCount = activePatients.filter(p => p.riskLevel === 'critical').length;
  const dangerCount = activePatients.filter(p => p.riskLevel === 'danger').length;

  return (
    <div className="min-h-screen p-4">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="font-mono text-lg font-bold text-foreground">PHYSICIAN PORTAL</h1>
          <span className="vital-badge vital-stable">{activePatients.length} Patients</span>
          {criticalCount > 0 && <span className="vital-badge vital-critical">{criticalCount} CRITICAL</span>}
          {dangerCount > 0 && <span className="vital-badge vital-danger">{dangerCount} DANGER</span>}
        </div>
        <button onClick={onLogout} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      {activePatients.length === 0 ? (
        <div className="clinical-card text-center py-12">
          <p className="text-muted-foreground">No patients in ward</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {activePatients.map(p => {
            const v = p.vitals;
            return (
              <div
                key={p.id}
                className={`clinical-card ${p.riskLevel === 'critical' ? 'glow-red border-destructive/50' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{p.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{p.id} · {p.bed} · {p.age}y {p.gender} · {formatDuration(now - p.admitTime)}</div>
                    </div>
                    <span className={`vital-badge vital-${p.riskLevel}`}>
                      {p.riskLevel.toUpperCase()} ({p.riskScore})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-vital-yellow">{p.survivalPrediction}</span>
                    <button
                      onClick={() => setMonitorPatient(p.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-md text-xs font-mono text-primary hover:bg-primary/20 transition-all"
                    >
                      <Eye className="w-3 h-3" /> Monitor
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2 mb-2">
                  {[
                    { label: 'HR', val: v.hr, unit: 'bpm' },
                    { label: 'BP', val: `${v.sys}/${v.dia}`, unit: 'mmHg' },
                    { label: 'RR', val: v.rr, unit: '/min' },
                    { label: 'SpO2', val: v.spo2, unit: '%' },
                    { label: 'Temp', val: v.temp, unit: '°C' },
                  ].map(item => (
                    <div key={item.label} className="bg-secondary/50 rounded px-2 py-1.5 text-center">
                      <div className="text-[9px] font-mono text-muted-foreground">{item.label}</div>
                      <div className="text-sm font-mono font-bold text-foreground">{item.val}</div>
                      <div className="text-[9px] font-mono text-muted-foreground">{item.unit}</div>
                    </div>
                  ))}
                  <div className="bg-secondary/50 rounded px-2 py-1.5 text-center">
                    <div className="text-[9px] font-mono text-muted-foreground flex items-center justify-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" /> Trend
                    </div>
                    <TrendGraph history={p.trendHistory} />
                  </div>
                </div>

                {p.sepsisFlags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {p.sepsisFlags.map((f, i) => (
                      <span key={i} className="text-[10px] font-mono text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
