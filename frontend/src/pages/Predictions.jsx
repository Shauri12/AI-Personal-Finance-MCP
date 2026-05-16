import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Brain, Target, Zap,
  ArrowUpRight, ArrowDownRight, BarChart3, Activity
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
        <Brain size={40} className="text-primary mx-auto mb-4 animate-pulse" />
        <p className="text-primary font-bold animate-pulse">AI Engine Processing...</p>
        <p className="text-gray-500 text-xs mt-2">Running predictive models</p>
      </div>
    </div>
  );

  // Combine historical + forecast data for chart
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

  const COLORS = {
    essential: '#10b981',
    'semi-essential': '#3b82f6',
    discretionary: '#8b5cf6',
    debt: '#ef4444',
    other: '#6b7280',
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-3">
          <Brain className="text-primary" size={32} />
          Predictive Analytics
        </h2>
        <p className="text-gray-400 mt-1">AI-powered forecasting & smart budget optimization</p>
      </div>

      {/* Forecast Insights */}
      {predictions?.insights && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {predictions.insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-4 flex items-start gap-3 hover:border-primary/20 transition-colors"
            >
              <span className="text-lg">{insight.split(' ')[0]}</span>
              <p className="text-xs text-gray-300 leading-relaxed">{insight.split(' ').slice(1).join(' ')}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Main Forecast Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          Income, Expenses & Savings Forecast
          <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase ml-2">AI Prediction</span>
        </h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="gradInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '12px' }}
                formatter={(value, name) => [`₹${Math.round(value).toLocaleString()}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#gradInc)" name="Income" />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#gradExp)" name="Expenses" />
              <Line type="monotone" dataKey="savings" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Savings" strokeDasharray={chartData.length > 0 && chartData[chartData.length-1].type === 'forecast' ? '5 5' : '0'} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-6 mt-4 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gray-400" /> Historical</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gray-400 border-b border-dashed" style={{ borderStyle: 'dashed' }} /> Predicted</span>
        </div>
      </motion.div>

      {/* Forecast Cards */}
      {predictions?.forecasts && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {predictions.forecasts.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="glass-card p-4 text-center hover:border-primary/20 transition-all group"
            >
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{f.month}</p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Exp</span>
                  <span className="text-red-400 font-semibold">₹{(f.predicted_expenses/1000).toFixed(0)}k</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Save</span>
                  <span className={`font-semibold ${f.predicted_savings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ₹{(f.predicted_savings/1000).toFixed(0)}k
                  </span>
                </div>
              </div>
              <div className="mt-2 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary/50 rounded-full" style={{ width: `${f.confidence * 100}%` }} />
              </div>
              <p className="text-[8px] text-gray-600 mt-1">{(f.confidence * 100).toFixed(0)}% confidence</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Smart Budget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Budget Allocation Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Zap size={18} className="text-yellow-500" />
            AI Smart Budget
            <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full font-bold uppercase ml-2">Optimized</span>
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetAllocations} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="category" type="category" stroke="#94a3b8" fontSize={10} width={90} />
                <Tooltip
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  formatter={(v) => `₹${v.toLocaleString()}`}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="suggested" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} name="Budget" opacity={0.4} />
                <Bar dataKey="spent" radius={[0, 4, 4, 0]} barSize={12} name="Spent">
                  {budgetAllocations.map((entry, i) => (
                    <Cell key={i} fill={entry.utilization > 100 ? '#ef4444' : entry.utilization > 80 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Budget Status Cards */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target size={18} className="text-emerald-500" />
              Budget Utilization
            </h3>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
              {budgetAllocations.map((item, i) => (
                <div key={i} className="group">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[item.type] || '#6b7280' }} />
                      {item.category}
                    </span>
                    <span className={`font-bold ${item.utilization > 100 ? 'text-red-400' : item.utilization > 80 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {item.utilization}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(item.utilization, 100)}%` }}
                      transition={{ delay: 0.8 + i * 0.05, duration: 0.6 }}
                      className={`h-full rounded-full ${item.utilization > 100 ? 'bg-red-500' : item.utilization > 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
                    <span>₹{item.spent.toLocaleString()} / ₹{item.suggested.toLocaleString()}</span>
                    <span className="uppercase tracking-wider">{item.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Savings Opportunities */}
          {budget?.savings_opportunities?.length > 0 && (
            <div className="glass-card p-4 border-emerald-500/20">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ArrowDownRight size={14} className="text-emerald-500" />
                Savings Opportunities
              </h4>
              <div className="space-y-2">
                {budget.savings_opportunities.slice(0, 4).map((opp, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 + i * 0.1 }}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-emerald-500/5 transition-colors text-xs"
                  >
                    <span className="text-gray-300">{opp.suggestion}</span>
                    <span className="text-emerald-400 font-bold shrink-0 ml-2">+₹{opp.potential_savings.toLocaleString()}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Predictions;
