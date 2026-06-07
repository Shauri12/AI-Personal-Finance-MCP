import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, TrendingDown, Briefcase, X, Trash2,
  ExternalLink, Plus, Globe, RefreshCw, ChevronRight, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Type Config ────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  stocks:       { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30'   },
  crypto:       { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  mutual_fund:  { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  fixed_deposit:{ bg: 'bg-emerald-500/10',text: 'text-emerald-400',border: 'border-emerald-500/30'},
  sip:          { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  ppf:          { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/30'  },
  gold:         { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  bonds:        { bg: 'bg-teal-500/10',   text: 'text-teal-400',   border: 'border-teal-500/30'   },
  real_estate:  { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30'    },
  nps:          { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
};

const getTypeColor = (type) => TYPE_COLORS[type] || { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' };

// ─── Add to Portfolio Modal ──────────────────────────────────────────────────
const InvestmentModal = ({ isOpen, onClose, onSuccess, prefill = null }) => {
  const defaultForm = {
    name: '', investment_type: 'mutual_fund', invested_amount: '',
    current_value: '', platform: '', risk_score: '5',
  };

  const [formData, setFormData] = useState(defaultForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefill) {
      setFormData({
        name: prefill.name || '',
        investment_type: prefill.type || 'stocks',
        invested_amount: '',
        current_value: '',
        platform: prefill.source_website || '',
        risk_score: '5',
      });
    } else {
      setFormData(defaultForm);
    }
  }, [prefill, isOpen]);

  const investmentTypes = [
    'mutual_fund', 'stocks', 'sip', 'fixed_deposit',
    'ppf', 'nps', 'gold', 'crypto', 'bonds', 'real_estate',
  ];

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const invested = parseFloat(formData.invested_amount);
    const current  = parseFloat(formData.current_value);
    const returns_pct = invested > 0 ? ((current - invested) / invested) * 100 : 0;
    try {
      await api.post('/api/finance/investments', {
        ...formData,
        invested_amount: invested,
        current_value: current,
        returns_pct: parseFloat(returns_pct.toFixed(2)),
        risk_score: parseFloat(formData.risk_score),
      });
      onSuccess();
      onClose();
    } catch {
      alert('Failed to add investment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#0f1117] border border-gray-700/50 rounded-2xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Add to Portfolio</h3>
            {prefill && (
              <p className="text-xs text-gray-400 mt-0.5">From {prefill.source_website}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Asset Name</label>
            <input
              type="text" name="name" required value={formData.name} onChange={handleChange}
              className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all"
              placeholder="e.g. Nifty 50 Index Fund"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Asset Type</label>
              <select
                name="investment_type" value={formData.investment_type} onChange={handleChange}
                className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all capitalize"
              >
                {investmentTypes.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Platform</label>
              <input
                type="text" name="platform" value={formData.platform} onChange={handleChange}
                className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                placeholder="e.g. Zerodha"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Amount Invested</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number" name="invested_amount" required min="0" step="0.01"
                  value={formData.invested_amount} onChange={handleChange}
                  className="w-full bg-gray-800/60 border border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Current Value</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number" name="current_value" required min="0" step="0.01"
                  value={formData.current_value} onChange={handleChange}
                  className="w-full bg-gray-800/60 border border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5 flex justify-between">
              <span>Risk Score</span>
              <span className="text-blue-400 font-bold tabular-nums">{formData.risk_score} / 10</span>
            </label>
            <input
              type="range" name="risk_score" min="1" max="10" step="1"
              value={formData.risk_score} onChange={handleChange}
              className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500 mt-2"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1.5">
              <span>Low Risk</span><span>High Risk</span>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-3 mt-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
          >
            {loading ? 'Adding...' : '✓ Add to Portfolio'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Opportunity Card ────────────────────────────────────────────────────────
const OpportunityCard = ({ opp, onAddToPortfolio, index }) => {
  const colors = getTypeColor(opp.type);
  const isPositive = opp.change_pct >= 0;
  const isRateField = opp.type === 'fixed_deposit';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group relative bg-gradient-to-br from-gray-900 to-[#0f1117] border border-gray-800 hover:border-gray-600 rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300 hover:shadow-xl hover:shadow-black/30"
    >
      {/* Top Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${colors.bg} ${colors.text} border ${colors.border}`}>
            {opp.type.replace(/_/g, ' ')}
          </span>
          <h4 className="text-white font-semibold text-sm leading-snug line-clamp-2" title={opp.name}>
            {opp.name}
          </h4>
        </div>
        <div className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isPositive ? '+' : ''}{opp.change_pct}%
        </div>
      </div>

      {/* Price / Rate Row */}
      <div className="flex items-center justify-between bg-black/20 rounded-xl px-4 py-2.5">
        <span className="text-gray-500 text-xs">{isRateField ? 'Interest Rate' : 'Price'}</span>
        <span className="text-white font-bold text-base">{isRateField ? `${opp.change_pct}% p.a.` : opp.price}</span>
      </div>

      {/* Source */}
      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
        <Globe size={12} />
        <span>{opp.source_website}</span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <a
          href={opp.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-xl py-2.5 transition-all border border-gray-700/50"
        >
          <ExternalLink size={13} />
          Invest Now
        </a>
        <button
          onClick={() => onAddToPortfolio(opp)}
          className="flex items-center justify-center gap-1.5 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl py-2.5 transition-all shadow-md shadow-blue-900/20"
        >
          <Plus size={13} />
          Add to Portfolio
        </button>
      </div>
    </motion.div>
  );
};

// ─── My Portfolio Investment Card ────────────────────────────────────────────
const PortfolioCard = ({ inv, onDelete, index }) => {
  const colors = getTypeColor(inv.investment_type);
  const formatCurrency = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <motion.div
      key={inv.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.04 }}
      className="group relative bg-gray-800/70 border border-gray-700 hover:border-gray-500 rounded-2xl p-5 transition-all duration-300"
    >
      <button
        onClick={() => onDelete(inv.id)}
        className="absolute top-4 right-4 p-1.5 bg-gray-900/80 text-gray-500 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        title="Delete"
      >
        <Trash2 size={14} />
      </button>

      <div className="flex items-start gap-3 mb-4">
        <div>
          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${colors.bg} ${colors.text} border ${colors.border}`}>
            {inv.investment_type?.replace(/_/g, ' ')}
          </span>
          <h4 className="font-semibold text-white text-sm leading-snug" title={inv.name}>{inv.name}</h4>
          {inv.platform && <p className="text-xs text-gray-500 mt-0.5">{inv.platform}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Current Value</span>
          <span className="text-white font-bold">{formatCurrency(inv.current_value)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Invested</span>
          <span className="text-gray-300 text-sm">{formatCurrency(inv.invested_amount)}</span>
        </div>
        <div className="pt-2 mt-2 border-t border-gray-700 flex justify-between items-center">
          <span className="text-xs text-gray-500">Returns</span>
          <span className={`flex items-center gap-1 text-sm font-bold ${inv.returns_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {inv.returns_pct >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {inv.returns_pct >= 0 ? '+' : ''}{inv.returns_pct?.toFixed(1)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Source Filter Pill ──────────────────────────────────────────────────────
const FilterPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
      active
        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
        : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
    }`}
  >
    {label}
  </button>
);

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Investments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [loadingOpp, setLoadingOpp] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [oppSearch, setOppSearch] = useState('');
  const [activeSource, setActiveSource] = useState('All');
  const [activeTab, setActiveTab] = useState('market'); // 'market' | 'portfolio'

  const formatCurrency = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const fetchInvestments = async () => {
    setLoadingPortfolio(true);
    try {
      const res = await api.get('/api/finance/investments');
      setInvestments(res.data);
    } catch (e) {
      console.error('Portfolio error:', e);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const fetchOpportunities = async () => {
    setLoadingOpp(true);
    try {
      const res = await api.get('/api/finance/opportunities');
      setOpportunities(res.data.opportunities || []);
    } catch (e) {
      console.error('Opportunities error:', e);
    } finally {
      setLoadingOpp(false);
    }
  };

  useEffect(() => {
    if (user) { fetchInvestments(); fetchOpportunities(); }
  }, [user]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this investment?')) return;
    try {
      await api.delete(`/api/finance/investments/${id}`);
      fetchInvestments();
    } catch { alert('Failed to delete.'); }
  };

  const handleAddToPortfolio = (opp) => {
    setPrefill(opp);
    setIsModalOpen(true);
  };

  const handleModalClose = () => { setIsModalOpen(false); setPrefill(null); };
  const handleModalSuccess = () => { fetchInvestments(); setActiveTab('portfolio'); };

  // Portfolio stats
  const totalInvested  = investments.reduce((s, i) => s + i.invested_amount, 0);
  const totalCurrent   = investments.reduce((s, i) => s + i.current_value, 0);
  const totalReturns   = totalCurrent - totalInvested;
  const totalReturnsPct = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  // Sources for filter pills
  const sources = ['All', ...new Set(opportunities.map(o => o.source_website))];

  // Filtered opportunities
  const filteredOpp = opportunities.filter(o => {
    const matchSearch = o.name.toLowerCase().includes(oppSearch.toLowerCase()) ||
      o.source_website.toLowerCase().includes(oppSearch.toLowerCase()) ||
      o.type.toLowerCase().includes(oppSearch.toLowerCase());
    const matchSource = activeSource === 'All' || o.source_website === activeSource;
    return matchSearch && matchSource;
  });

  // Filtered portfolio
  const filteredPortfolio = investments.filter(i =>
    (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.platform || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Investments</h1>
          <p className="text-gray-400 mt-1">Discover opportunities and track your portfolio.</p>
        </div>
      </div>

      {/* ── Portfolio Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Portfolio Value', value: formatCurrency(totalCurrent), color: 'text-white', size: 'text-3xl' },
          { label: 'Total Invested', value: formatCurrency(totalInvested), color: 'text-gray-300', size: 'text-2xl' },
          {
            label: 'Total Returns',
            value: `${totalReturns >= 0 ? '+' : ''}${formatCurrency(totalReturns)}`,
            sub: `${totalReturns >= 0 ? '+' : ''}${totalReturnsPct.toFixed(2)}%`,
            color: totalReturns >= 0 ? 'text-emerald-400' : 'text-red-400',
            size: 'text-2xl',
          },
        ].map((s, i) => (
          <div key={i} className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 backdrop-blur-sm">
            <p className="text-gray-500 text-sm font-medium mb-2">{s.label}</p>
            <p className={`font-bold ${s.size} ${s.color}`}>{s.value}</p>
            {s.sub && <p className={`text-sm mt-1 font-medium ${s.color} opacity-80`}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-xl p-1 w-fit">
        {[
          { id: 'market',    label: '🌐 Market Opportunities' },
          { id: 'portfolio', label: `💼 My Portfolio (${investments.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Market Opportunities Tab ── */}
      {activeTab === 'market' && (
        <div className="space-y-6">
          {/* Search + Source Filter + Refresh */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text" placeholder="Search by name, type, or source..."
                value={oppSearch} onChange={e => setOppSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all"
              />
            </div>
            <button
              onClick={fetchOpportunities}
              disabled={loadingOpp}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-300 text-sm font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw size={15} className={loadingOpp ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Source filter pills */}
          <div className="flex flex-wrap gap-2">
            {sources.map(src => (
              <FilterPill key={src} label={src} active={activeSource === src} onClick={() => setActiveSource(src)} />
            ))}
          </div>

          {/* Opportunities Grid */}
          {loadingOpp ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-52" />
              ))}
            </div>
          ) : filteredOpp.length === 0 ? (
            <div className="py-20 text-center">
              <Globe className="mx-auto mb-4 text-gray-600" size={40} />
              <p className="text-gray-400">No opportunities found. Try refreshing or changing filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredOpp.map((opp, i) => (
                <OpportunityCard
                  key={`${opp.source_website}-${opp.name}-${i}`}
                  opp={opp}
                  index={i}
                  onAddToPortfolio={handleAddToPortfolio}
                />
              ))}
            </div>
          )}

          {/* Info banner */}
          <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-800/40 rounded-xl px-5 py-4">
            <Zap size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-300/80">
              Click <strong>"Invest Now"</strong> to open the official website and apply for any investment.
              Click <strong>"Add to Portfolio"</strong> once you've invested to track it here.
              Data is cached for 1 hour to avoid rate limits.
            </p>
          </div>
        </div>
      )}

      {/* ── My Portfolio Tab ── */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text" placeholder="Search your portfolio..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all"
            />
          </div>

          {loadingPortfolio ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-44" />
              ))}
            </div>
          ) : filteredPortfolio.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center">
                <Briefcase className="text-gray-500" size={28} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Your portfolio is empty</h3>
                <p className="text-gray-500 text-sm">Browse the Market Opportunities tab and click "Add to Portfolio" to get started.</p>
              </div>
              <button
                onClick={() => setActiveTab('market')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
              >
                Browse Opportunities <ChevronRight size={16} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence>
                {filteredPortfolio.map((inv, i) => (
                  <PortfolioCard key={inv.id} inv={inv} index={i} onDelete={handleDelete} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ── Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <InvestmentModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            onSuccess={handleModalSuccess}
            prefill={prefill}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
