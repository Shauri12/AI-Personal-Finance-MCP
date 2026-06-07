import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, TrendingDown, Briefcase, X, Trash2,
  ExternalLink, Plus, Globe, RefreshCw, ChevronRight, Zap,
  AlertTriangle, Info, BellRing, Edit, ListPlus, CheckCircle2
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

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);


// ─── Add / Edit Investment Modal ──────────────────────────────────────────────────
const InvestmentModal = ({ isOpen, onClose, onSuccess, prefill = null, editMode = false }) => {
  const defaultForm = {
    name: '', investment_type: 'mutual_fund', invested_amount: '',
    current_value: '', platform: '', risk_score: '5', maturity_date: ''
  };

  const [formData, setFormData] = useState(defaultForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefill) {
      if (editMode) {
        setFormData({
          id: prefill.id,
          name: prefill.name,
          investment_type: prefill.investment_type,
          invested_amount: prefill.invested_amount,
          current_value: prefill.current_value,
          platform: prefill.platform || '',
          risk_score: prefill.risk_score || '5',
          maturity_date: prefill.maturity_date ? prefill.maturity_date.split('T')[0] : ''
        });
      } else {
        setFormData({
          name: prefill.name || '',
          investment_type: prefill.type || 'stocks',
          invested_amount: '',
          current_value: '',
          platform: prefill.source_website || '',
          risk_score: '5',
          maturity_date: ''
        });
      }
    } else {
      setFormData(defaultForm);
    }
  }, [prefill, isOpen, editMode]);

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
    
    const payload = {
      name: formData.name,
      investment_type: formData.investment_type,
      invested_amount: invested,
      current_value: current,
      returns_pct: parseFloat(returns_pct.toFixed(2)),
      risk_score: parseFloat(formData.risk_score),
      platform: formData.platform,
      maturity_date: formData.maturity_date ? new Date(formData.maturity_date).toISOString() : null
    };

    try {
      if (editMode) {
        await api.put(`/api/finance/investments/${formData.id}`, payload);
      } else {
        await api.post('/api/finance/investments', payload);
      }
      onSuccess();
      onClose();
    } catch {
      alert(`Failed to ${editMode ? 'update' : 'add'} investment. Please try again.`);
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">{editMode ? 'Edit Investment' : 'Add to Portfolio'}</h3>
            {!editMode && prefill && (
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
              className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
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
                  value={formData.invested_amount} onChange={handleChange} disabled={editMode && ['sip', 'mutual_fund'].includes(formData.investment_type)}
                  className="w-full bg-gray-800/60 border border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50"
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Maturity Date (Optional)</label>
            <input
              type="date" name="maturity_date" value={formData.maturity_date} onChange={handleChange}
              className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl py-3 mt-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
          >
            {loading ? 'Saving...' : (editMode ? 'Save Changes' : '✓ Add to Portfolio')}
          </button>
        </form>
      </motion.div>
    </div>
  );
};


// ─── SIP Installment Modal ───────────────────────────────────────────────────
const SIPModal = ({ isOpen, onClose, onSuccess, investmentId }) => {
  const [formData, setFormData] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/api/finance/investments/${investmentId}/sip`, {
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString()
      });
      onSuccess();
      onClose();
    } catch {
      alert('Failed to log installment.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0f1117] border border-gray-700/50 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Add Installment</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Amount</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input type="number" required min="1" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full bg-gray-800/60 border border-gray-700 rounded-xl pl-8 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Date</label>
            <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="w-full bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl py-3 mt-2">
            {loading ? 'Adding...' : 'Log Installment'}
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
  const isRateField = ['fixed_deposit', 'ppf', 'nps', 'bonds'].includes(opp.type);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
      className="group relative bg-gradient-to-br from-gray-900 to-[#0f1117] border border-gray-800 hover:border-gray-600 rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300 hover:shadow-xl hover:shadow-black/30"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${colors.bg} ${colors.text} border ${colors.border}`}>
            {opp.type.replace(/_/g, ' ')}
          </span>
          <h4 className="text-white font-semibold text-sm leading-snug line-clamp-2" title={opp.name}>{opp.name}</h4>
        </div>
        <div className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isPositive ? '+' : ''}{opp.change_pct}%
        </div>
      </div>
      <div className="flex items-center justify-between bg-black/20 rounded-xl px-4 py-2.5">
        <span className="text-gray-500 text-xs">{isRateField ? 'Interest/Yield' : 'Price'}</span>
        <span className="text-white font-bold text-base">{isRateField ? `${opp.change_pct}% p.a.` : opp.price}</span>
      </div>
      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
        <Globe size={12} /><span>{opp.source_website}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <a href={opp.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-xl py-2.5 border border-gray-700/50">
          <ExternalLink size={13} /> Invest Now
        </a>
        <button onClick={() => onAddToPortfolio(opp)} className="flex items-center justify-center gap-1.5 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl py-2.5">
          <Plus size={13} /> Add Portfolio
        </button>
      </div>
    </motion.div>
  );
};


