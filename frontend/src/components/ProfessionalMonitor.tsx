import { useRef, useEffect, useCallback } from 'react';
import { Patient, formatDuration } from '@/lib/sepsisEngine';
import { X, Volume2, Radio } from 'lucide-react';
import CorrelationHeatmap from './CorrelationHeatmap';

interface ProfessionalMonitorProps {
  patient: Patient;
  onClose: () => void;
}

export default function ProfessionalMonitor({ patient, onClose }: ProfessionalMonitorProps) {
  const ecgRef = useRef<HTMLCanvasElement>(null);
  const spo2Ref = useRef<HTMLCanvasElement>(null);
  const respRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const animRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isCritical = patient.riskScore >= 5;

  const playAlarm = useCallback(() => {
    if (!isCritical) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'square';
      gain.gain.value = 0.05;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, [isCritical]);

  useEffect(() => {
    const alarmIv = isCritical ? setInterval(playAlarm, 3000) : undefined;
    return () => { if (alarmIv) clearInterval(alarmIv); };
  }, [isCritical, playAlarm]);

  const drawWave = useCallback((canvas: HTMLCanvasElement, type: 'ecg' | 'spo2' | 'resp', frame: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = 'hsl(222, 30%, 5%)';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'hsla(220, 15%, 25%, 0.25)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const colors = { ecg: '#33d17a', spo2: '#3584e4', resp: '#f6d32d' };
    ctx.strokeStyle = colors[type];
    ctx.lineWidth = 2;
    ctx.shadowColor = colors[type];
    ctx.shadowBlur = 8;
    ctx.beginPath();

    const mid = h / 2;
    const speed = 3;
    const offset = (frame * speed) % w;

    for (let x = 0; x < w; x++) {
      const t = (x + offset) / w;
      let y = mid;

      if (type === 'ecg') {
        const beatPhase = (t * 4) % 1;
        if (beatPhase < 0.04) y = mid - 5;
        else if (beatPhase < 0.06) y = mid + 8;
        else if (beatPhase < 0.08) y = mid - (40 * (patient.vitals.hr / 80));
        else if (beatPhase < 0.10) y = mid + 15;
        else if (beatPhase < 0.14) y = mid - 3;
        else y = mid + Math.sin(beatPhase * Math.PI * 2) * 2;
      } else if (type === 'spo2') {
        const phase = (t * 2) % 1;
        if (phase < 0.3) y = mid - Math.sin(phase / 0.3 * Math.PI) * 25 * (patient.vitals.spo2 / 100);
        else y = mid + Math.sin((phase - 0.3) / 0.7 * Math.PI) * 8;
      } else {
        y = mid - Math.sin(t * Math.PI * 2 * 1.5) * 20 * (patient.vitals.rr / 16);
      }

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Sweep line
    const sweepX = offset % w;
    ctx.fillStyle = 'hsla(222, 30%, 5%, 0.95)';
    ctx.fillRect(sweepX, 0, 30, h);
  }, [patient.vitals]);

  useEffect(() => {
    const animate = () => {
      frameRef.current++;
      if (ecgRef.current) drawWave(ecgRef.current, 'ecg', frameRef.current);
      if (spo2Ref.current) drawWave(spo2Ref.current, 'spo2', frameRef.current);
      if (respRef.current) drawWave(respRef.current, 'resp', frameRef.current);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [drawWave]);

  useEffect(() => {
    const resize = () => {
      [ecgRef, spo2Ref, respRef].forEach(ref => {
        if (ref.current) {
          const parent = ref.current.parentElement;
          if (parent) {
            ref.current.width = parent.clientWidth;
            ref.current.height = parent.clientHeight;
          }
        }
      });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const v = patient.vitals;
  const stayDuration = formatDuration(Date.now() - patient.admitTime);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isCritical ? 'glow-red' : 'glow-green'}`} style={{ background: 'hsl(222 30% 5%)' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'hsl(222 18% 18%)', background: 'hsl(222 26% 8%)' }}>
        <div className="flex items-center gap-4">
          <div>
            <div className="font-mono text-lg font-bold text-foreground leading-tight">{patient.name}</div>
            <div className="text-xs font-mono text-muted-foreground">{patient.id} · {patient.age}y {patient.gender}</div>
          </div>
          <span className="bg-secondary border border-border px-2 py-1 rounded font-mono text-sm font-semibold text-foreground">
            {patient.bed}
          </span>
          {patient.doctorName && (
            <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded text-xs">
              <img src={patient.doctorPhoto || '/placeholder.svg'} alt={patient.doctorName} className="w-4 h-4 rounded-full" />
              <span className="font-mono text-foreground">{patient.doctorName}</span>
            </div>
          )}
          <span className={`vital-badge vital-${patient.riskLevel}`}>
            {patient.riskLevel.toUpperCase()} — Score: {patient.riskScore}
          </span>
          {/* LIVE badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/30">
            <Radio className="w-3 h-3 text-primary animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-primary tracking-widest">LIVE</span>
          </div>
          {isCritical && <Volume2 className="w-4 h-4 text-destructive animate-pulse" />}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-mono text-muted-foreground">Stay: {stayDuration}</div>
            <div className="text-xs font-mono text-vital-yellow">{patient.survivalPrediction}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-secondary transition-colors border border-border">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ── Vitals bar ─────────────────────────────────────────── */}
      <div className="grid grid-cols-6 border-b" style={{ borderColor: 'hsl(222 18% 18%)' }}>
        {[
          { label: 'HR', value: v.hr, unit: 'bpm', color: 'text-vital-green' },
          { label: 'SYS/DIA', value: `${v.sys}/${v.dia}`, unit: 'mmHg', color: 'text-vital-red' },
          { label: 'RR', value: v.rr, unit: '/min', color: 'text-vital-yellow' },
          { label: 'SpO2', value: v.spo2, unit: '%', color: 'text-vital-blue' },
          { label: 'TEMP', value: v.temp, unit: '°C', color: 'text-vital-purple' },
          { label: 'SCORE', value: patient.riskScore, unit: 'pts', color: isCritical ? 'text-vital-red' : 'text-vital-green' },
        ].map(item => (
          <div key={item.label} className="text-center py-3 border-r last:border-r-0" style={{ borderColor: 'hsl(222 18% 18%)', background: 'hsl(222 26% 7%)' }}>
            <div className="text-[10px] font-mono text-muted-foreground tracking-widest">{item.label}</div>
            <div className={`text-3xl font-mono font-bold ${item.color} leading-tight mt-1`}>{item.value}</div>
            <div className="text-[10px] font-mono text-muted-foreground">{item.unit}</div>
          </div>
        ))}
      </div>

      {/* ── Waveforms ──────────────────────────────────────────── */}
      <div className="flex-1 grid grid-rows-3">
        {[
          { ref: ecgRef, label: 'II ECG', color: 'text-vital-green' },
          { ref: spo2Ref, label: 'SpO2 Pleth', color: 'text-vital-blue' },
          { ref: respRef, label: 'RESP', color: 'text-vital-yellow' },
        ].map(wave => (
          <div key={wave.label} className="relative border-b last:border-b-0" style={{ borderColor: 'hsl(222 18% 18%)' }}>
            <span className={`absolute top-2 left-3 text-xs font-mono font-semibold ${wave.color} z-10 tracking-widest`}>{wave.label}</span>
            <canvas ref={wave.ref} className="w-full h-full" />
          </div>
        ))}
      </div>

      {/* ── Bottom panels: Flags + Correlation Heatmap ────────── */}
      <div className="flex border-t" style={{ borderColor: 'hsl(222 18% 18%)' }}>
        {/* Sepsis Flags */}
        <div className="flex-1 px-5 py-2.5">
          {patient.sepsisFlags.length > 0 ? (
            <div className="flex items-center gap-3 flex-wrap" style={{ background: 'hsl(0 80% 60% / 0.12)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid hsl(0 80% 60% / 0.3)' }}>
              <span className="text-xs font-mono text-destructive font-bold tracking-widest">⚠ FLAGS:</span>
              {patient.sepsisFlags.map((f, i) => (
                <span key={i} className="text-xs font-mono text-destructive/90 bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded">
                  {f}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs font-mono text-muted-foreground py-2">No active sepsis flags</div>
          )}
        </div>
        {/* Correlation Heatmap */}
        <div className="px-4 py-2.5 border-l" style={{ borderColor: 'hsl(222 18% 18%)' }}>
          <CorrelationHeatmap patient={patient} />
        </div>
      </div>
    </div>
  );
}
