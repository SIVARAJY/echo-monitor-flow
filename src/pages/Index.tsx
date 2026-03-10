import { useState } from 'react';
import { User } from '@/lib/sepsisEngine';
import { usePatients } from '@/hooks/usePatients';
import LoginScreen from '@/components/LoginScreen';
import ReceptionDashboard from '@/components/ReceptionDashboard';
import DoctorDashboard from '@/components/DoctorDashboard';
import MachineHub from '@/components/MachineHub';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const { patients, handleAdmit, handleDischarge, handleUpdateVitals } = usePatients();

  if (!user) return <LoginScreen onLogin={setUser} />;

  switch (user.role) {
    case 'receptionist':
      return <ReceptionDashboard patients={patients} onAdmit={handleAdmit} onDischarge={handleDischarge} onLogout={() => setUser(null)} />;
    case 'physician':
      return <DoctorDashboard patients={patients} onLogout={() => setUser(null)} />;
    case 'machinehub':
      return <MachineHub patients={patients} onUpdateVitals={handleUpdateVitals} onLogout={() => setUser(null)} />;
    default:
      return null;
  }
};

export default Index;
