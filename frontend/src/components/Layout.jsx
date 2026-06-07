import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import VoiceAssistant from './VoiceAssistant';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0d11] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#4f8ff7]/30 border-t-[#4f8ff7] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex bg-[#111318] text-white min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto max-h-screen p-6">
        <div className="max-w-7xl mx-auto animate-in">
          <Outlet />
        </div>
      </main>
      <VoiceAssistant />
    </div>
  );
};

export default Layout;
