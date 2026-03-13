import { useState, useEffect } from 'react';
import { loginWithDB, registerStaff } from '@/hooks/useAuth';
import { User, UserRole } from '@/lib/sepsisEngine';
import { Activity, Shield, Cpu, LockKeyhole, UserPlus } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const roles = [
  { role: 'receptionist' as const, label: 'Receptionist', icon: Shield, desc: 'Admit & manage patients', prefix: 'r' },
  { role: 'physician' as const, label: 'Physician', icon: Activity, desc: 'Monitor & diagnose', prefix: 'd' },
  { role: 'machinehub' as const, label: 'Machine Hub', icon: Cpu, desc: 'Update vitals & scenarios', prefix: 'p' },
];

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <span className="font-mono text-sm text-muted-foreground tracking-widest">
      {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [staffId, setStaffId] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedRoleValue = selectedRole !== null ? roles[selectedRole].role : null;

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await loginWithDB(staffId, accessKey);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid credentials. Check Staff ID and Access Key.');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!staffId.trim() || !fullName.trim() || !accessKey.trim() || !selectedRoleValue) {
      setError('Please fill in all required fields and select a role.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await registerStaff({
        staffId: staffId.trim(),
        name: fullName.trim(),
        role: selectedRoleValue,
        accessKey: accessKey.trim(),
        email: email.trim() || undefined,
      });

      if (result.success) {
        setSuccess(`Registered successfully! You can now log in with Staff ID: ${staffId}`);
        setTimeout(() => {
          setMode('login');
          setSuccess('');
          setFullName('');
          setEmail('');
        }, 2000);
      } else {
        setError(result.error || 'Registration failed.');
      }
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      mode === 'login' ? handleLogin() : handleRegister();
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'hsl(222 28% 5%)' }}>
      {/* Hospital branding bar */}
      <div className="w-full max-w-md mb-6 text-center">
        <div className="inline-flex items-center gap-2 mb-1">
          <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: 'hsl(0 80% 58% / 0.18)', border: '1px solid hsl(0 80% 58% / 0.4)' }}>
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="hsl(0, 80%, 60%)">
              <rect x="9" y="2" width="6" height="20" rx="1"/>
              <rect x="2" y="9" width="20" height="6" rx="1"/>
            </svg>
          </div>
          <div className="text-left">
            <div className="text-xs font-mono text-muted-foreground tracking-[0.2em] uppercase">City General Hospital</div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-lg font-bold font-mono tracking-tight text-foreground">
                SEPSIS<span className="text-primary">GUARD</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">v2.0</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-2">
          <LiveClock />
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-xs text-muted-foreground font-mono">Clinical Monitoring System</span>
        </div>
      </div>

      <div className="w-full max-w-md clinical-card space-y-5">
        {/* Mode toggle tabs */}
        <div className="flex rounded-lg overflow-hidden border border-border">
          <button
            onClick={() => switchMode()}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <LockKeyhole className="w-3.5 h-3.5" /> LOGIN
          </button>
          <button
            onClick={() => switchMode()}
            className={`flex-1 py-2.5 text-xs font-mono font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> REGISTER
          </button>
        </div>

        {/* Role selector */}
        <div>
          <p className="text-[10px] font-mono text-muted-foreground mb-2 tracking-widest uppercase">Select Role</p>
          <div className="grid grid-cols-3 gap-2">
            {roles.map((r, i) => (
              <button
                key={r.role}
                onClick={() => {
                  setSelectedRole(i);
                  if (mode === 'login') setStaffId(r.prefix);
                  setError('');
                }}
                className={`p-4 rounded-lg border text-center transition-all ${
                  selectedRole === i
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-secondary/50 hover:border-muted-foreground hover:bg-secondary'
                }`}
              >
                <r.icon className={`w-6 h-6 mx-auto mb-1.5 ${selectedRole === i ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className={`text-xs font-semibold font-mono ${selectedRole === i ? 'text-primary' : 'text-foreground'}`}>{r.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1.5 font-mono tracking-widest uppercase">Full Name *</label>
              <input
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                className="w-full bg-secondary border border-border rounded-md px-3 py-3 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                placeholder="e.g. Dr. Jane Smith"
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1.5 font-mono tracking-widest uppercase">Staff ID *</label>
            <input
              value={staffId}
              onChange={(e) => { setStaffId(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              className="w-full bg-secondary border border-border rounded-md px-3 py-3 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
              placeholder={mode === 'register' ? 'Choose a unique Staff ID' : 'e.g. r0, d0, p0'}
            />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1.5 font-mono tracking-widest uppercase">Access Key *</label>
            <input
              type="password"
              value={accessKey}
              onChange={(e) => { setAccessKey(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              className="w-full bg-secondary border border-border rounded-md px-3 py-3 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
              placeholder={mode === 'register' ? 'Choose a secure access key' : 'Enter access key'}
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1.5 font-mono tracking-widest uppercase">Email (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                className="w-full bg-secondary border border-border rounded-md px-3 py-3 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                placeholder="staff@hospital.com"
              />
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/30">
            <span className="text-xs text-destructive font-mono">{error}</span>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-green-500/10 border border-green-500/30">
            <span className="text-xs text-green-400 font-mono">{success}</span>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={mode === 'login' ? handleLogin : handleRegister}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-md hover:opacity-90 active:scale-[0.99] transition-all text-sm font-mono tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mode === 'login' ? (
            <>
              <LockKeyhole className="w-4 h-4" />
              {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              {loading ? 'REGISTERING...' : 'REGISTER STAFF'}
            </>
          )}
        </button>

        <div className="border-t border-border pt-3">
          <p className="text-[10px] text-muted-foreground text-center font-mono space-y-0.5 leading-5">
            {mode === 'login' ? (
              <>Default: Staff ID prefix + "0" as access key<br />r0 = Receptionist · d0 = Physician · p0 = Machine Hub</>
            ) : (
              <>Fill in all fields marked * and select a role to register</>
            )}
          </p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-mono text-muted-foreground">HIPAA Compliant · Secure Access</span>
          </div>
        </div>
      </div>
    </div>
  );
}
