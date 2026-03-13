import { useState, useEffect, useCallback, useRef } from 'react';
import { Patient } from '@/lib/sepsisEngine';

export interface EscalationEvent {
  patientId: string;
  patientName: string;
  bed: string;
  triggeredAt: number;
  riskLevel: string;
  riskScore: number;
  acknowledged: boolean;
}

interface EscalationState {
  /** Patients currently at danger/critical and the time they entered that state */
  dangerTimers: Map<string, number>;
  /** Active CODE SEPSIS escalation events */
  escalations: EscalationEvent[];
  /** Whether the full-screen CODE SEPSIS alert is showing */
  codeActive: boolean;
}

const ESCALATION_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes in danger/critical

export function useEscalation(patients: Patient[]) {
  const [state, setState] = useState<EscalationState>({
    dangerTimers: new Map(),
    escalations: [],
    codeActive: false,
  });
  const notifiedRef = useRef<Set<string>>(new Set());

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Check patients for escalation every second
  useEffect(() => {
    const iv = setInterval(() => {
      setState(prev => {
        const activePatients = patients.filter(p => p.status !== 'discharged');
        const newTimers = new Map(prev.dangerTimers);
        const newEscalations = [...prev.escalations];
        let newCodeActive = prev.codeActive;

        for (const p of activePatients) {
          const isDangerOrCritical = p.riskLevel === 'danger' || p.riskLevel === 'critical';

          if (isDangerOrCritical) {
            // Start timer if not already tracking
            if (!newTimers.has(p.id)) {
              newTimers.set(p.id, Date.now());
            }

            // Check if threshold exceeded
            const startTime = newTimers.get(p.id)!;
            const elapsed = Date.now() - startTime;

            if (elapsed >= ESCALATION_THRESHOLD_MS && !notifiedRef.current.has(p.id)) {
              // Trigger escalation
              const event: EscalationEvent = {
                patientId: p.id,
                patientName: p.name,
                bed: p.bed,
                triggeredAt: Date.now(),
                riskLevel: p.riskLevel,
                riskScore: p.riskScore,
                acknowledged: false,
              };
              newEscalations.push(event);
              newCodeActive = true;
              notifiedRef.current.add(p.id);

              // Send browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('⚠️ CODE SEPSIS', {
                  body: `${p.name} (${p.bed}) — Risk Score: ${p.riskScore} — ${p.riskLevel.toUpperCase()}\nImmediate intervention required!`,
                  icon: '🏥',
                  tag: `escalation-${p.id}`,
                  requireInteraction: true,
                });
              }
            }
          } else {
            // Patient recovered — remove timer
            newTimers.delete(p.id);
            notifiedRef.current.delete(p.id);
          }
        }

        // Remove timers for discharged patients
        for (const id of newTimers.keys()) {
          if (!activePatients.find(p => p.id === id)) {
            newTimers.delete(id);
            notifiedRef.current.delete(id);
          }
        }

        return {
          dangerTimers: newTimers,
          escalations: newEscalations,
          codeActive: newCodeActive,
        };
      });
    }, 1000);

    return () => clearInterval(iv);
  }, [patients]);

  const acknowledgeAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      codeActive: false,
      escalations: prev.escalations.map(e => ({ ...e, acknowledged: true })),
    }));
  }, []);

  const acknowledgeOne = useCallback((patientId: string) => {
    setState(prev => {
      const updated = prev.escalations.map(e =>
        e.patientId === patientId ? { ...e, acknowledged: true } : e
      );
      const stillActive = updated.some(e => !e.acknowledged);
      return { ...prev, escalations: updated, codeActive: stillActive };
    });
  }, []);

  // Get elapsed danger time for a specific patient (for UI countdown)
  const getDangerDuration = useCallback((patientId: string): number | null => {
    const startTime = state.dangerTimers.get(patientId);
    if (!startTime) return null;
    return Date.now() - startTime;
  }, [state.dangerTimers]);

  return {
    escalations: state.escalations,
    codeActive: state.codeActive,
    acknowledgeAll,
    acknowledgeOne,
    getDangerDuration,
  };
}
