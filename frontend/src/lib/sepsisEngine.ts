export interface Vitals {
  hr: number;       // Heart Rate (bpm)
  sys: number;      // Systolic BP (mmHg)
  dia: number;      // Diastolic BP (mmHg)
  rr: number;       // Respiratory Rate (breaths/min)
  spo2: number;     // Oxygen Saturation (%)
  temp: number;     // Temperature (°C)
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
  admitTime: number; // timestamp
  vitals: Vitals;
  riskScore: number;
  riskLevel: 'stable' | 'warning' | 'danger' | 'critical';
  sepsisFlags: string[];
  survivalPrediction: string;
  trendHistory: { time: number; score: number }[];
  bed: string;
  status: 'admitted' | 'monitoring' | 'discharged';
  doctorName?: string;
  doctorPhoto?: string;
  doctorSpecialty?: string;
  doctor_id?: number;
  admitReason?: string;
}

export type UserRole = 'receptionist' | 'physician' | 'machinehub';

export interface User {
  role: UserRole;
  staffId: string;
  doctorId?: number;
}

const ROLE_CREDENTIALS: Record<UserRole, { prefix: string; key: string }> = {
  receptionist: { prefix: 'r', key: '0' },
  physician: { prefix: 'd', key: '0' },
  machinehub: { prefix: 'p', key: '0' },
};

export function authenticate(staffId: string, accessKey: string): User | null {
  for (const [role, cred] of Object.entries(ROLE_CREDENTIALS)) {
    if (staffId.startsWith(cred.prefix) && accessKey === cred.key) {
      return { role: role as UserRole, staffId };
    }
  }
  return null;
}

export function calculateRisk(vitals: Vitals): {
  score: number;
  level: 'stable' | 'warning' | 'danger' | 'critical';
  flags: string[];
} {
  let score = 0;
  const flags: string[] = [];

  // qSOFA components
  if (vitals.rr >= 22) { score += 2; flags.push('Tachypnea (RR≥22)'); }
  else if (vitals.rr >= 18) score += 1;

  if (vitals.sys <= 100) { score += 2; flags.push('Hypotension (SYS≤100)'); }
  else if (vitals.sys <= 110) score += 1;

  // Sepsis flag: high RR + low BP
  if (vitals.rr >= 22 && vitals.sys <= 100) {
    flags.push('⚠ SEPSIS FLAG: High RR + Low BP');
    score += 2;
  }

  // Heart rate
  if (vitals.hr >= 130) { score += 3; flags.push('Severe Tachycardia'); }
  else if (vitals.hr >= 110) { score += 2; flags.push('Tachycardia'); }
  else if (vitals.hr >= 90) score += 1;
  if (vitals.hr <= 40) { score += 3; flags.push('Severe Bradycardia'); }

  // SpO2
  if (vitals.spo2 <= 85) { score += 3; flags.push('Severe Hypoxemia'); }
  else if (vitals.spo2 <= 91) { score += 2; flags.push('Hypoxemia'); }
  else if (vitals.spo2 <= 95) score += 1;

  // Temperature
  if (vitals.temp >= 39.5) { score += 2; flags.push('High Fever'); }
  else if (vitals.temp >= 38.5) { score += 1; flags.push('Fever'); }
  if (vitals.temp <= 35) { score += 2; flags.push('Hypothermia'); }

  const level: 'stable' | 'warning' | 'danger' | 'critical' =
    score >= 8 ? 'critical' :
    score >= 5 ? 'danger' :
    score >= 3 ? 'warning' : 'stable';

  return { score, level, flags };
}

export function calculateSurvivalTime(score: number): string {
  if (score >= 10) return 'Critical (< 4 Hours)';
  if (score >= 8) return 'Urgent (< 8 Hours)';
  if (score >= 5) return 'At Risk (< 24 Hours)';
  if (score >= 3) return 'Monitor Closely';
  return 'Stable';
}

export function getDefaultVitals(): Vitals {
  return { hr: 75, sys: 120, dia: 80, rr: 16, spo2: 98, temp: 36.8 };
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
}

