import { Patient } from '@/lib/sepsisEngine';
import { Brain, CheckCircle2, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Recommendation {
  id: string;
  type: 'intervention' | 'diagnostic' | 'monitoring';
  text: string;
  priority: 'high' | 'medium' | 'low';
}

interface ClinicalDecisionSupportProps {
  patient: Patient;
}

export default function ClinicalDecisionSupport({ patient }: ClinicalDecisionSupportProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    setIsThinking(true);
    const timer = setTimeout(() => {
      const recs: Recommendation[] = [];
      const v = patient.vitals;
      const score = patient.riskScore;

      // ── Sepsis Bundle Interventions ──────────────────────────
      if (score >= 5) {
        recs.push({
          id: 'bundle-1',
          type: 'intervention',
          text: 'Initiate Sepsis Bundle: Administer IV Fluids (30mL/kg crystalloid).',
          priority: 'high',
        });
        recs.push({
          id: 'bundle-2',
          type: 'intervention',
          text: 'Administer broad-spectrum antibiotics within 60 mins.',
          priority: 'high',
        });
        recs.push({
          id: 'diag-1',
          type: 'diagnostic',
          text: 'Order STAT Blood Cultures (2 sets) before antibiotics.',
          priority: 'high',
        });
        recs.push({
          id: 'diag-2',
          type: 'diagnostic',
          text: 'Monitor serum lactate levels; re-draw in 2-4h if > 2.0.',
          priority: 'medium',
        });
      }

      // ── Hemodynamic Support ──────────────────────────────────
      if (v.sys < 90) {
        recs.push({
          id: 'hemo-1',
          type: 'monitoring',
          text: 'Target MAP > 65 mmHg. Consider Norepinephrine if fluid unresponsive.',
          priority: 'high',
        });
      }

      // ── Respiratory Support ──────────────────────────────────
      if (v.spo2 < 92) {
        recs.push({
          id: 'resp-1',
          type: 'intervention',
          text: 'Incentive spirometry and optimize oxygen flow; aim for SpO2 94-98%.',
          priority: 'medium',
        });
      }

      // ── General / Low Risk ──────────────────────────────────
      if (score < 3) {
        recs.push({
          id: 'gen-1',
          type: 'monitoring',
          text: 'Continue routine qSOFA screening every 4 hours.',
          priority: 'low',
        });
        recs.push({
          id: 'gen-2',
          type: 'monitoring',
          text: 'Ensure accurate intake/output (I/O) recording.',
          priority: 'low',
        });
      } else if (score < 5) {
        recs.push({
          id: 'warn-1',
          type: 'monitoring',
          text: 'Increased vigilance: repeat vital checks every 30-60 mins.',
          priority: 'medium',
        });
      }

      setRecommendations(recs);
      setIsThinking(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [patient.riskScore, patient.vitals.sys, patient.vitals.spo2]);

  return (
    <div className="flex flex-col h-full bg-card/50 border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="bg-primary/5 border-b border-border/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className={`w-4 h-4 text-primary ${isThinking ? 'animate-pulse' : ''}`} />
          <span className="text-xs font-mono font-bold text-foreground tracking-widest uppercase">Clinical AI Advisor</span>
        </div>
        {isThinking && (
          <span className="text-[10px] font-mono text-primary animate-pulse">ANALYZING...</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {recommendations.length === 0 && !isThinking ? (
          <div className="text-center py-6 opacity-40">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-vital-green" />
            <p className="text-[11px] font-mono text-muted-foreground">No critical interventions required</p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`p-3 rounded-lg border flex gap-3 transition-all duration-300 ${
                rec.priority === 'high'
                  ? 'bg-destructive/5 border-destructive/20'
                  : rec.priority === 'medium'
                  ? 'bg-vital-yellow/5 border-vital-yellow/20'
                  : 'bg-secondary/30 border-border/40'
              }`}
            >
              {rec.priority === 'high' ? (
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="text-[11px] font-mono font-bold text-foreground mb-1 flex items-center justify-between uppercase">
                  <span>{rec.type}</span>
                  <span className={`px-1 rounded ${
                    rec.priority === 'high' ? 'text-destructive bg-destructive/10' :
                    rec.priority === 'medium' ? 'text-vital-yellow bg-vital-yellow/10' :
                    'text-muted-foreground bg-secondary'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
                <p className="text-[11px] text-foreground leading-relaxed">
                  {rec.text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-border/40 bg-secondary/20">
        <button className="w-full py-2 bg-secondary border border-border/60 hover:border-primary/40 rounded-md flex items-center justify-center gap-2 transition-all">
          <span className="text-[10px] font-mono font-bold text-muted-foreground tracking-wide">VIEW FULL PROTOCOL</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
