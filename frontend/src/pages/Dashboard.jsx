import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PiggyBank, 
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
import AnomalyAlerts from '../components/AnomalyAlerts';

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
      <p className="text-gray-400 animate-pulse">Loading dashboard...</p>
    </div>
  );

  if (error) return <div className="text-red-400 p-6 glass-card">{error}</div>;

  const COLORS = ['#4f8ff7', '#7c6bea', '#34c77b', '#f0b429', '#e74c3c', '#5b6abf'];
  const PIE_COLORS = ['#4f8ff7', '#34c77b', '#f0b429', '#7c6bea', '#e74c3c'];

  // format investments for pie chart
  const investmentData = investments.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.investment_type);
    if (existing) existing.value += curr.current_value;
    else acc.push({ name: curr.investment_type, value: curr.current_value });
    return acc;
  }, []);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-0.5">Here's your financial summary</p>
        </div>
        <div className="flex items-center gap-2.5 bg-[#16181e] px-3.5 py-2 rounded-lg border border-[#22252d]">
          <span className="text-xs text-gray-400">Health</span>
          <div className="w-20 h-1.5 bg-[#22252d] rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ${healthScore?.overall_score > 70 ? 'bg-emerald-500' : healthScore?.overall_score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
              style={{ width: `${healthScore?.overall_score || data?.financial_health_score || 0}%` }}
            ></div>
          </div>
          <span className={`text-sm font-semibold ${healthScore?.overall_score > 70 ? 'text-emerald-400' : healthScore?.overall_score > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {healthScore?.overall_score || data?.financial_health_score || 0}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          color="green"
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
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5 text-gray-200">
            <ArrowUpRight size={15} className="text-[#4f8ff7]" />
            Cashflow Trend
          </h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthly_trends || []}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34c77b" stopOpacity={0.08}/>
                    <stop offset="95%" stopColor="#34c77b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e74c3c" stopOpacity={0.08}/>
                    <stop offset="95%" stopColor="#e74c3c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#16181e', border: '1px solid #22252d', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="income" stroke="#34c77b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorInc)" name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="#e74c3c" strokeWidth={1.5} fillOpacity={1} fill="url(#colorExp)" name="Expenses" />
                <Area type="monotone" dataKey="savings" stroke="#4f8ff7" strokeWidth={1.5} fillOpacity={0} name="Savings" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insights + Health */}
        <div className="flex flex-col gap-4">
          <div className="glass-card p-5 flex-1">
            <h3 className="text-sm font-semibold mb-4 text-gray-200">Insights</h3>
            <div className="space-y-3">
              {(data?.ai_insights || []).map((insight, i) => (
                <div key={i} className="flex gap-2.5 p-2.5 rounded-lg bg-[#111318] border border-[#22252d]">
                  <span className="text-base">{insight.split(' ')[0]}</span>
                  <p className="text-xs text-gray-400 leading-relaxed">{insight.split(' ').slice(1).join(' ')}</p>
                </div>
              ))}
            </div>
          </div>
          
          {healthScore && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-gray-200">
                <Activity size={14} className="text-emerald-400" />
                Health Breakdown
              </h3>
              <div className="space-y-2.5">
                <MetricBar label="Savings Ratio" value={healthScore.savings_ratio} max={50} suffix="%" />
                <MetricBar label="Debt Ratio" value={healthScore.debt_ratio} max={50} suffix="%" reverse />
                <MetricBar label="Emergency Fund" value={healthScore.emergency_reserve} max={6} suffix=" mo" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Breakdown */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5 text-gray-200">
            <PieChartIcon size={14} className="text-[#7c6bea]" />
            Spending by Category
          </h3>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.spending_by_category || []} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="category" type="category" stroke="#64748b" fontSize={10} width={80} tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#16181e', border: '1px solid #22252d', borderRadius: '8px' }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={14}>
                  {(data?.spending_by_category || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portfolio pie */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5 text-gray-200">
            <TrendingUp size={14} className="text-[#4f8ff7]" />
            Portfolio Split
          </h3>
          <div className="h-[230px] flex items-center justify-center">
            {investmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={investmentData}
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {investmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#16181e', border: '1px solid #22252d', borderRadius: '8px' }}
                    formatter={(value) => `₹${value.toLocaleString()}`}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-500 text-sm text-center">
                <ShieldAlert size={28} className="mx-auto mb-2 opacity-40" />
                No investments yet
              </div>
            )}
          </div>
        </div>

        {/* Goals */}
        <div className="glass-card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-200">
              <Target size={14} className="text-amber-400" />
              Goals
            </h3>
            <button className="text-xs text-[#4f8ff7] hover:underline">+ Add</button>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[230px] pr-1">
            {goals.length > 0 ? goals.map(goal => {
              const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
              return (
                <div key={goal.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-200">{goal.name}</span>
                    <span className="text-gray-500">₹{goal.current_amount.toLocaleString()} / ₹{goal.target_amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#22252d] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${progress >= 100 ? 'bg-emerald-500' : 'bg-[#4f8ff7]'}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                    <span>{goal.category}</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                </div>
              );
            }) : (
              <div className="text-gray-500 text-sm flex flex-col items-center justify-center h-full pt-6">
                <CheckCircle2 size={28} className="mb-2 opacity-40" />
                No goals set
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Anomaly + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-gray-200">
            <ShieldAlert size={14} className="text-amber-400" />
            Anomaly Alerts
          </h3>
          <AnomalyAlerts />
        </div>
        <div className="lg:col-span-2">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Savings Chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4 text-gray-200">Savings Trend</h3>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthly_trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#16181e', border: '1px solid #22252d', borderRadius: '8px' }}
                />
                <Bar dataKey="savings" radius={[3, 3, 0, 0]}>
                  {(data?.monthly_trends || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.savings >= 0 ? '#34c77b' : '#e74c3c'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="glass-card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-200">Recent Activity</h3>
            <button className="text-xs text-[#4f8ff7] hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {(data?.recent_transactions || []).slice(0, 5).map((txn) => (
              <div key={txn.id} className="flex justify-between items-center p-2 -mx-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${txn.transaction_type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {txn.transaction_type === 'income' ? '↓' : '↑'}
                  </div>
                  <div>
                    <p className="text-sm text-gray-200">{txn.merchant || txn.category}</p>
                    <p className="text-[10px] text-gray-600">{new Date(txn.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {txn.payment_method.toUpperCase()}</p>
                  </div>
                </div>
                <p className={`text-sm font-medium ${txn.transaction_type === 'income' ? 'text-emerald-400' : 'text-gray-200'}`}>
                  {txn.transaction_type === 'income' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
};

const MetricBar = ({ label, value, max, suffix = '', reverse = false }) => {
  const percent = Math.min((value / max) * 100, 100);
  let color = 'bg-[#4f8ff7]';
  if (reverse) {
    color = percent > 80 ? 'bg-red-500' : percent > 40 ? 'bg-yellow-500' : 'bg-emerald-500';
  } else {
    color = percent > 80 ? 'bg-emerald-500' : percent > 40 ? 'bg-yellow-500' : 'bg-red-500';
  }

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-200">{value.toFixed(1)}{suffix}</span>
      </div>
      <div className="w-full h-1.5 bg-[#22252d] rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, icon: Icon, trend, color, negative }) => {
  const colorMap = {
    blue: 'bg-[#4f8ff7]/10 text-[#4f8ff7]',
    green: 'bg-emerald-500/10 text-emerald-400',
    red: 'bg-red-500/10 text-red-400',
    purple: 'bg-[#7c6bea]/10 text-[#7c6bea]'
  };

  return (
    <div className="glass-card p-5">
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2 rounded-lg ${colorMap[color] || 'bg-gray-500/10 text-gray-500'}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${negative ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-0.5">{title}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
};

export default Dashboard;
