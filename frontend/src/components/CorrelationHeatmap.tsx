import { useRef, useEffect, useMemo } from 'react';
import { Patient } from '@/lib/sepsisEngine';

interface CorrelationHeatmapProps {
  patient: Patient;
}

const VITAL_KEYS = ['hr', 'sys', 'dia', 'rr', 'spo2', 'temp'] as const;
const VITAL_LABELS = ['HR', 'SYS', 'DIA', 'RR', 'SpO2', 'Temp'];

// Normal ranges for each vital (used for deviation-based correlation)
const NORMAL: Record<string, { center: number; range: number }> = {
  hr:   { center: 75,  range: 55 },
  sys:  { center: 120, range: 60 },
  dia:  { center: 80,  range: 40 },
  rr:   { center: 16,  range: 12 },
  spo2: { center: 98,  range: 12 },
  temp: { center: 36.8, range: 3 },
};

/**
 * Calculate a correlation-like score between two vitals
 * based on how abnormal they are simultaneously.
 * Returns -1 (inversely dangerous) to +1 (jointly dangerous).
 */
function calcCorrelation(v1Key: string, v1Val: number, v2Key: string, v2Val: number): number {
  const n1 = NORMAL[v1Key];
  const n2 = NORMAL[v2Key];
  if (!n1 || !n2) return 0;

  // Signed deviation: positive = above normal, negative = below
  const dev1 = (v1Val - n1.center) / n1.range;
  const dev2 = (v2Val - n2.center) / n2.range;

  // Special dangerous combinations
  // HR high + BP low = very dangerous (sepsis sign)
  if ((v1Key === 'hr' && v2Key === 'sys') || (v1Key === 'sys' && v2Key === 'hr')) {
    if (dev1 > 0 && dev2 < 0) return -Math.min(1, Math.abs(dev1 * dev2) * 2);
    if (dev1 < 0 && dev2 > 0) return -Math.min(1, Math.abs(dev1 * dev2) * 2);
  }

  // SpO2 low + RR high = respiratory failure
  if ((v1Key === 'spo2' && v2Key === 'rr') || (v1Key === 'rr' && v2Key === 'spo2')) {
    if ((v1Key === 'spo2' && dev1 < 0 && dev2 > 0) || (v2Key === 'spo2' && dev2 < 0 && dev1 > 0)) {
      return -Math.min(1, Math.abs(dev1 * dev2) * 2);
    }
  }

  // General: if both severely deviated in same direction, concerning
  const product = dev1 * dev2;
  return Math.max(-1, Math.min(1, product));
}

function getCellColor(correlation: number): string {
  if (correlation > 0.5) return `hsla(160, 65%, 48%, ${0.15 + correlation * 0.4})`; // green = normal
  if (correlation > 0) return `hsla(160, 65%, 48%, ${0.1 + correlation * 0.2})`;
  if (correlation > -0.3) return `hsla(45, 95%, 58%, ${0.15 + Math.abs(correlation) * 0.3})`; // yellow = warning
  if (correlation > -0.6) return `hsla(25, 95%, 58%, ${0.2 + Math.abs(correlation) * 0.4})`; // orange = danger
  return `hsla(0, 80%, 60%, ${0.3 + Math.abs(correlation) * 0.5})`; // red = critical
}

export default function CorrelationHeatmap({ patient }: CorrelationHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const v = patient.vitals;

  const matrix = useMemo(() => {
    const vals = VITAL_KEYS.map(k => v[k]);
    const m: number[][] = [];
    for (let i = 0; i < VITAL_KEYS.length; i++) {
      m[i] = [];
      for (let j = 0; j < VITAL_KEYS.length; j++) {
        if (i === j) m[i][j] = 1;
        else m[i][j] = calcCorrelation(VITAL_KEYS[i], vals[i], VITAL_KEYS[j], vals[j]);
      }
    }
    return m;
  }, [v.hr, v.sys, v.dia, v.rr, v.spo2, v.temp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 280;
    const cellSize = 36;
    const labelWidth = 44;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = 'hsl(222, 30%, 5%)';
    ctx.fillRect(0, 0, size, size);

    // Draw cells
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        const x = labelWidth + j * cellSize;
        const y = labelWidth + i * cellSize;
        const corr = matrix[i][j];

        // Cell background
        ctx.fillStyle = i === j ? 'hsla(222, 20%, 20%, 0.4)' : getCellColor(corr);
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

        // Cell text
        ctx.fillStyle = i === j ? 'hsl(210, 15%, 55%)' : 'hsl(210, 20%, 92%)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          i === j ? '—' : corr.toFixed(1),
          x + cellSize / 2,
          y + cellSize / 2
        );
      }
    }

    // Draw labels
    ctx.fillStyle = 'hsl(210, 12%, 52%)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 6; i++) {
      // Row labels
      ctx.fillText(VITAL_LABELS[i], labelWidth - 6, labelWidth + i * cellSize + cellSize / 2);
      // Column labels
      ctx.save();
      ctx.translate(labelWidth + i * cellSize + cellSize / 2, labelWidth - 6);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = 'left';
      ctx.fillText(VITAL_LABELS[i], 0, 0);
      ctx.restore();
    }
  }, [matrix]);

  // Find dangerous correlations
  const dangerousPairs: string[] = [];
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      if (matrix[i][j] < -0.3) {
        dangerousPairs.push(`${VITAL_LABELS[i]}↔${VITAL_LABELS[j]}`);
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
          Vital Correlations
        </span>
        <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: 'hsl(160, 65%, 48%)' }} /> Normal</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: 'hsl(45, 95%, 58%)' }} /> Warning</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: 'hsl(0, 80%, 60%)' }} /> Danger</span>
        </div>
      </div>
      <canvas ref={canvasRef} className="rounded-md" />
      {dangerousPairs.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {dangerousPairs.map(pair => (
            <span key={pair} className="text-[10px] font-mono text-destructive bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 rounded">
              ⚠ {pair}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
