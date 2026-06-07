import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Brain, Target, Zap,
  ArrowDownRight, Activity
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend, Line, ComposedChart
} from 'recharts';
import api from '../api/client';

const Predictions = () => {
  const [predictions, setPredictions] = useState(null);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [predRes, budgetRes] = await Promise.all([
          api.get('/api/ai/predict?months=6'),
          api.get('/api/ai/budget/smart'),
        ]);
        setPredictions(predRes.data);
        setBudget(budgetRes.data);
      } catch (err) {
        console.error('Failed to fetch predictions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Brain size={32} className="text-[#4f8ff7] mx-auto mb-3 animate-pulse" />
        <p className="text-gray-400 text-sm animate-pulse">Running predictions...</p>
      </div>
    </div>
  );

  // combine data for chart
  const chartData = [
    ...(predictions?.historical || []).map(h => ({ ...h, type: 'historical' })),
    ...(predictions?.forecasts || []).map(f => ({
      month: f.month,
      income: f.predicted_income,
      expenses: f.predicted_expenses,
      savings: f.predicted_savings,
      type: 'forecast',
      confidence: f.confidence,
    })),
  ];

  const budgetAllocations = budget?.allocations
    ? Object.entries(budget.allocations)
        .filter(([, v]) => v.suggested > 0)
        .map(([cat, data]) => ({
          category: cat.charAt(0).toUpperCase() + cat.slice(1),
          suggested: Math.round(data.suggested || 0),
          spent: Math.round(data.spent || 0),
          remaining: Math.round(data.remaining || 0),
          utilization: Math.round(data.utilization || 0),
          type: data.type || 'other',
        }))
        .sort((a, b) => b.suggested - a.suggested)
    : [];

  const TYPE_COLORS = {
    essential: '#34c77b',
    'semi-essential': '#4f8ff7',
    discretionary: '#7c6bea',
    debt: '#e74c3c',
    other: '#6b7280',
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="text-[#4f8ff7]" size={24} />
          Predictions
        </h2>
        <p className="text-gray-500 text-sm mt-0.5">Expense forecasting & budget suggestions</p>
      </div>

      {/* Insights */}
      {predictions?.insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {predictions.insights.map((insight, i) => (
            <div
              key={i}
              className="glass-card p-3.5 flex items-start gap-2.5"
            >
              <span className="text-base">{insight.split(' ')[0]}</span>
              <p className="text-xs text-gray-400 leading-relaxed">{insight.split(' ').slice(1).join(' ')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main Chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5 text-gray-200">
          <Activity size={14} className="text-[#4f8ff7]" />
          Income, Expenses & Savings Forecast
        </h3>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="gradInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34c77b" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#34c77b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e74c3c" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#e74c3c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#16181e', border: '1px solid #22252d', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value, name) => [`₹${Math.round(value).toLocaleString()}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
              <Area type="monotone" dataKey="income" stroke="#34c77b" strokeWidth={1.5} fill="url(#gradInc)" name="Income" />
              <Area type="monotone" dataKey="expenses" stroke="#e74c3c" strokeWidth={1.5} fill="url(#gradExp)" name="Expenses" />
              <Line type="monotone" dataKey="savings" stroke="#4f8ff7" strokeWidth={2} dot={false} name="Savings" strokeDasharray={chartData.length > 0 && chartData[chartData.length-1].type === 'forecast' ? '5 5' : '0'} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-5 mt-3 text-[10px] text-gray-600">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gray-500" /> Historical</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gray-500 border-b border-dashed" style={{ borderStyle: 'dashed' }} /> Predicted</span>
        </div>
      </div>

      {/* Forecast cards */}
      {predictions?.forecasts && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {predictions.forecasts.map((f, i) => (
            <div key={i} className="glass-card p-3.5 text-center">
              <p className="text-[10px] text-gray-600 uppercase tracking-wide font-medium">{f.month}</p>
              <div className="mt-1.5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Exp</span>
                  <span className="text-red-400 font-medium">₹{(f.predicted_expenses/1000).toFixed(0)}k</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Save</span>
                  <span className={`font-medium ${f.predicted_savings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ₹{(f.predicted_savings/1000).toFixed(0)}k
                  </span>
                </div>
              </div>
              <div className="mt-1.5 w-full h-1 bg-[#22252d] rounded-full overflow-hidden">
                <div className="h-full bg-[#4f8ff7]/40 rounded-full" style={{ width: `${f.confidence * 100}%` }} />
              </div>
              <p className="text-[9px] text-gray-600 mt-0.5">{(f.confidence * 100).toFixed(0)}% conf.</p>
            </div>
          ))}
        </div>
      )}

      {/* Budget section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5 text-gray-200">
            <Zap size={14} className="text-yellow-500" />
            Smart Budget
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetAllocations} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="category" type="category" stroke="#64748b" fontSize={10} width={90} />
                <Tooltip
                  cursor={{ fill: '#ffffff04' }}
                  contentStyle={{ backgroundColor: '#16181e', border: '1px solid #22252d', borderRadius: '8px' }}
                  formatter={(v) => `₹${v.toLocaleString()}`}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="suggested" fill="#4f8ff7" radius={[0, 3, 3, 0]} barSize={10} name="Budget" opacity={0.35} />
                <Bar dataKey="spent" radius={[0, 3, 3, 0]} barSize={10} name="Spent">
                  {budgetAllocations.map((entry, i) => (
                    <Cell key={i} fill={entry.utilization > 100 ? '#e74c3c' : entry.utilization > 80 ? '#f0b429' : '#34c77b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget utilization */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5 text-gray-200">
              <Target size={14} className="text-emerald-400" />
              Budget Utilization
            </h3>
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {budgetAllocations.map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[item.type] || '#6b7280' }} />
                      {item.category}
                    </span>
                    <span className={`font-medium ${item.utilization > 100 ? 'text-red-400' : item.utilization > 80 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {item.utilization}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#22252d] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(item.utilization, 100)}%` }}
                      transition={{ delay: 0.3 + i * 0.04, duration: 0.5 }}
                      className={`h-full rounded-full ${item.utilization > 100 ? 'bg-red-500' : item.utilization > 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                    <span>₹{item.spent.toLocaleString()} / ₹{item.suggested.toLocaleString()}</span>
                    <span>{item.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Savings tips */}
          {budget?.savings_opportunities?.length > 0 && (
            <div className="glass-card p-4">
              <h4 className="text-xs font-semibold mb-2.5 flex items-center gap-1.5 text-gray-300">
                <ArrowDownRight size={13} className="text-emerald-400" />
                Savings Opportunities
              </h4>
              <div className="space-y-1.5">
                {budget.savings_opportunities.slice(0, 4).map((opp, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#111318] text-xs"
                  >
                    <span className="text-gray-400">{opp.suggestion}</span>
                    <span className="text-emerald-400 font-medium shrink-0 ml-2">+₹{opp.potential_savings.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Predictions;
