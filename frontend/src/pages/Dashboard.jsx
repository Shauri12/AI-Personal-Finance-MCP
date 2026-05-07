import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  ArrowUpRight, 
  AlertCircle 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import api from '../api/client';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/api/analytics/dashboard');
        setData(response.data);
      } catch (err) {
        console.error('Failed to fetch dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div>Loading...</div>;

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold">Financial Overview</h2>
          <p className="text-gray-400 mt-1">Welcome back, here's what's happening with your money.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <span className="text-sm font-medium text-gray-400">Health Score</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary" 
                style={{ width: `${data?.financial_health_score}%` }}
              ></div>
            </div>
            <span className="text-lg font-bold text-primary">{data?.financial_health_score}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="Net Worth" 
          value={`₹${data?.net_worth.toLocaleString()}`} 
          icon={Wallet} 
          trend="+5.2%" 
          color="primary"
        />
        <SummaryCard 
          title="Monthly Income" 
          value={`₹${data?.total_income.toLocaleString()}`} 
          icon={TrendingUp} 
          color="accent"
        />
        <SummaryCard 
          title="Monthly Expenses" 
          value={`₹${data?.total_expenses.toLocaleString()}`} 
          icon={TrendingDown} 
          trend="+2.1%" 
          color="red"
          negative
        />
        <SummaryCard 
          title="Investments" 
          value={`₹${data?.total_investments.toLocaleString()}`} 
          icon={PiggyBank} 
          trend={`+₹${data?.investment_returns.toLocaleString()}`} 
          color="secondary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-lg font-semibold mb-6">Cashflow Trend</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthly_trends}>
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
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorInc)" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" />
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
            <h3 className="text-lg font-semibold">AI Insights</h3>
          </div>
          <div className="space-y-4">
            {data?.ai_insights.map((insight, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-primary/20 transition-colors">
                <span className="text-lg">{insight.split(' ')[0]}</span>
                <p className="text-sm text-gray-300">{insight.split(' ').slice(1).join(' ')}</p>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 rounded-xl bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-all border border-primary/20">
            Ask AI Assistant
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending breakdown */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-6">Spending by Category</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.spending_by_category} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '8px' }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={20}>
                  {data?.spending_by_category.map((entry, index) => (
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
            <h3 className="text-lg font-semibold">Recent Transactions</h3>
            <button className="text-sm text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {data?.recent_transactions.slice(0, 5).map((txn) => (
              <div key={txn.id} className="flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${txn.transaction_type === 'income' ? 'bg-accent/10 text-accent' : 'bg-red-400/10 text-red-400'}`}>
                    {txn.transaction_type === 'income' ? '+' : '-'}
                  </div>
                  <div>
                    <p className="font-medium group-hover:text-primary transition-colors">{txn.merchant || txn.category}</p>
                    <p className="text-xs text-gray-500">{new Date(txn.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className={`font-bold ${txn.transaction_type === 'income' ? 'text-accent' : 'text-white'}`}>
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

const SummaryCard = ({ title, value, icon: Icon, trend, color, negative }) => (
  <div className="glass-card p-6 group hover:border-white/20 transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-500 group-hover:scale-110 transition-transform`}>
        <Icon size={24} />
      </div>
      {trend && (
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${negative ? 'bg-red-500/10 text-red-500' : 'bg-accent/10 text-accent'}`}>
          {trend}
        </span>
      )}
    </div>
    <h4 className="text-gray-400 text-sm font-medium mb-1">{title}</h4>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);

export default Dashboard;