// ─── My Portfolio Investment Card ────────────────────────────────────────────
const PortfolioCard = ({ inv, onEdit, onDelete, index }) => {
  const colors = getTypeColor(inv.investment_type);
  const [showSip, setShowSip] = useState(false);
  const [sips, setSips] = useState([]);
  const [isSipModalOpen, setIsSipModalOpen] = useState(false);
  const isSipEligible = ['sip', 'mutual_fund'].includes(inv.investment_type);

  const fetchSips = async () => {
    try {
      const res = await api.get(`/api/finance/investments/${inv.id}/sip`);
      setSips(res.data);
    } catch { /* ignore */ }
  };

  const handleSipToggle = () => {
    if (!showSip) fetchSips();
    setShowSip(!showSip);
  };

  const handleDeleteSip = async (sipId) => {
    if (!confirm('Delete this installment?')) return;
    try {
      await api.delete(`/api/finance/investments/${inv.id}/sip/${sipId}`);
      fetchSips();
    } catch { alert('Failed to delete installment'); }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: index * 0.04 }}
      className="group relative bg-gray-800/70 border border-gray-700 hover:border-gray-500 rounded-2xl p-5 transition-all duration-300 flex flex-col h-full"
    >
      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(inv)} className="p-1.5 bg-gray-900/80 text-blue-400 hover:bg-blue-500/20 rounded-lg"><Edit size={14} /></button>
        <button onClick={() => onDelete(inv.id)} className="p-1.5 bg-gray-900/80 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 size={14} /></button>
      </div>

      <div className="flex items-start gap-3 mb-4">
        <div>
          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${colors.bg} ${colors.text} border ${colors.border}`}>
            {inv.investment_type?.replace(/_/g, ' ')}
          </span>
          <h4 className="font-semibold text-white text-sm leading-snug pr-12">{inv.name}</h4>
          {inv.platform && <p className="text-xs text-gray-500 mt-0.5">{inv.platform}</p>}
        </div>
      </div>

      <div className="space-y-2 mt-auto">
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

      {isSipEligible && (
        <div className="mt-4 pt-3 border-t border-gray-700/50">
          <button onClick={handleSipToggle} className="w-full flex items-center justify-between text-xs font-medium text-gray-400 hover:text-white transition-colors">
            <span className="flex items-center gap-1.5"><ListPlus size={14}/> SIP Tracker</span>
            <ChevronRight size={14} className={`transform transition-transform ${showSip ? 'rotate-90' : ''}`} />
          </button>
          
          <AnimatePresence>
            {showSip && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3 space-y-2">
                <button onClick={() => setIsSipModalOpen(true)} className="w-full text-xs py-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg flex items-center justify-center gap-1 font-medium transition-colors">
                  <Plus size={12}/> Add Installment
                </button>
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {sips.length === 0 ? (
                    <p className="text-xs text-center text-gray-500 py-2">No installments yet</p>
                  ) : sips.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-xs bg-gray-900/50 p-2 rounded-lg group/sip">
                      <div className="flex flex-col">
                        <span className="text-gray-300 font-medium">{formatCurrency(s.amount)}</span>
                        <span className="text-gray-600">{new Date(s.date).toLocaleDateString()}</span>
                      </div>
                      <button onClick={() => handleDeleteSip(s.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover/sip:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {isSipModalOpen && (
        <SIPModal isOpen={isSipModalOpen} onClose={() => setIsSipModalOpen(false)} onSuccess={() => {fetchSips(); onEdit();}} investmentId={inv.id} />
      )}
    </motion.div>
  );
};


// ─── Filter Pill ────────────────────────────────────────────────────────
const FilterPill = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
      active ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30' : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
    }`}
  >{label}</button>
);


// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Investments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingOpp, setLoadingOpp] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [oppSearch, setOppSearch] = useState('');
  const [activeSource, setActiveSource] = useState('All');
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' | 'market' | 'analytics'

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, sumRes, altRes] = await Promise.all([
        api.get('/api/finance/investments'),
        api.get('/api/finance/investments/summary'),
        api.get('/api/finance/investments/alerts')
      ]);
      setInvestments(invRes.data);
      setSummary(sumRes.data);
      setAlerts(altRes.data);
    } catch (e) { console.error('Data error:', e); }
    finally { setLoading(false); }
  };

  const fetchOpportunities = async () => {
    setLoadingOpp(true);
    try {
      const res = await api.get('/api/finance/opportunities');
      setOpportunities(res.data.opportunities || []);
    } catch (e) { console.error('Opp error:', e); }
    finally { setLoadingOpp(false); }
  };

  useEffect(() => {
    if (user) { fetchData(); fetchOpportunities(); }
  }, [user]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this investment?')) return;
    try {
      await api.delete(`/api/finance/investments/${id}`);
      fetchData();
    } catch { alert('Failed to delete.'); }
  };

  const handleEdit = (inv) => {
    setPrefill(inv);
    setEditMode(true);
    setIsModalOpen(true);
  };

  const handleAddToPortfolio = (opp) => {
    setPrefill(opp);
    setEditMode(false);
    setIsModalOpen(true);
  };

  const sources = ['All', ...new Set(opportunities.map(o => o.source_website))];
  const filteredOpp = opportunities.filter(o => {
    const mSearch = o.name.toLowerCase().includes(oppSearch.toLowerCase()) || o.source_website.toLowerCase().includes(oppSearch.toLowerCase());
    const mSource = activeSource === 'All' || o.source_website === activeSource;
    return mSearch && mSource;
  });

  const filteredPortfolio = investments.filter(i => (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Investments</h1>
          <p className="text-gray-400 mt-1">Discover opportunities, track portfolio, and analyze returns.</p>
        </div>
      </div>

      {/* ── Alerts Banner ── */}
      {alerts.length > 0 && activeTab !== 'market' && (
        <div className="flex flex-col gap-2">
          {alerts.slice(0, 2).map((a, i) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
              a.severity === 'critical' ? 'bg-red-900/20 border-red-800/50' : 
              a.severity === 'warning' ? 'bg-yellow-900/20 border-yellow-800/50' : 
              'bg-blue-900/20 border-blue-800/50'
            }`}>
              {a.severity === 'critical' ? <AlertTriangle className="text-red-400 mt-0.5" size={18}/> :
               a.severity === 'warning' ? <BellRing className="text-yellow-400 mt-0.5" size={18}/> :
               <Info className="text-blue-400 mt-0.5" size={18}/>}
              <div>
                <p className={`text-sm font-medium ${a.severity === 'critical' ? 'text-red-200' : a.severity === 'warning' ? 'text-yellow-200' : 'text-blue-200'}`}>
                  {a.message}
                </p>
                {a.action && <p className="text-xs mt-1 text-gray-400 opacity-80">{a.action}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-900/50 border border-gray-800 rounded-xl p-1 w-fit overflow-x-auto">
        {[
          { id: 'portfolio', label: `💼 Portfolio (${investments.length})` },
          { id: 'analytics', label: '📊 Analytics' },
          { id: 'market',    label: '🌐 Market Opportunities' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'text-gray-400 hover:text-white'
          }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── My Portfolio Tab ── */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input type="text" placeholder="Search your portfolio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={() => { setPrefill(null); setEditMode(false); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all">
              <Plus size={18}/> Add Custom
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-44" />)}
            </div>
          ) : filteredPortfolio.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center"><Briefcase className="text-gray-500" size={28} /></div>
              <div><h3 className="text-lg font-semibold text-white mb-1">Your portfolio is empty</h3>
              <p className="text-gray-500 text-sm">Browse Market Opportunities to get started.</p></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence>
                {filteredPortfolio.map((inv, i) => (
                  <PortfolioCard key={inv.id} inv={inv} index={i} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ── Analytics Tab ── */}
      {activeTab === 'analytics' && summary && (
        <div className="space-y-6">
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Value', value: formatCurrency(summary.total_current_value), color: 'text-white' },
              { label: 'Total Invested', value: formatCurrency(summary.total_invested), color: 'text-gray-300' },
              { label: 'Overall P&L', value: `${summary.total_pnl >= 0 ? '+' : ''}${formatCurrency(summary.total_pnl)}`, sub: `${summary.total_pnl_pct.toFixed(2)}%`, color: summary.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Risk Profile', value: summary.risk_label, sub: `Score: ${summary.avg_risk_score}/10`, color: 'text-blue-400' },
            ].map((s, i) => (
              <div key={i} className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
                <p className="text-gray-500 text-sm font-medium mb-2">{s.label}</p>
                <p className={`font-bold text-2xl ${s.color}`}>{s.value}</p>
                {s.sub && <p className={`text-sm mt-1 font-medium ${s.color} opacity-80`}>{s.sub}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Allocation Breakdown */}
            <div className="lg:col-span-2 bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Asset Allocation</h3>
              <div className="space-y-5">
                {summary.asset_allocation.map((alloc) => {
                  const colors = getTypeColor(alloc.investment_type);
                  return (
                    <div key={alloc.investment_type}>
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <span className="text-white font-medium capitalize">{alloc.investment_type.replace('_', ' ')}</span>
                          <span className="text-gray-500 text-xs ml-2">({alloc.count} assets)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-white font-bold">{formatCurrency(alloc.total_current_value)}</span>
                          <span className="text-gray-500 text-sm ml-2">{alloc.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                        <div className={`h-full ${colors.bg.replace('/10', '')} transition-all`} style={{ width: `${alloc.percentage}%` }} />
                      </div>
                      <div className="flex justify-between mt-1.5 text-xs">
                        <span className="text-gray-500">Invested: {formatCurrency(alloc.total_invested)}</span>
                        <span className={alloc.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {alloc.pnl >= 0 ? '+' : ''}{formatCurrency(alloc.pnl)} ({alloc.pnl_pct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top / Worst Performers */}
            <div className="space-y-6">
              <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="text-emerald-400"/> Top Performer</h3>
                {summary.best_performer ? (
                  <div>
                    <p className="text-white font-semibold line-clamp-1">{summary.best_performer.name}</p>
                    <p className="text-3xl font-bold text-emerald-400 mt-2">+{summary.best_performer.returns_pct}%</p>
                    <p className="text-gray-400 text-sm mt-1">Profit: {formatCurrency(summary.best_performer.pnl)}</p>
                  </div>
                ) : <p className="text-gray-500 text-sm">No data available</p>}
              </div>

              <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingDown className="text-red-400"/> Worst Performer</h3>
                {summary.worst_performer ? (
                  <div>
                    <p className="text-white font-semibold line-clamp-1">{summary.worst_performer.name}</p>
                    <p className="text-3xl font-bold text-red-400 mt-2">{summary.worst_performer.returns_pct}%</p>
                    <p className="text-gray-400 text-sm mt-1">Loss: {formatCurrency(summary.worst_performer.pnl)}</p>
                  </div>
                ) : <p className="text-gray-500 text-sm">No data available</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Market Opportunities Tab ── */}
      {activeTab === 'market' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input type="text" placeholder="Search by name, type, or source..." value={oppSearch} onChange={e => setOppSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={fetchOpportunities} disabled={loadingOpp} className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-300 text-sm font-medium transition-all">
              <RefreshCw size={15} className={loadingOpp ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {sources.map(src => <FilterPill key={src} label={src} active={activeSource === src} onClick={() => setActiveSource(src)} />)}
          </div>

          {loadingOpp ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[...Array(8)].map((_, i) => <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-52" />)}
            </div>
          ) : filteredOpp.length === 0 ? (
            <div className="py-20 text-center"><Globe className="mx-auto mb-4 text-gray-600" size={40} />
              <p className="text-gray-400">No opportunities found.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredOpp.map((opp, i) => (
                <OpportunityCard key={`${opp.source_website}-${opp.name}-${i}`} opp={opp} index={i} onAddToPortfolio={handleAddToPortfolio} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <InvestmentModal isOpen={isModalOpen} onClose={() => {setIsModalOpen(false); setPrefill(null);}} onSuccess={fetchData} prefill={prefill} editMode={editMode} />
        )}
      </AnimatePresence>
    </div>
  );
}
