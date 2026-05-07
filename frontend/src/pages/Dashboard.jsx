import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  MessageSquare,
  ArrowUpRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import api from '../api/client';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/api/analytics/dashboard');
        setData(response.data);
      } catch (err) {
        console.error('Failed to fetch dashboard', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-primary animate-pulse font-bold text-xl">Loading Finance Engine...</div>
    </div>
  );

  if (error) return <div className="text-red-400 p-8 glass-card">{error}</div>;

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold">Financial Overview</h2>
          <p className="text-gray-400 mt-1">Welcome back, here's your financial memory summary.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <span className="text-sm font-medium text-gray-400">Health Score</span>
          <div className="flex items-center gap-3">
            <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000" 
                style={{ width: `${data?.financial_health_score || 0}%` }}
              ></div>
            </div>
            <span className="text-lg font-bold text-primary">{data?.financial_health_score || 0}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="Net Worth" 
          value={`₹${(data?.net_worth || 0).toLocaleString()}`} 
          icon={Wallet} 
          trend="+5.2%" 
          color="blue"
        />
        <SummaryCard 
          title="Monthly Income" 
          value={`₹${(data?.total_income || 0).toLocaleString()}`} 
          icon={TrendingUp} 
          color="emerald"
        />
        <SummaryCard 
          title="Monthly Expenses" 
          value={`₹${(data?.total_expenses || 0).toLocaleString()}`} 
          icon={TrendingDown} 
          trend="+2.1%" 
          color="red"
          negative
        />
        <SummaryCard 
          title="Investments" 
          value={`₹${(data?.total_investments || 0).toLocaleString()}`} 
          icon={PiggyBank} 
          trend={`+₹${(data?.investment_returns || 0).toLocaleString()}`} 
          color="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <ArrowUpRight size={18} className="text-primary" />
            Cashflow Trend
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthly_trends || []}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInc)" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights */}
        <div className="glass-card p-6 border-primary/20">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <MessageSquare size={18} />
            </div>
            <h3 className="text-lg font-semibold">AI Assistant Insights</h3>
          </div>
          <div className="space-y-4">
            {(data?.ai_insights || []).map((insight, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-primary/20 transition-colors group">
                <span className="text-lg group-hover:scale-125 transition-transform">{insight.split(' ')[0]}</span>
                <p className="text-xs text-gray-300 leading-relaxed">{insight.split(' ').slice(1).join(' ')}</p>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-blue-600 transition-all shadow-lg shadow-primary/20">
            Ask AI Assistant
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending breakdown */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-6">Spending Breakdown</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.spending_by_category || []} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={10} width={80} tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={16}>
                  {(data?.spending_by_category || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <button className="text-xs text-primary font-bold uppercase tracking-wider hover:underline">View History</button>
          </div>
          <div className="space-y-4">
            {(data?.recent_transactions || []).slice(0, 5).map((txn) => (
              <div key={txn.id} className="flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${txn.transaction_type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {txn.transaction_type === 'income' ? 'IN' : 'OUT'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">{txn.merchant || txn.category}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-tight">{new Date(txn.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {txn.payment_method.toUpperCase()}</p>
                  </div>
                </div>
                <p className={`text-sm font-bold ${txn.transaction_type === 'income' ? 'text-emerald-500' : 'text-white'}`}>
                  {txn.transaction_type === 'income' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, icon: Icon, trend, color, negative }) => {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    red: 'bg-red-500/10 text-red-500',
    violet: 'bg-violet-500/10 text-violet-500'
  };

  return (
    <div className="glass-card p-6 group hover:border-white/20 transition-all cursor-default">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${colorMap[color] || 'bg-gray-500/10 text-gray-500'}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter ${negative ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            {trend}
          </span>
        )}
      </div>
      <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</h4>
      <p className="text-2xl font-black text-white">{value}</p>
    </div>
  );
};

export default Dashboard;
