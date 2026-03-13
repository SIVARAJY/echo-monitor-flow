import { Patient, formatDuration, predictDeterioration } from '@/lib/sepsisEngine';
import { FileText, Printer, X, Activity, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HandoffReportProps {
  patients: Patient[];
  onClose: () => void;
}

function SparkLine({ history }: { history: { time: number; score: number }[] }) {
  if (history.length < 2) return <span className="text-muted-foreground text-[10px]">—</span>;
  const w = 80;
  const h = 20;
  const maxScore = Math.max(...history.map(h => h.score), 10);
  const pts = history.slice(-20).map((p, i, arr) => {
    const x = (i / (arr.length - 1)) * w;
    const y = h - (p.score / maxScore) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline fill="none" stroke="hsl(160, 65%, 48%)" strokeWidth="1.5" points={pts} />
    </svg>
  );
}

const trendIcons = {
  improving: <TrendingDown className="w-3 h-3 text-vital-green inline" />,
  stable: <Minus className="w-3 h-3 text-muted-foreground inline" />,
  worsening: <TrendingUp className="w-3 h-3 text-destructive inline" />,
};

export default function HandoffReport({ patients, onClose }: HandoffReportProps) {
  const activePatients = patients.filter(p => p.status !== 'discharged').sort((a, b) => a.admitTime - b.admitTime);
  const now = Date.now();
  const reportTime = new Date().toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const criticalCount = activePatients.filter(p => p.riskLevel === 'critical').length;
  const dangerCount = activePatients.filter(p => p.riskLevel === 'danger').length;
  const maxScore = activePatients.reduce((max, p) => Math.max(max, p.riskScore), 0);

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-background">
      {/* ── Controls (hidden in print) ──────────────────────── */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <span className="font-mono text-base font-bold text-foreground">SHIFT HANDOFF REPORT</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-mono font-semibold hover:opacity-90 transition-all"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-secondary transition-colors border border-border">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ── Report Content ──────────────────────────────────── */}
      <div className="max-w-4xl mx-auto p-8 space-y-6 print:p-4 print:max-w-none">
        {/* Hospital header */}
        <div className="text-center border-b border-border pb-6 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'hsl(0 80% 58% / 0.18)', border: '1px solid hsl(0 80% 58% / 0.4)' }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="hsl(0, 80%, 60%)">
                <rect x="9" y="2" width="6" height="20" rx="1"/>
                <rect x="2" y="9" width="20" height="6" rx="1"/>
              </svg>
            </div>
            <div>
              <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase">City General Hospital</div>
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-lg font-bold font-mono text-foreground">
                  SEPSIS<span className="text-primary">GUARD</span>
                </span>
              </div>
            </div>
          </div>
          <h1 className="text-xl font-mono font-bold text-foreground mt-4">SHIFT HANDOFF REPORT</h1>
          <p className="text-sm font-mono text-muted-foreground mt-1">{reportTime}</p>
        </div>

        {/* Summary statistics */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Active', value: activePatients.length, color: 'text-primary' },
            { label: 'Critical', value: criticalCount, color: criticalCount > 0 ? 'text-vital-red' : 'text-muted-foreground' },
            { label: 'Danger', value: dangerCount, color: dangerCount > 0 ? 'text-vital-orange' : 'text-muted-foreground' },
            { label: 'Peak Risk Score', value: maxScore, color: maxScore >= 8 ? 'text-vital-red' : 'text-vital-green' },
          ].map(stat => (
            <div key={stat.label} className="clinical-card text-center">
              <div className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">{stat.label}</div>
              <div className={`text-2xl font-mono font-bold ${stat.color} mt-1`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Patient summaries */}
        {activePatients.map(p => {
          const pred = predictDeterioration(p.trendHistory, p.riskScore);
          return (
            <div key={p.id} className={`clinical-card ${p.riskLevel === 'critical' ? 'border-l-4 border-l-[hsl(0,80%,60%)]' : p.riskLevel === 'danger' ? 'border-l-4 border-l-[hsl(25,95%,58%)]' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-base font-semibold text-foreground">{p.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">{p.id} · {p.age}y {p.gender} · {p.bed}</div>
                  {p.doctorName && (
                    <div className="text-xs font-mono text-muted-foreground mt-0.5">Attending: {p.doctorName}</div>
                  )}
                </div>
                <div className="text-right">
                  <span className={`vital-badge vital-${p.riskLevel}`}>{p.riskLevel.toUpperCase()} ({p.riskScore})</span>
                  <div className="text-xs font-mono text-muted-foreground mt-1">Stay: {formatDuration(now - p.admitTime)}</div>
                </div>
              </div>

              {/* Vitals snapshot */}
              <div className="grid grid-cols-6 gap-2 mb-3">
                {[
                  { label: 'HR', val: p.vitals.hr, unit: 'bpm' },
                  { label: 'BP', val: `${p.vitals.sys}/${p.vitals.dia}`, unit: 'mmHg' },
                  { label: 'RR', val: p.vitals.rr, unit: '/min' },
                  { label: 'SpO2', val: p.vitals.spo2, unit: '%' },
                  { label: 'Temp', val: p.vitals.temp, unit: '°C' },
                  { label: 'Trend', val: '', unit: '' },
                ].map((item, idx) => (
                  <div key={item.label} className="bg-secondary/50 rounded px-2 py-1.5 text-center">
                    <div className="text-[9px] font-mono text-muted-foreground">{item.label}</div>
                    {idx === 5 ? (
                      <SparkLine history={p.trendHistory} />
                    ) : (
                      <div className="text-sm font-mono font-bold text-foreground">{item.val}</div>
                    )}
                    <div className="text-[9px] font-mono text-muted-foreground">{item.unit}</div>
                  </div>
                ))}
              </div>

              {/* AI Prediction */}
              <div className="flex items-center gap-4 text-[11px] font-mono text-muted-foreground mb-2 bg-secondary/30 px-3 py-2 rounded">
                <span>AI Forecast: {trendIcons[pred.trend]} {pred.trend.toUpperCase()}</span>
                <span>1h: <span className={`vital-badge vital-${pred.predictedLevel1h}`}>{pred.predictedScore1h}</span></span>
                <span>4h: <span className={`vital-badge vital-${pred.predictedLevel4h}`}>{pred.predictedScore4h}</span></span>
                {pred.hoursToThreshold !== null && (
                  <span className="text-destructive font-semibold">
                    ⚠ Critical in ~{pred.hoursToThreshold.toFixed(1)}h
                  </span>
                )}
              </div>

              {/* Sepsis flags */}
              {p.sepsisFlags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  <AlertTriangle className="w-3 h-3 text-destructive flex-shrink-0 mt-0.5" />
                  {p.sepsisFlags.map((f, i) => (
                    <span key={i} className="text-[10px] font-mono text-destructive bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 rounded">{f}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Footer */}
        <div className="text-center text-xs font-mono text-muted-foreground border-t border-border pt-4 mt-6">
          <p>Generated by SepsisGuard v3.0 · {reportTime}</p>
          <p className="mt-1">This report is auto-generated for clinical reference only. Always verify with patient records.</p>
        </div>
      </div>
    </div>
  );
}
