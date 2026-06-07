import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('demo@finmcp.ai');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0d11] flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-in">
        {/* branding */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#4f8ff7] flex items-center justify-center">
              <IndianRupee className="text-white" size={22} />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Ctrl + Alt + Profit
            </h1>
          </div>
        </div>

        <div className="bg-[#16181e] p-7 rounded-xl border border-[#22252d]">
          <h2 className="text-xl font-semibold mb-1 text-white">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-6">Sign in to continue</p>

          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm text-gray-400">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#111318] border border-[#2a2d37] rounded-lg py-2.5 pl-10 pr-3 text-sm focus:border-[#4f8ff7] outline-none transition-colors"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-gray-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#111318] border border-[#2a2d37] rounded-lg py-2.5 pl-10 pr-3 text-sm focus:border-[#4f8ff7] outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#4f8ff7] hover:bg-[#3a7ce6] text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Don't have an account? <span className="text-[#4f8ff7] cursor-pointer hover:underline">Register</span>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-gray-600 text-xs">
          Built as a college project · Secure authentication
        </p>
      </div>
    </div>
  );
};

export default Login;
