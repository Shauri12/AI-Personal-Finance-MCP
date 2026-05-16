import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import VoiceAssistant from './VoiceAssistant';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex bg-darker text-white min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto max-h-screen p-8 bg-gradient-to-br from-darker to-dark">
        <div className="max-w-7xl mx-auto animate-in">
          <Outlet />
        </div>
      </main>
      <VoiceAssistant />
    </div>
  );
};

export default Layout;
