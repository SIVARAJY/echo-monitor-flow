import { useState, useMemo } from 'react';
import { Patient } from '@/lib/sepsisEngine';
import { Users, X, Check } from 'lucide-react';

interface RadarCompareProps {
  patients: Patient[];
  onClose: () => void;
}

const VITAL_CONFIG = [
  { key: 'hr' as const, label: 'HR', min: 20, max: 200, normalMin: 60, normalMax: 100 },
  { key: 'sys' as const, label: 'SYS', min: 40, max: 220, normalMin: 100, normalMax: 140 },
  { key: 'rr' as const, label: 'RR', min: 4, max: 45, normalMin: 12, normalMax: 20 },
  { key: 'spo2' as const, label: 'SpO2', min: 60, max: 100, normalMin: 95, normalMax: 100 },
  { key: 'temp' as const, label: 'Temp', min: 33, max: 42, normalMin: 36.1, normalMax: 37.5 },
  { key: 'dia' as const, label: 'DIA', min: 20, max: 140, normalMin: 60, normalMax: 90 },
];

const PATIENT_COLORS = [
  'hsl(160, 65%, 48%)', // green
  'hsl(200, 85%, 58%)', // blue
  'hsl(45, 95%, 58%)',  // yellow
  'hsl(270, 60%, 62%)', // purple
];

function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export default function RadarCompare({ patients, onClose }: RadarCompareProps) {
  const activePatients = patients.filter(p => p.status !== 'discharged');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const togglePatient = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, id];
    });
  };

  const selectedPatients = useMemo(
    () => selectedIds.map(id => activePatients.find(p => p.id === id)).filter(Boolean) as Patient[],
    [selectedIds, activePatients]
  );

  // SVG radar params
  const cx = 200, cy = 200, radius = 150;
  const n = VITAL_CONFIG.length;
  const angleStep = (2 * Math.PI) / n;

  // Generate axis endpoints
  const axes = VITAL_CONFIG.map((_, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      labelX: cx + Math.cos(angle) * (radius + 22),
      labelY: cy + Math.sin(angle) * (radius + 22),
    };
  });

  // Normal zone polygon
  const normalPath = VITAL_CONFIG.map((v, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const normMin = normalize(v.normalMin, v.min, v.max);
    const normMax = normalize(v.normalMax, v.min, v.max);
    const avg = (normMin + normMax) / 2;
    const r = avg * radius;
    return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
  }).join(' ');

  // Patient polygons
  const patientPaths = selectedPatients.map((p, pi) => {
    const points = VITAL_CONFIG.map((v, i) => {
      const angle = -Math.PI / 2 + i * angleStep;
      const val = normalize(p.vitals[v.key], v.min, v.max);
      const r = val * radius;
      return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
    }).join(' ');
    return { points, color: PATIENT_COLORS[pi % PATIENT_COLORS.length], name: p.name };
  });

  // Concentric grid circles
  const gridCircles = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* Sidebar: patient selector */}
      <div className="w-64 border-r border-border p-4 overflow-y-auto bg-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono font-bold text-foreground tracking-wide">SELECT PATIENTS</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mb-3">Select up to 4 patients to compare</p>
        <div className="space-y-1.5">
          {activePatients.map((p, i) => {
            const isSelected = selectedIds.includes(p.id);
            const colorIdx = selectedIds.indexOf(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePatient(p.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                } ${selectedIds.length >= 4 && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                disabled={selectedIds.length >= 4 && !isSelected}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PATIENT_COLORS[colorIdx] }} />
                    )}
                    <span className="font-semibold truncate">{p.name}</span>
                  </div>
                  <span className={`vital-badge vital-${p.riskLevel}`}>{p.riskLevel.toUpperCase()}</span>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{p.id} · {p.bed}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main: radar chart */}
      <div className="flex-1 flex items-center justify-center p-8">
        {selectedPatients.length === 0 ? (
          <div className="text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="font-mono text-muted-foreground text-sm">Select patients from the sidebar to compare vitals</p>
          </div>
        ) : (
          <div className="space-y-4">
            <svg width={400} height={400} viewBox="0 0 400 400">
              {/* Grid circles */}
              {gridCircles.map(pct => (
                <circle
                  key={pct}
                  cx={cx}
                  cy={cy}
                  r={radius * pct}
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="0.5"
                  strokeDasharray="3,3"
                />
              ))}

              {/* Axes */}
              {axes.map((axis, i) => (
                <g key={i}>
                  <line x1={cx} y1={cy} x2={axis.x} y2={axis.y} stroke="hsl(var(--border))" strokeWidth="0.5" />
                  <text
                    x={axis.labelX}
                    y={axis.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="hsl(var(--muted-foreground))"
                    fontSize="10"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {VITAL_CONFIG[i].label}
                  </text>
                </g>
              ))}

              {/* Normal zone */}
              <polygon
                points={normalPath}
                fill="hsl(160, 65%, 48%, 0.06)"
                stroke="hsl(160, 65%, 48%, 0.2)"
                strokeWidth="1"
                strokeDasharray="4,4"
              />

              {/* Patient overlays */}
              {patientPaths.map((pp, i) => (
                <g key={i}>
                  <polygon
                    points={pp.points}
                    fill={pp.color.replace(')', ', 0.12)')}
                    stroke={pp.color}
                    strokeWidth="2"
                  />
                  {/* Dots at vertices */}
                  {pp.points.split(' ').map((pt, j) => {
                    const [x, y] = pt.split(',').map(Number);
                    return <circle key={j} cx={x} cy={y} r="4" fill={pp.color} />;
                  })}
                </g>
              ))}
            </svg>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center">
              {selectedPatients.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: PATIENT_COLORS[i % PATIENT_COLORS.length] }} />
                  <span className="text-xs font-mono text-foreground">{p.name}</span>
                  <span className={`vital-badge vital-${p.riskLevel}`}>{p.riskScore}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
                <div className="w-3 h-3 rounded-sm border border-dashed" style={{ borderColor: 'hsl(160, 65%, 48%, 0.4)', background: 'hsl(160, 65%, 48%, 0.08)' }} />
                <span className="text-[10px] font-mono text-muted-foreground">Normal Zone</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
