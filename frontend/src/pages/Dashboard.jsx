import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
  MessageSquare,
  ArrowUpRight,
  Target,
  Activity,
  PieChart as PieChartIcon,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import api from '../api/client';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [goals, setGoals] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, healthRes, goalsRes, invRes] = await Promise.all([
          api.get('/api/analytics/dashboard'),
          api.get('/api/analytics/health-score'),
          api.get('/api/finance/goals'),
          api.get('/api/finance/investments')
        ]);
        setData(dashRes.data);
        setHealthScore(healthRes.data);
        setGoals(goalsRes.data);
        setInvestments(invRes.data);
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
  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  // format investments for pie chart
  const investmentData = investments.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.investment_type);
    if (existing) existing.value += curr.current_value;
    else acc.push({ name: curr.investment_type, value: curr.current_value });
    return acc;
  }, []);

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
                className={`h-full shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000 ${healthScore?.overall_score > 70 ? 'bg-emerald-500' : healthScore?.overall_score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                style={{ width: `${healthScore?.overall_score || data?.financial_health_score || 0}%` }}
              ></div>
            </div>
            <span className={`text-lg font-bold ${healthScore?.overall_score > 70 ? 'text-emerald-500' : healthScore?.overall_score > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
              {healthScore?.overall_score || data?.financial_health_score || 0}
            </span>
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
        {/* Main Chart - Cashflow Trend */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <ArrowUpRight size={18} className="text-primary" />
            Cashflow & Savings Trend
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
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInc)" name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" name="Expenses" />
                <Area type="monotone" dataKey="savings" stroke="#3b82f6" strokeWidth={2} fillOpacity={0} name="Savings" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights & Health */}
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 border-primary/20 flex-1">
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
          </div>
          
          {/* Detailed Health Score */}
          {healthScore && (
            <div className="glass-card p-6 border-emerald-500/20">
              <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                Health Metrics
              </h3>
              <div className="space-y-3">
                <MetricBar label="Savings Ratio" value={healthScore.savings_ratio} max={50} suffix="%" />
                <MetricBar label="Debt Ratio" value={healthScore.debt_ratio} max={50} suffix="%" reverse />
                <MetricBar label="Emergency Fund" value={healthScore.emergency_reserve} max={6} suffix=" mo" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Spending Breakdown */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <PieChartIcon size={18} className="text-violet-500" />
            Spending Breakdown
          </h3>
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

        {/* Investment Portfolio Tracker */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" />
            Portfolio Allocation
          </h3>
          <div className="h-[250px] flex items-center justify-center">
            {investmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={investmentData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {investmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    formatter={(value) => `₹${value.toLocaleString()}`}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-500 text-sm flex flex-col items-center">
                <ShieldAlert size={32} className="mb-2 opacity-50" />
                No investments found
              </div>
            )}
          </div>
        </div>

        {/* Goal Planning UI */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target size={18} className="text-amber-500" />
              Financial Goals
            </h3>
            <button className="text-xs text-primary font-bold uppercase tracking-wider hover:underline">Add Goal</button>
          </div>
          <div className="space-y-5 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
            {goals.length > 0 ? goals.map(goal => {
              const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
              return (
                <div key={goal.id} className="group">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium group-hover:text-primary transition-colors">{goal.name}</span>
                    <span className="text-gray-400">₹{goal.current_amount.toLocaleString()} / ₹{goal.target_amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
                    <span>{goal.category}</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                </div>
              );
            }) : (
              <div className="text-gray-500 text-sm flex flex-col items-center justify-center h-full pt-8">
                <CheckCircle2 size={32} className="mb-2 opacity-50" />
                No active goals
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Savings Trend & Recent Trans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Savings Trend */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-6">Savings Trends Visualization</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthly_trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
                <Bar dataKey="savings" radius={[4, 4, 0, 0]}>
                  {(data?.monthly_trends || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.savings >= 0 ? '#10b981' : '#ef4444'} />
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
              <div key={txn.id} className="flex justify-between items-center group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors">
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

const MetricBar = ({ label, value, max, suffix = '', reverse = false }) => {
  const percent = Math.min((value / max) * 100, 100);
  let color = 'bg-primary';
  if (reverse) {
    color = percent > 80 ? 'bg-red-500' : percent > 40 ? 'bg-yellow-500' : 'bg-emerald-500';
  } else {
    color = percent > 80 ? 'bg-emerald-500' : percent > 40 ? 'bg-yellow-500' : 'bg-red-500';
  }

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-semibold text-white">{value.toFixed(1)}{suffix}</span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
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
    <div className="glass-card p-6 group hover:border-white/20 transition-all cursor-default relative overflow-hidden">
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-20 ${colorMap[color].split(' ')[1]}`}></div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 shadow-lg ${colorMap[color] || 'bg-gray-500/10 text-gray-500'}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter shadow-md ${negative ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            {trend}
          </span>
        )}
      </div>
      <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 relative z-10">{title}</h4>
      <p className="text-2xl font-black text-white relative z-10">{value}</p>
    </div>
  );
};

export default Dashboard;
