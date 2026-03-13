import { useState } from 'react';
import { User } from '@/lib/sepsisEngine';
import { usePatients } from '@/hooks/usePatients';
import LoginScreen from '@/components/LoginScreen';
import ReceptionDashboard from '@/components/ReceptionDashboard';
import DoctorDashboard from '@/components/DoctorDashboard';
import MachineHub from '@/components/MachineHub';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);

  if (!user) return <LoginScreen onLogin={setUser} />;

  switch (user.role) {
    case 'receptionist':
      return <ReceptionDashboard onLogout={() => setUser(null)} />;
    case 'physician':
      return <DoctorDashboard user={user} onLogout={() => setUser(null)} />;
    case 'machinehub':
      return <MachineHub onLogout={() => setUser(null)} />;
    default:
      return null;
  }
};

export default Index;
