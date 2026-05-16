import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Brain, Shield, TrendingUp, Wallet, PiggyBank,
  AlertTriangle, CheckCircle2, Download, RefreshCw, ChevronRight,
  Sparkles, BarChart3, Target
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import api from '../api/client';
import AnomalyAlerts from '../components/AnomalyAlerts';

const agentIcons = {
  Budget: Wallet,
  Investment: TrendingUp,
  Debt: BarChart3,
  Savings: PiggyBank,
  Fraud: Shield,
};

const agentColors = {
  Budget: { bg: 'bg-blue-500/10', text: 'text-blue-400', bar: '#3b82f6' },
  Investment: { bg: 'bg-violet-500/10', text: 'text-violet-400', bar: '#8b5cf6' },
  Debt: { bg: 'bg-red-500/10', text: 'text-red-400', bar: '#ef4444' },
  Savings: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: '#10b981' },
  Fraud: { bg: 'bg-amber-500/10', text: 'text-amber-400', bar: '#f59e0b' },
};

const AIReports = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeAgent, setActiveAgent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = async () => {
    try {
      const res = await api.get('/api/ai/report/monthly');
      setReport(res.data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReport();
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Brain size={48} className="text-primary mx-auto" />
        </motion.div>
        <p className="text-primary font-bold mt-4 animate-pulse">Multi-Agent Analysis Running...</p>
        <p className="text-gray-500 text-xs mt-2">5 AI agents analyzing your finances</p>
      </div>
    </div>
  );

  if (!report) return <div className="text-red-400 p-8 glass-card">Failed to generate report.</div>;

  const radarData = report.agent_scores
    ? Object.entries(report.agent_scores).map(([name, score]) => ({
        agent: name.charAt(0).toUpperCase() + name.slice(1),
        score: Math.round(score),
        fullMark: 100,
      }))
    : [];

  const scoreColor = report.overall_score >= 70 ? 'text-emerald-400' : report.overall_score >= 40 ? 'text-yellow-400' : 'text-red-400';
  const scoreGlow = report.overall_score >= 70 ? 'shadow-emerald-500/20' : report.overall_score >= 40 ? 'shadow-yellow-500/20' : 'shadow-red-500/20';

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="text-primary" size={32} />
            AI Monthly Report
          </h2>
          <p className="text-gray-400 mt-1">{report.report_month} — {report.user}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors text-sm font-semibold"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Analyzing...' : 'Refresh Report'}
        </button>
      </div>

      {/* Overall Score + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`glass-card p-8 flex flex-col items-center justify-center relative overflow-hidden`}
        >
          <div className={`absolute inset-0 ${scoreGlow} blur-3xl opacity-20`} />
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-4 relative z-10">Overall Financial Health</p>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className={`text-7xl font-black ${scoreColor} relative z-10`}
          >
            {report.overall_score}
          </motion.div>
          <p className="text-gray-500 text-sm mt-2 relative z-10">out of 100</p>
          <div className="w-full mt-6 h-2 bg-white/5 rounded-full overflow-hidden relative z-10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${report.overall_score}%` }}
              transition={{ delay: 0.5, duration: 1 }}
              className={`h-full rounded-full ${report.overall_score >= 70 ? 'bg-emerald-500' : report.overall_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
            />
          </div>
        </motion.div>

        {/* Agent Radar Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            Multi-Agent Analysis
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#ffffff08" />
                <PolarAngleAxis dataKey="agent" stroke="#94a3b8" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#ffffff05" fontSize={9} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Agent Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {radarData.map((agent, i) => {
          const cfg = agentColors[agent.agent] || agentColors.Budget;
          const Icon = agentIcons[agent.agent] || Brain;
          const isActive = activeAgent === agent.agent.toLowerCase();
          return (
            <motion.button
              key={agent.agent}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              onClick={() => setActiveAgent(isActive ? null : agent.agent.toLowerCase())}
              className={`glass-card p-4 text-center hover:border-white/20 transition-all ${isActive ? 'border-primary/40 bg-primary/5' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center mx-auto mb-2`}>
                <Icon size={20} className={cfg.text} />
              </div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{agent.agent}</p>
              <p className={`text-2xl font-black mt-1 ${agent.score >= 70 ? 'text-emerald-400' : agent.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {agent.score}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Agent Detail Panel */}
      {activeAgent && report.agent_results?.[activeAgent] && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-card p-6 border-primary/20"
        >
          <h3 className="text-lg font-semibold mb-4 capitalize flex items-center gap-2">
            {(() => { const Icon = agentIcons[activeAgent.charAt(0).toUpperCase() + activeAgent.slice(1)] || Brain; return <Icon size={18} className="text-primary" />; })()}
            {activeAgent} Agent — Detailed Analysis
          </h3>
          <div className="prose-chat whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
            {report.agent_results[activeAgent].analysis}
          </div>
          {report.agent_results[activeAgent].recommendations?.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Recommendations</p>
              {report.agent_results[activeAgent].recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/5 text-xs text-gray-300">
                  <ChevronRight size={12} className="text-primary mt-0.5 shrink-0" />
                  {rec}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Alerts */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Active Alerts
          </h3>
          <AnomalyAlerts />

          {report.alerts?.length > 0 && (
            <div className="space-y-2">
              {report.alerts.map((alert, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  className={`glass-card p-3 flex items-start gap-3 ${
                    alert.severity === 'critical' ? 'border-red-500/30' :
                    alert.severity === 'high' ? 'border-orange-500/30' : 'border-yellow-500/30'
                  }`}
                >
                  <AlertTriangle size={14} className={
                    alert.severity === 'critical' ? 'text-red-400' :
                    alert.severity === 'high' ? 'text-orange-400' : 'text-yellow-400'
                  } />
                  <div>
                    <p className="text-xs font-medium text-white">{alert.message}</p>
                    <span className="text-[9px] text-gray-500 uppercase">{alert.agent} • {alert.severity}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target size={18} className="text-emerald-500" />
            AI Recommendations
          </h3>
          <div className="space-y-2">
            {(report.recommendations || []).map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.05 }}
                className="glass-card p-3 flex items-start gap-3 hover:border-emerald-500/20 transition-colors"
              >
                <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-white">{rec.recommendation}</p>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wider">{rec.agent} agent</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Forecast Section */}
          {report.forecast?.length > 0 && (
            <div className="glass-card p-6 mt-4">
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-primary" />
                3-Month Forecast
              </h4>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.forecast}>
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }}
                      formatter={(v) => `₹${Math.round(v).toLocaleString()}`}
                    />
                    <Bar dataKey="predicted_savings" radius={[4, 4, 0, 0]} barSize={30}>
                      {(report.forecast || []).map((entry, i) => (
                        <Cell key={i} fill={entry.predicted_savings >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIReports;