let nextBed = 1;
export function generateBedNumber(): string {
  return `ICU-${String(nextBed++).padStart(2, '0')}`;
}

export function generatePatientId(): string {
  const now = Date.now();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `P-${now}-${rand}`;
}

export interface Doctor {
  name: string;
  specialty: string;
  photo: string;
}

export const DOCTORS: Doctor[] = [
  { name: 'Dr. Arjun Raj', specialty: 'Intensivist', photo: '/dr-raj.png' },
  { name: 'Dr. Sarah Chen', specialty: 'Critical Care', photo: '/dr-chen.png' },
  { name: 'Dr. Marcus James', specialty: 'Emergency Med', photo: '/dr-james.png' },
];

export function pickDoctor(): Doctor {
  return DOCTORS[Math.floor(Math.random() * DOCTORS.length)];
}

/* ── AI-Prediction helpers ──────────────────────────────────── */

/**
 * Simple linear regression on trend history.
 * Returns slope (score change per hour) and R² confidence.
 */
export function linearRegression(history: { time: number; score: number }[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  if (history.length < 2) return { slope: 0, intercept: 0, r2: 0 };

  const n = history.length;
  const startTime = history[0].time;
  // Convert timestamps to hours
  const xs = history.map(h => (h.time - startTime) / 3_600_000);
  const ys = history.map(h => h.score);

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);
  const sumY2 = ys.reduce((a, y) => a + y * y, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: ys[n - 1], r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R²
  const meanY = sumY / n;
  const ssTot = ys.reduce((a, y) => a + (y - meanY) ** 2, 0);
  const ssRes = ys.reduce((a, y, i) => a + (y - (slope * xs[i] + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

export interface PredictionResult {
  predictedScore1h: number;
  predictedLevel1h: 'stable' | 'warning' | 'danger' | 'critical';
  predictedScore4h: number;
  predictedLevel4h: 'stable' | 'warning' | 'danger' | 'critical';
  hoursToThreshold: number | null; // hours until score >= 8 (critical), null = stable/decreasing
  trend: 'improving' | 'stable' | 'worsening';
  confidence: number; // 0–100
}

function scoreToLevel(score: number): 'stable' | 'warning' | 'danger' | 'critical' {
  if (score >= 8) return 'critical';
  if (score >= 5) return 'danger';
  if (score >= 3) return 'warning';
  return 'stable';
}

/**
 * Predict future deterioration using trend analysis.
 */
export function predictDeterioration(
  trendHistory: { time: number; score: number }[],
  currentScore: number
): PredictionResult {
  if (trendHistory.length < 3) {
    return {
      predictedScore1h: currentScore,
      predictedLevel1h: scoreToLevel(currentScore),
      predictedScore4h: currentScore,
      predictedLevel4h: scoreToLevel(currentScore),
      hoursToThreshold: null,
      trend: 'stable',
      confidence: 0,
    };
  }

  const { slope, r2 } = linearRegression(trendHistory);
  const lastTime = trendHistory[trendHistory.length - 1].time;
  const startTime = trendHistory[0].time;
  const currentHours = (lastTime - startTime) / 3_600_000;

  const pred1h = Math.max(0, Math.min(15, currentScore + slope * 1));
  const pred4h = Math.max(0, Math.min(15, currentScore + slope * 4));

  let hoursToThreshold: number | null = null;
  if (slope > 0 && currentScore < 8) {
    hoursToThreshold = Math.max(0, (8 - currentScore) / slope);
    if (hoursToThreshold > 24) hoursToThreshold = null;
  }

  const trend: 'improving' | 'stable' | 'worsening' =
    slope > 0.3 ? 'worsening' : slope < -0.3 ? 'improving' : 'stable';

  return {
    predictedScore1h: Math.round(pred1h * 10) / 10,
    predictedLevel1h: scoreToLevel(Math.round(pred1h)),
    predictedScore4h: Math.round(pred4h * 10) / 10,
    predictedLevel4h: scoreToLevel(Math.round(pred4h)),
    hoursToThreshold,
    trend,
    confidence: Math.round(Math.max(0, r2) * 100),
  };
}
