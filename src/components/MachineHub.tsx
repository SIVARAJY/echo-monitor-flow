import { useState } from 'react';
import { Patient, Vitals, calculateRisk, calculateSurvivalTime } from '@/lib/sepsisEngine';
import { Cpu, LogOut, Sliders, AlertTriangle, Zap } from 'lucide-react';

interface MachineHubProps {
  patients: Patient[];
  onUpdateVitals: (id: string, vitals: Vitals) => void;
  onLogout: () => void;
}

const SCENARIOS = [
  { label: 'Normal', vitals: { hr: 75, sys: 120, dia: 80, rr: 16, spo2: 98, temp: 36.8 } },
  { label: 'Early Sepsis', vitals: { hr: 105, sys: 105, dia: 65, rr: 20, spo2: 94, temp: 38.6 } },
  { label: 'Septic Shock', vitals: { hr: 135, sys: 82, dia: 50, rr: 28, spo2: 87, temp: 39.8 } },
  { label: 'Cardiac Arrest', vitals: { hr: 30, sys: 60, dia: 35, rr: 6, spo2: 78, temp: 35.2 } },
];

export default function MachineHub({ patients, onUpdateVitals, onLogout }: MachineHubProps) {
  const activePatients = patients.filter(p => p.status !== 'discharged');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [manualVitals, setManualVitals] = useState<Vitals>({ hr: 75, sys: 120, dia: 80, rr: 16, spo2: 98, temp: 36.8 });

  const patient = activePatients.find(p => p.id === selectedPatient);

  const updateField = (key: keyof Vitals, value: number) => {
    setManualVitals(prev => ({ ...prev, [key]: value }));
  };

  const pushVitals = () => {
    if (selectedPatient) onUpdateVitals(selectedPatient, { ...manualVitals });
  };

  const applyScenario = (vitals: Vitals) => {
    setManualVitals({ ...vitals });
    if (selectedPatient) onUpdateVitals(selectedPatient, { ...vitals });
  };

  const preview = calculateRisk(manualVitals);

  return (
    <div className="min-h-screen p-4">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-vital-cyan" />
          <h1 className="font-mono text-lg font-bold text-foreground">MACHINE HUB</h1>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Patient selector */}
        <div className="clinical-card">
          <h2 className="text-sm font-mono font-semibold text-foreground mb-3">SELECT PATIENT</h2>
          {activePatients.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No patients to monitor</p>
          ) : (
            <div className="space-y-1">
              {activePatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPatient(p.id); setManualVitals({ ...p.vitals }); }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${
                    selectedPatient === p.id
                      ? 'bg-primary/10 border border-primary text-foreground'
                      : 'bg-secondary/50 border border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{p.name}</span>
                    <span className={`vital-badge vital-${p.riskLevel}`}>{p.riskLevel.toUpperCase()}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{p.id} · {p.bed}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Manual vitals */}
        <div className="clinical-card">
          <h2 className="text-sm font-mono font-semibold text-foreground mb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4" /> VITAL CONTROLS
          </h2>
          {!selectedPatient ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Select a patient first</p>
          ) : (
            <div className="space-y-3">
              {([
                { key: 'hr', label: 'Heart Rate', unit: 'bpm', min: 20, max: 200 },
                { key: 'sys', label: 'Systolic BP', unit: 'mmHg', min: 40, max: 220 },
                { key: 'dia', label: 'Diastolic BP', unit: 'mmHg', min: 20, max: 140 },
                { key: 'rr', label: 'Resp Rate', unit: '/min', min: 4, max: 45 },
                { key: 'spo2', label: 'SpO2', unit: '%', min: 60, max: 100 },
                { key: 'temp', label: 'Temp', unit: '°C', min: 33, max: 42, step: 0.1 },
              ] as const).map(v => (
                <div key={v.key}>
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                    <span>{v.label}</span>
                    <span className="text-foreground">{manualVitals[v.key as keyof Vitals]} {v.unit}</span>
                  </div>
                  <input
                    type="range"
                    min={v.min}
                    max={v.max}
                    step={v.key === 'temp' ? 0.1 : 1}
                    value={manualVitals[v.key as keyof Vitals]}
                    onChange={e => updateField(v.key as keyof Vitals, parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-border accent-primary"
                  />
                </div>
              ))}
              <button onClick={pushVitals} className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity">
                Push Vitals
              </button>
              {/* Live preview */}
              <div className="mt-2 p-2 rounded bg-secondary/50 border border-border">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-muted-foreground">Preview Score</span>
                  <span className={`vital-badge vital-${preview.level}`}>{preview.score} — {preview.level.toUpperCase()}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{calculateSurvivalTime(preview.score)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Scenarios */}
        <div className="clinical-card">
          <h2 className="text-sm font-mono font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" /> QUICK SCENARIOS
          </h2>
          {!selectedPatient ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Select a patient first</p>
          ) : (
            <div className="space-y-2">
              {SCENARIOS.map(s => {
                const r = calculateRisk(s.vitals);
                return (
                  <button
                    key={s.label}
                    onClick={() => applyScenario(s.vitals)}
                    className="w-full text-left px-3 py-3 rounded-lg bg-secondary/50 border border-border hover:border-muted-foreground transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{s.label}</span>
                      <span className={`vital-badge vital-${r.level}`}>{r.level.toUpperCase()}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                      HR:{s.vitals.hr} SYS:{s.vitals.sys} RR:{s.vitals.rr} SpO2:{s.vitals.spo2} T:{s.vitals.temp}
                    </div>
                  </button>
                );
              })}
              {patient && patient.sepsisFlags.length > 0 && (
                <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/30">
                  <div className="flex items-center gap-1 text-xs font-mono text-destructive mb-1">
                    <AlertTriangle className="w-3 h-3" /> ACTIVE FLAGS
                  </div>
                  {patient.sepsisFlags.map((f, i) => (
                    <div key={i} className="text-[10px] text-destructive/80 font-mono">• {f}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
