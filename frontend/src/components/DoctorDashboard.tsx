import { useState, useEffect, useRef, useCallback } from 'react';
import { Patient, formatDuration, predictDeterioration } from '@/lib/sepsisEngine';
import { Activity, LogOut, Eye, TrendingUp, TrendingDown, Minus, BellOff, Bell, AlertTriangle, Clock, FileText, Users, Brain, ShieldAlert, X } from 'lucide-react';
import ProfessionalMonitor from './ProfessionalMonitor';
import HandoffReport from './HandoffReport';
import RadarCompare from './RadarCompare';
import { useEscalation } from '@/hooks/useEscalation';

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
      <polyline fill="none" stroke="hsl(160, 65%, 48%)" strokeWidth="1.5" points={points} />
    </svg>
  );
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

const trendIcons = {
  improving: <TrendingDown className="w-3 h-3 text-vital-green inline" />,
  stable: <Minus className="w-3 h-3 text-muted-foreground inline" />,
  worsening: <TrendingUp className="w-3 h-3 text-destructive inline" />,
};

const riskBorderClass: Record<string, string> = {
  stable:   'risk-border-stable',
  warning:  'risk-border-warning',
  danger:   'risk-border-danger',
  critical: 'risk-border-critical',
};

export default function DoctorDashboard({ patients, onLogout }: DoctorDashboardProps) {
  const [monitorPatient, setMonitorPatient] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [silencedPatients, setSilencedPatients] = useState<Set<string>>(new Set());
  const [showHandoff, setShowHandoff] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Escalation system
  const { escalations, codeActive, acknowledgeAll, acknowledgeOne, getDangerDuration } = useEscalation(patients);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const activePatients = patients
    .filter(p => p.status !== 'discharged')
    .sort((a, b) => a.admitTime - b.admitTime);

  const monPatient = patients.find(p => p.id === monitorPatient);

  const alarmingPatients = activePatients.filter(
    p => (p.riskLevel === 'critical' || p.riskLevel === 'danger') && !silencedPatients.has(p.id)
  );

  const playAlarmWithNames = useCallback(() => {
    if (alarmingPatients.length === 0) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'square';
      gain.gain.value = 0.08;
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {}

    try {
      window.speechSynthesis.cancel();
      const names = alarmingPatients.map(p => `the patient ${p.name}`).join(', and ');
      const plural = alarmingPatients.length > 1 ? 'patients' : 'patient';
      const msg = new SpeechSynthesisUtterance(
        `Alert! High risk ${plural}: ${names}. Immediate attention required.`
      );
      msg.rate = 1.1;
      msg.pitch = 1.2;
      msg.volume = 1;
      speechRef.current = msg;
      window.speechSynthesis.speak(msg);
    } catch {}
  }, [alarmingPatients]);

  useEffect(() => {
    if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    if (alarmingPatients.length > 0) {
      playAlarmWithNames();
      alarmIntervalRef.current = setInterval(playAlarmWithNames, 8000);
    }
    return () => {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      window.speechSynthesis.cancel();
    };
  }, [alarmingPatients.length, playAlarmWithNames]);

  const silencePatient = (id: string) => setSilencedPatients(prev => new Set(prev).add(id));
  const silenceAll = () => {
    setSilencedPatients(new Set(alarmingPatients.map(p => p.id)));
    window.speechSynthesis.cancel();
  };

  useEffect(() => {
    setSilencedPatients(prev => {
      const updated = new Set(prev);
      for (const id of prev) {
        const p = activePatients.find(pt => pt.id === id);
        if (p && p.riskLevel !== 'critical' && p.riskLevel !== 'danger') updated.delete(id);
      }
      return updated.size !== prev.size ? updated : prev;
    });
  }, [activePatients]);

  const criticalCount = activePatients.filter(p => p.riskLevel === 'critical').length;
  const dangerCount = activePatients.filter(p => p.riskLevel === 'danger').length;

  // Show sub-views
  if (showHandoff) return <HandoffReport patients={patients} onClose={() => setShowHandoff(false)} />;
  if (showRadar) return <RadarCompare patients={patients} onClose={() => setShowRadar(false)} />;
  if (monPatient) return <ProfessionalMonitor patient={monPatient} onClose={() => setMonitorPatient(null)} />;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── CODE SEPSIS Overlay ───────────────────────────────── */}
      {codeActive && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'hsla(0, 80%, 10%, 0.85)' }}>
          <div className="bg-card border-2 border-destructive rounded-xl p-8 max-w-xl w-full mx-4 text-center animate-pulse">
            <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-3xl font-mono font-bold text-destructive mb-2 tracking-widest">CODE SEPSIS</h2>
            <p className="text-sm font-mono text-foreground mb-4">Immediate intervention required for escalated patients:</p>
            <div className="space-y-2 mb-6">
              {escalations.filter(e => !e.acknowledged).map(e => (
                <div key={e.patientId} className="flex items-center justify-between bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3">
                  <div className="text-left">
                    <div className="text-sm font-semibold text-foreground">{e.patientName}</div>
                    <div className="text-xs font-mono text-muted-foreground">{e.bed} · Score: {e.riskScore} · {e.riskLevel.toUpperCase()}</div>
                  </div>
                  <button
                    onClick={() => acknowledgeOne(e.patientId)}
                    className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded text-xs font-mono font-semibold hover:opacity-90 transition-all"
                  >
                    ACK
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={acknowledgeAll}
              className="w-full py-3 bg-destructive text-destructive-foreground rounded-lg text-sm font-mono font-bold hover:opacity-90 transition-all"
            >
              ACKNOWLEDGE ALL — RESPONSE INITIATED
            </button>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="hospital-header sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary flex-shrink-0" />
          <h1 className="font-mono text-base font-bold text-foreground tracking-wide">PHYSICIAN PORTAL</h1>
          <div className="flex items-center gap-2 ml-2">
            <span className="vital-badge vital-stable">{activePatients.length} Patients</span>
            {criticalCount > 0 && <span className="vital-badge vital-critical">{criticalCount} CRITICAL</span>}
            {dangerCount > 0 && <span className="vital-badge vital-danger">{dangerCount} DANGER</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiveClock />
          {/* Escalation log count */}
          {escalations.length > 0 && (
            <span className="text-[10px] font-mono text-destructive bg-destructive/10 border border-destructive/30 px-2 py-1 rounded">
              {escalations.filter(e => !e.acknowledged).length} Escalations
            </span>
          )}
          {alarmingPatients.length > 0 && (
            <button
              onClick={silenceAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/20 border border-destructive/50 rounded-md text-xs font-mono text-destructive hover:bg-destructive/30 transition-all animate-pulse"
            >
              <BellOff className="w-4 h-4" /> Silence All ({alarmingPatients.length})
            </button>
          )}
          {/* Feature buttons */}
          <button
            onClick={() => setShowRadar(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-md text-xs font-mono text-accent hover:bg-accent/20 transition-all"
          >
            <Users className="w-3.5 h-3.5" /> Compare
          </button>
          <button
            onClick={() => setShowHandoff(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-md text-xs font-mono text-primary hover:bg-primary/20 transition-all"
          >
            <FileText className="w-3.5 h-3.5" /> Handoff
          </button>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      {/* ── Critical alarm banner ──────────────────────────────── */}
      {alarmingPatients.length > 0 && (
        <div className="alarm-banner">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>ALERT — {alarmingPatients.length} patient{alarmingPatients.length > 1 ? 's' : ''} require immediate attention:</span>
          <span className="font-bold">{alarmingPatients.map(p => p.name).join(' · ')}</span>
        </div>
      )}

      {/* ── Main content ───────────────────────────────────────── */}
      <div className="flex-1 p-4">
        {activePatients.length === 0 ? (
          <div className="clinical-card text-center py-16">
            <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground font-mono">No patients in ward</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {activePatients.map(p => {
              const v = p.vitals;
              const pred = predictDeterioration(p.trendHistory, p.riskScore);
              const dangerMs = getDangerDuration(p.id);
              const dangerSec = dangerMs !== null ? Math.floor(dangerMs / 1000) : null;

              return (
                <div
                  key={p.id}
                  className={`clinical-card ${riskBorderClass[p.riskLevel] || ''} ${p.riskLevel === 'critical' ? 'glow-red' : ''}`}
                >
                  {/* Patient header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-base font-semibold text-foreground">{p.name}</div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                          <span className="bg-secondary px-1.5 py-0.5 rounded">{p.bed}</span>
                          <span>{p.id} · {p.age}y {p.gender} · {formatDuration(now - p.admitTime)}</span>
                          {p.doctorName && (
                            <div className="flex items-center gap-2 mt-1 bg-secondary/30 px-2 py-1.5 rounded-md border border-border/40">
                              <img 
                                src={p.doctorPhoto || '/placeholder.svg'} 
                                alt={p.doctorName} 
                                className="w-8 h-8 rounded-full border border-primary/40 object-cover shadow-sm" 
                              />
                              <div>
                                <div className="text-[10px] font-bold text-foreground leading-tight uppercase tracking-widest">{p.doctorName}</div>
                                <div className="text-[9px] font-mono text-muted-foreground">{p.doctorSpecialty}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`vital-badge vital-${p.riskLevel}`}>
                        {p.riskLevel.toUpperCase()} ({p.riskScore})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-vital-yellow">{p.survivalPrediction}</span>
                      {(p.riskLevel === 'critical' || p.riskLevel === 'danger') && (
                        silencedPatients.has(p.id) ? (
                          <span className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-muted-foreground bg-secondary rounded">
                            <BellOff className="w-3 h-3" /> Silenced
                          </span>
                        ) : (
                          <button
                            onClick={() => silencePatient(p.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-destructive/10 border border-destructive/30 rounded text-[10px] font-mono text-destructive hover:bg-destructive/20 transition-all animate-pulse"
                          >
                            <Bell className="w-3 h-3" /> Alarm ON
                          </button>
                        )
                      )}
                      <button
                        onClick={() => setMonitorPatient(p.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-mono font-semibold hover:opacity-90 active:scale-95 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> Monitor
                      </button>
                    </div>
                  </div>

                  {/* Vitals grid */}
                  <div className="grid grid-cols-6 gap-2 mb-2">
                    {[
                      { label: 'HR', val: v.hr, unit: 'bpm' },
                      { label: 'BP', val: `${v.sys}/${v.dia}`, unit: 'mmHg' },
                      { label: 'RR', val: v.rr, unit: '/min' },
                      { label: 'SpO2', val: v.spo2, unit: '%' },
                      { label: 'Temp', val: v.temp, unit: '°C' },
                    ].map(item => (
                      <div key={item.label} className="bg-secondary/70 border border-border/50 rounded px-2 py-2 text-center">
                        <div className="text-[9px] font-mono text-muted-foreground">{item.label}</div>
                        <div className="text-base font-mono font-bold text-foreground leading-tight mt-0.5">{item.val}</div>
                        <div className="text-[9px] font-mono text-muted-foreground">{item.unit}</div>
                      </div>
                    ))}
                    <div className="bg-secondary/70 border border-border/50 rounded px-2 py-2 text-center">
                      <div className="text-[9px] font-mono text-muted-foreground flex items-center justify-center gap-0.5">
                        <TrendingUp className="w-2.5 h-2.5" /> Trend
                      </div>
                      <TrendGraph history={p.trendHistory} />
                    </div>
                  </div>

                  {/* ── AI Prediction Bar (NEW) ─────────────────────────── */}
                  <div className="flex items-center gap-3 bg-secondary/30 border border-border/30 rounded px-3 py-2 mb-2">
                    <Brain className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <span className="text-[10px] font-mono text-accent font-semibold tracking-widest">AI FORECAST</span>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                      {trendIcons[pred.trend]}
                      <span className={pred.trend === 'worsening' ? 'text-destructive font-semibold' : pred.trend === 'improving' ? 'text-vital-green' : ''}>{pred.trend.toUpperCase()}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">1h: <span className={`vital-badge vital-${pred.predictedLevel1h}`}>{pred.predictedScore1h}</span></span>
                    <span className="text-[10px] font-mono text-muted-foreground">4h: <span className={`vital-badge vital-${pred.predictedLevel4h}`}>{pred.predictedScore4h}</span></span>
                    {pred.hoursToThreshold !== null && (
                      <span className="text-[10px] font-mono text-destructive font-bold animate-pulse">
                        ⚠ CRITICAL in ~{pred.hoursToThreshold.toFixed(1)}h
                      </span>
                    )}
                    {pred.confidence > 0 && (
                      <span className="text-[9px] font-mono text-muted-foreground ml-auto">Confidence: {pred.confidence}%</span>
                    )}
                  </div>

                  {/* ── Escalation timer (NEW) ──────────────────────────── */}
                  {dangerSec !== null && dangerSec > 0 && (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-mono mb-2 ${dangerSec >= 120 ? 'bg-destructive/15 border border-destructive/40 text-destructive' : 'bg-vital-orange/10 border border-vital-orange/30 text-vital-orange'}`}>
                      <ShieldAlert className="w-3 h-3 flex-shrink-0" />
                      <span>
                        {dangerSec >= 120 ? '⚠ ESCALATED' : `Escalation in ${120 - dangerSec}s`}
                        {' '} — In {p.riskLevel} for {Math.floor(dangerSec / 60)}m {dangerSec % 60}s
                      </span>
                    </div>
                  )}

                  {/* Sepsis flags */}
                  {p.sepsisFlags.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-1">
                      {p.sepsisFlags.map((f, i) => (
                        <span key={i} className="text-[10px] font-mono text-destructive bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 rounded">
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
    </div>
  );
}
