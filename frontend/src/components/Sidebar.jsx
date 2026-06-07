import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  IndianRupee, 
  TrendingUp, 
  Target, 
  MessageSquare, 
  LogOut,
  CreditCard,
  Brain,
  FileText
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
    { name: 'Predictions', path: '/predictions', icon: Brain },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
  ];

  return (
    <div className="w-60 min-h-screen border-r border-[#22252d] bg-[#0c0d11] flex flex-col">
      <div className="p-5">
        {/* Logo area */}
        <div className="flex items-center gap-2.5 mb-7">
          <div className="w-9 h-9 rounded-lg bg-[#4f8ff7] flex items-center justify-center">
            <IndianRupee className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white leading-tight">
              Ctrl + Alt + Profit
            </h1>
            <span className="text-[10px] text-gray-500">personal finance</span>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                ${isActive 
                  ? 'bg-[#4f8ff7]/10 text-[#4f8ff7] font-medium' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}
              `}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-5 space-y-3">
        {/* user card */}
        <div className="bg-[#16181e] p-3 rounded-lg flex items-center gap-2.5 border border-[#22252d]">
          <div className="w-8 h-8 rounded-full bg-[#4f8ff7] flex items-center justify-center text-white text-sm font-semibold">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate text-white">{user?.full_name || 'Guest'}</p>
            <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>

        <button 
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
