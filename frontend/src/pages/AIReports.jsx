import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Brain, Shield, TrendingUp, Wallet, PiggyBank,
  AlertTriangle, CheckCircle2, RefreshCw, ChevronRight,
  BarChart3, Target
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
  Budget: { bg: 'bg-[#4f8ff7]/10', text: 'text-[#4f8ff7]', bar: '#4f8ff7' },
  Investment: { bg: 'bg-[#7c6bea]/10', text: 'text-[#7c6bea]', bar: '#7c6bea' },
  Debt: { bg: 'bg-red-500/10', text: 'text-red-400', bar: '#e74c3c' },
  Savings: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', bar: '#34c77b' },
  Fraud: { bg: 'bg-amber-500/10', text: 'text-amber-400', bar: '#f0b429' },
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
        <Brain size={32} className="text-[#4f8ff7] mx-auto mb-3 animate-pulse" />
        <p className="text-gray-400 text-sm animate-pulse">Generating report...</p>
      </div>
    </div>
  );

  if (!report) return <div className="text-red-400 p-5 glass-card">Failed to generate report.</div>;

  const radarData = report.agent_scores
    ? Object.entries(report.agent_scores).map(([name, score]) => ({
        agent: name.charAt(0).toUpperCase() + name.slice(1),
        score: Math.round(score),
        fullMark: 100,
      }))
    : [];

  const scoreColor = report.overall_score >= 70 ? 'text-emerald-400' : report.overall_score >= 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-[#4f8ff7]" size={24} />
            Monthly Report
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">{report.report_month} — {report.user}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#4f8ff7]/10 hover:bg-[#4f8ff7]/15 text-[#4f8ff7] rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Analyzing...' : 'Refresh'}
        </button>
      </div>

      {/* Score + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Card */}
        <div className="glass-card p-6 flex flex-col items-center justify-center">
          <p className="text-xs text-gray-500 font-medium mb-3">Overall Health Score</p>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className={`text-6xl font-bold ${scoreColor}`}
          >
            {report.overall_score}
          </motion.div>
          <p className="text-gray-600 text-sm mt-1">out of 100</p>
          <div className="w-full mt-5 h-1.5 bg-[#22252d] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${report.overall_score}%` }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className={`h-full rounded-full ${report.overall_score >= 70 ? 'bg-emerald-500' : report.overall_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
            />
          </div>
        </div>

        {/* Radar */}
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3 text-gray-200">Analysis Breakdown</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#ffffff08" />
                <PolarAngleAxis dataKey="agent" stroke="#64748b" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#ffffff05" fontSize={9} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#4f8ff7"
                  fill="#4f8ff7"
                  fillOpacity={0.12}
                  strokeWidth={1.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {radarData.map((agent, i) => {
          const cfg = agentColors[agent.agent] || agentColors.Budget;
          const Icon = agentIcons[agent.agent] || Brain;
          const isActive = activeAgent === agent.agent.toLowerCase();
          return (
            <button
              key={agent.agent}
              onClick={() => setActiveAgent(isActive ? null : agent.agent.toLowerCase())}
              className={`glass-card p-3.5 text-center transition-colors ${isActive ? 'border-[#4f8ff7]/30' : 'hover:border-[#3a3d47]'}`}
            >
              <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center mx-auto mb-1.5`}>
                <Icon size={16} className={cfg.text} />
              </div>
              <p className="text-[10px] text-gray-600 font-medium">{agent.agent}</p>
              <p className={`text-xl font-bold mt-0.5 ${agent.score >= 70 ? 'text-emerald-400' : agent.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {agent.score}
              </p>
            </button>
          );
        })}
      </div>

      {/* Agent detail */}
      {activeAgent && report.agent_results?.[activeAgent] && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3 capitalize flex items-center gap-1.5 text-gray-200">
            {(() => { const Icon = agentIcons[activeAgent.charAt(0).toUpperCase() + activeAgent.slice(1)] || Brain; return <Icon size={14} className="text-[#4f8ff7]" />; })()}
            {activeAgent} — Details
          </h3>
          <div className="prose-chat whitespace-pre-wrap text-sm text-gray-400 leading-relaxed">
            {report.agent_results[activeAgent].analysis}
          </div>
          {report.agent_results[activeAgent].recommendations?.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-gray-500 font-medium">Recommendations</p>
              {report.agent_results[activeAgent].recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-1.5 p-2 rounded-lg bg-[#111318] text-xs text-gray-400">
                  <ChevronRight size={11} className="text-[#4f8ff7] mt-0.5 shrink-0" />
                  {rec}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-200">
            <AlertTriangle size={14} className="text-amber-400" />
            Alerts
          </h3>
          <AnomalyAlerts />

          {report.alerts?.length > 0 && (
            <div className="space-y-1.5">
              {report.alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`glass-card p-2.5 flex items-start gap-2.5 ${
                    alert.severity === 'critical' ? 'border-red-500/20' :
                    alert.severity === 'high' ? 'border-orange-500/20' : 'border-yellow-500/20'
                  }`}
                >
                  <AlertTriangle size={13} className={
                    alert.severity === 'critical' ? 'text-red-400' :
                    alert.severity === 'high' ? 'text-orange-400' : 'text-yellow-400'
                  } />
                  <div>
                    <p className="text-xs text-gray-200">{alert.message}</p>
                    <span className="text-[10px] text-gray-600">{alert.agent} · {alert.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-gray-200">
            <Target size={14} className="text-emerald-400" />
            Recommendations
          </h3>
          <div className="space-y-1.5">
            {(report.recommendations || []).map((rec, i) => (
              <div
                key={i}
                className="glass-card p-2.5 flex items-start gap-2.5"
              >
                <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-200">{rec.recommendation}</p>
                  <span className="text-[10px] text-gray-600">{rec.agent}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Forecast */}
          {report.forecast?.length > 0 && (
            <div className="glass-card p-5 mt-3">
              <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5 text-gray-300">
                <TrendingUp size={13} className="text-[#4f8ff7]" />
                3-Month Forecast
              </h4>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.forecast}>
                    <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#16181e', border: '1px solid #22252d', borderRadius: '8px' }}
                      formatter={(v) => `₹${Math.round(v).toLocaleString()}`}
                    />
                    <Bar dataKey="predicted_savings" radius={[3, 3, 0, 0]} barSize={28}>
                      {(report.forecast || []).map((entry, i) => (
                        <Cell key={i} fill={entry.predicted_savings >= 0 ? '#34c77b' : '#e74c3c'} />
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
