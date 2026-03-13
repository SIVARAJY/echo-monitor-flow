import { useState } from 'react';
import { Patient, Vitals, calculateRisk, calculateSurvivalTime } from '@/lib/sepsisEngine';
import { Cpu, LogOut, Sliders, AlertTriangle, Zap, Send } from 'lucide-react';
import { usePatients } from '@/hooks/usePatients';

interface MachineHubProps {
  onLogout: () => void;
}

const SCENARIOS = [
  { label: 'Normal', vitals: { hr: 75, sys: 120, dia: 80, rr: 16, spo2: 98, temp: 36.8 } },
  { label: 'Early Sepsis', vitals: { hr: 105, sys: 105, dia: 65, rr: 20, spo2: 94, temp: 38.6 } },
  { label: 'Septic Shock', vitals: { hr: 135, sys: 82, dia: 50, rr: 28, spo2: 87, temp: 39.8 } },
  { label: 'Cardiac Arrest', vitals: { hr: 30, sys: 60, dia: 35, rr: 6, spo2: 78, temp: 35.2 } },
];

const riskBorderClass: Record<string, string> = {
  stable:   'risk-border-stable',
  warning:  'risk-border-warning',
  danger:   'risk-border-danger',
  critical: 'risk-border-critical',
};

export default function MachineHub({ onLogout }: MachineHubProps) {
  const { patients, handleUpdateVitals: onUpdateVitals } = usePatients();
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
    <div className="min-h-screen flex flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="hospital-header sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-vital-cyan flex-shrink-0" />
          <h1 className="font-mono text-base font-bold text-foreground tracking-wide">MACHINE HUB</h1>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      <div className="flex-1 p-4">
        <div className="grid md:grid-cols-3 gap-4">
          {/* ── Patient selector ─────────────────────────────────── */}
          <div className="clinical-card">
            <h2 className="text-xs font-mono font-semibold text-muted-foreground mb-3 tracking-widest uppercase">Select Patient</h2>
            {activePatients.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center font-mono">No patients to monitor</p>
            ) : (
              <div className="space-y-1.5">
                {activePatients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPatient(p.id); setManualVitals({ ...p.vitals }); }}
                    className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all border ${riskBorderClass[p.riskLevel] || ''} ${
                      selectedPatient === p.id
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{p.name}</span>
                      <span className={`vital-badge vital-${p.riskLevel}`}>{p.riskLevel.toUpperCase()}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{p.id} · {p.bed}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Manual vitals ─────────────────────────────────────── */}
          <div className="clinical-card">
            <h2 className="text-xs font-mono font-semibold text-muted-foreground mb-3 tracking-widest uppercase flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" /> Vital Controls
            </h2>
            {!selectedPatient ? (
              <p className="text-xs text-muted-foreground py-4 text-center font-mono">Select a patient first</p>
            ) : (
              <div className="space-y-4">
                {([
                  { key: 'hr', label: 'Heart Rate', unit: 'bpm', min: 20, max: 200, color: 'hsl(160 65% 48%)' },
                  { key: 'sys', label: 'Systolic BP', unit: 'mmHg', min: 40, max: 220, color: 'hsl(0 80% 60%)' },
                  { key: 'dia', label: 'Diastolic BP', unit: 'mmHg', min: 20, max: 140, color: 'hsl(0 80% 60%)' },
                  { key: 'rr', label: 'Resp Rate', unit: '/min', min: 4, max: 45, color: 'hsl(45 95% 58%)' },
                  { key: 'spo2', label: 'SpO2', unit: '%', min: 60, max: 100, color: 'hsl(200 85% 58%)' },
                  { key: 'temp', label: 'Temperature', unit: '°C', min: 33, max: 42, color: 'hsl(270 60% 62%)' },
                ] as const).map(v => (
                  <div key={v.key}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[11px] font-mono text-muted-foreground">{v.label}</span>
                      <span className="text-sm font-mono font-bold text-foreground">
                        {manualVitals[v.key as keyof Vitals]} <span className="text-[10px] text-muted-foreground font-normal">{v.unit}</span>
                      </span>
                    </div>
                    <input
                      type="range"
                      min={v.min}
                      max={v.max}
                      step={v.key === 'temp' ? 0.1 : 1}
                      value={manualVitals[v.key as keyof Vitals]}
                      onChange={e => updateField(v.key as keyof Vitals, parseFloat(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none bg-secondary/70 accent-primary cursor-pointer"
                    />
                  </div>
                ))}

                {/* Preview score */}
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-mono text-muted-foreground">Preview Score</span>
                    <span className={`vital-badge vital-${preview.level}`}>{preview.score} — {preview.level.toUpperCase()}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">{calculateSurvivalTime(preview.score)}</p>
                </div>

                <button
                  onClick={pushVitals}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-mono font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  <Send className="w-4 h-4" /> Push Vitals
                </button>
              </div>
            )}
          </div>

          {/* ── Scenarios ──────────────────────────────────────────── */}
          <div className="clinical-card">
            <h2 className="text-xs font-mono font-semibold text-muted-foreground mb-3 tracking-widest uppercase flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" /> Quick Scenarios
            </h2>
            {!selectedPatient ? (
              <p className="text-xs text-muted-foreground py-4 text-center font-mono">Select a patient first</p>
            ) : (
              <div className="space-y-2">
                {SCENARIOS.map(s => {
                  const r = calculateRisk(s.vitals);
                  return (
                    <button
                      key={s.label}
                      onClick={() => applyScenario(s.vitals)}
                      className={`w-full text-left px-3 py-3 rounded-lg bg-secondary/50 border border-border hover:bg-secondary hover:border-muted-foreground transition-all ${riskBorderClass[r.level] || ''}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-foreground">{s.label}</span>
                        <span className={`vital-badge vital-${r.level}`}>{r.level.toUpperCase()}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                        HR:{s.vitals.hr} SYS:{s.vitals.sys} RR:{s.vitals.rr} SpO2:{s.vitals.spo2} T:{s.vitals.temp}
                      </div>
                    </button>
                  );
                })}
                {patient && patient.sepsisFlags.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-destructive mb-2">
                      <AlertTriangle className="w-3.5 h-3.5" /> ACTIVE FLAGS
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
    </div>
  );
}
