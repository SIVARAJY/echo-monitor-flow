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
    <span className="text-sm text-muted-foreground tracking-widest font-medium">
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {/* Hospital branding bar */}
      <div className="w-full max-w-md mb-8 text-center">
        <div className="inline-flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20 shadow-sm">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-primary">
              <rect x="9" y="2" width="6" height="20" rx="1"/>
              <rect x="2" y="9" width="20" height="6" rx="1"/>
            </svg>
          </div>
          <div className="text-left">
            <div className="text-xs font-semibold text-muted-foreground tracking-[0.15em] uppercase">City General Hospital</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Activity className="w-5 h-5 text-primary" />
              <span className="text-2xl font-bold tracking-tight text-foreground">
                SEPSIS<span className="text-primary">GUARD</span>
              </span>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-1">v2.0</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mt-3">
          <LiveClock />
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="text-xs text-muted-foreground font-medium">Clinical Monitoring System</span>
        </div>
      </div>

      <div className="w-full max-w-md bg-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border p-6 space-y-6">
        {/* Mode toggle tabs */}
        <div className="flex rounded-lg overflow-hidden border border-border bg-[#F3F4F6] p-1 gap-1">
          <button
            onClick={() => setMode('login')}
            aria-selected={mode === 'login'}
            className={`flex-1 py-2.5 text-xs font-semibold tracking-wide duration-200 transition-all flex items-center justify-center gap-2 rounded-md ${
              mode === 'login'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LockKeyhole className="w-4 h-4" /> LOGIN
          </button>
          <button
            onClick={() => setMode('register')}
            aria-selected={mode === 'register'}
            className={`flex-1 py-2.5 text-xs font-semibold tracking-wide duration-200 transition-all flex items-center justify-center gap-2 rounded-md ${
              mode === 'register'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="w-4 h-4" /> REGISTER
          </button>
        </div>

        {/* Role selector */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground mb-3 tracking-wider uppercase">Select Role</p>
          <div className="grid grid-cols-3 gap-3">
            {roles.map((r, i) => (
              <button
                key={r.role}
                onClick={() => {
                  setSelectedRole(i);
                  if (mode === 'login') setStaffId(r.prefix);
                  setError('');
                }}
                aria-selected={selectedRole === i}
                className={`p-4 rounded-xl border text-center transition-all duration-200 ${
                  selectedRole === i
                    ? 'border-[#2563EB] bg-[#EFF6FF] shadow-sm'
                    : 'border-border bg-card hover:border-primary/30 hover:bg-secondary/50'
                }`}
              >
                <r.icon className={`w-6 h-6 mx-auto mb-2 ${selectedRole === i ? 'text-[#2563EB]' : 'text-muted-foreground'}`} />
                <div className={`text-[13px] font-bold ${selectedRole === i ? 'text-[#2563EB]' : 'text-foreground'}`}>{r.label}</div>
                <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5 font-semibold tracking-wider uppercase">Full Name *</label>
              <input
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 transition-shadow"
                placeholder="e.g. Dr. Jane Smith"
              />
            </div>
          )}
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1.5 font-semibold tracking-wider uppercase">Staff ID *</label>
            <input
              value={staffId}
              onChange={(e) => { setStaffId(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 transition-shadow"
              placeholder={mode === 'register' ? 'Choose a unique Staff ID' : 'e.g. r0, d0, p0'}
            />
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1.5 font-semibold tracking-wider uppercase">Access Key *</label>
            <input
              type="password"
              value={accessKey}
              onChange={(e) => { setAccessKey(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 transition-shadow"
              placeholder={mode === 'register' ? 'Choose a secure access key' : 'Enter access key'}
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5 font-semibold tracking-wider uppercase">Email (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 transition-shadow"
                placeholder="staff@hospital.com"
              />
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <span className="text-sm text-destructive font-medium">{error}</span>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-vital-green/10 border border-vital-green/20">
            <span className="text-sm text-vital-green font-medium">{success}</span>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={mode === 'login' ? handleLogin : handleRegister}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3.5 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-sm tracking-wide disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
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

        <div className="border-t border-border pt-5">
          <p className="text-[11px] text-muted-foreground text-center space-y-1 leading-relaxed">
            {mode === 'login' ? (
              <>
                <strong>Default Accounts:</strong><br />
                Receptionist: <code>r0 / 0</code> | Machine Hub: <code>p0 / 0</code>
              </>
            ) : (
              <>Fill in all fields marked * and select a role to register</>
            )}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
            <span className="text-[11px] font-medium text-muted-foreground">HIPAA Compliant · Secure Access</span>
          </div>
        </div>
      </div>
    </div>
  );
}
