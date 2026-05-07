import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  IndianRupee, 
  TrendingUp, 
  Target, 
  MessageSquare, 
  Settings, 
  LogOut,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { logout, user } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: IndianRupee },
    { name: 'Investments', path: '/investments', icon: TrendingUp },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'AI Chat', path: '/chat', icon: MessageSquare },
    { name: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
  ];

  return (
    <div className="w-64 min-h-screen border-r border-white/10 bg-darker/50 backdrop-blur-xl flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent leading-tight">
              FinanceOS
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-primary font-bold">MCP Powered</span>
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'}
              `}
            >
              <item.icon size={20} className="group-hover:scale-110 transition-transform" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        <div className="glass-card p-4 flex items-center gap-3 border-white/5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate text-white">{user?.full_name || 'Guest'}</p>
            <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>

        <button 
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 text-gray-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
