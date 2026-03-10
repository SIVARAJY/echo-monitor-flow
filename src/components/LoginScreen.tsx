import { useState } from 'react';
import { authenticate, User } from '@/lib/sepsisEngine';
import { Activity, Shield, Cpu } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const roles = [
  { role: 'receptionist' as const, label: 'Receptionist', icon: Shield, desc: 'Admit & manage patients', prefix: 'r' },
  { role: 'physician' as const, label: 'Physician', icon: Activity, desc: 'Monitor & diagnose', prefix: 'd' },
  { role: 'machinehub' as const, label: 'Machine Hub', icon: Cpu, desc: 'Update vitals & scenarios', prefix: 'p' },
];

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [staffId, setStaffId] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    const user = authenticate(staffId, accessKey);
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid credentials. Check Staff ID prefix and Access Key.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Activity className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
              SEPSIS<span className="text-primary">GUARD</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">Clinical Monitoring System v2.0</p>
        </div>

        <div className="clinical-card space-y-5">
          <div className="grid grid-cols-3 gap-2">
            {roles.map((r, i) => (
              <button
                key={r.role}
                onClick={() => {
                  setSelectedRole(i);
                  setStaffId(r.prefix);
                  setError('');
                }}
                className={`p-3 rounded-lg border text-center transition-all ${
                  selectedRole === i
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-secondary/50 hover:border-muted-foreground'
                }`}
              >
                <r.icon className={`w-5 h-5 mx-auto mb-1 ${selectedRole === i ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className={`text-xs font-medium ${selectedRole === i ? 'text-primary' : 'text-foreground'}`}>{r.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</div>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1 font-mono">STAFF ID</label>
              <input
                value={staffId}
                onChange={(e) => { setStaffId(e.target.value); setError(''); }}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. r0, d0, p0"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1 font-mono">ACCESS KEY</label>
              <input
                type="password"
                value={accessKey}
                onChange={(e) => { setAccessKey(e.target.value); setError(''); }}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Enter access key"
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive font-mono">{error}</p>}

          <button
            onClick={handleLogin}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            Authenticate
          </button>

          <div className="text-[10px] text-muted-foreground text-center font-mono space-y-0.5">
            <p>Default credentials: Staff ID prefix + "0" as access key</p>
            <p>r0 = Receptionist · d0 = Physician · p0 = Machine Hub</p>
          </div>
        </div>
      </div>
    </div>
  );
}
