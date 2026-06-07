import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, TrendingUp, TrendingDown, Briefcase, X, Trash2,
  ExternalLink, Plus, Globe, RefreshCw, ChevronRight, Zap,
  AlertTriangle, Info, Edit, ListPlus, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TYPE_COLORS = {
  stocks: { bg: 'bg-[#4f8ff7]/10', text: 'text-[#4f8ff7]', border: 'border-[#4f8ff7]/20' },
  crypto: { bg: 'bg-[#f0b429]/10', text: 'text-[#f0b429]', border: 'border-[#f0b429]/20' },
  mutual_fund: { bg: 'bg-[#7c6bea]/10', text: 'text-[#7c6bea]', border: 'border-[#7c6bea]/20' },
  fixed_deposit: { bg: 'bg-[#34c77b]/10', text: 'text-[#34c77b]', border: 'border-[#34c77b]/20' },
  sip: { bg: 'bg-[#7c6bea]/10', text: 'text-[#7c6bea]', border: 'border-[#7c6bea]/20' },
  ppf: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  gold: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  bonds: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  real_estate: { bg: 'bg-[#e74c3c]/10', text: 'text-[#e74c3c]', border: 'border-[#e74c3c]/20' },
  nps: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
};

const getTypeColor = (type) => TYPE_COLORS[type] || { bg: 'bg-[#22252d]', text: 'text-gray-400', border: 'border-[#3a3d47]' };

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

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
    const current = parseFloat(formData.current_value);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d11]/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-[#16181e] border border-[#22252d] rounded-xl w-full max-w-md p-6 shadow-xl relative max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-lg font-semibold text-white">{editMode ? 'Edit Investment' : 'Add to Portfolio'}</h3>
            {!editMode && prefill && (
              <p className="text-xs text-gray-500 mt-0.5">From {prefill.source_website}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-md hover:bg-[#22252d]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Asset Name</label>
            <input
              type="text" name="name" required value={formData.name} onChange={handleChange}
              className="w-full bg-[#111318] border border-[#22252d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Asset Type</label>
              <select
                name="investment_type" value={formData.investment_type} onChange={handleChange}
                className="w-full bg-[#111318] border border-[#22252d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors capitalize"
              >
                {investmentTypes.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Platform</label>
              <input
                type="text" name="platform" value={formData.platform} onChange={handleChange}
                className="w-full bg-[#111318] border border-[#22252d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Amount Invested</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number" name="invested_amount" required min="0" step="0.01"
                  value={formData.invested_amount} onChange={handleChange} disabled={editMode && ['sip', 'mutual_fund'].includes(formData.investment_type)}
                  className="w-full bg-[#111318] border border-[#22252d] rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors disabled:opacity-50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Current Value</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number" name="current_value" required min="0" step="0.01"
                  value={formData.current_value} onChange={handleChange}
                  className="w-full bg-[#111318] border border-[#22252d] rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1 flex justify-between">
              <span>Risk Score</span>
              <span className="text-[#4f8ff7] font-medium">{formData.risk_score} / 10</span>
            </label>
            <input
              type="range" name="risk_score" min="1" max="10" step="1"
              value={formData.risk_score} onChange={handleChange}
              className="w-full h-1.5 bg-[#22252d] rounded-full appearance-none cursor-pointer accent-[#4f8ff7] mt-1"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Maturity Date (Optional)</label>
            <input
              type="date" name="maturity_date" value={formData.maturity_date} onChange={handleChange}
              className="w-full bg-[#111318] border border-[#22252d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-[#4f8ff7] hover:bg-[#3a7ce6] text-white font-medium rounded-lg py-2.5 mt-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : (editMode ? 'Save Changes' : 'Add to Portfolio')}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0c0d11]/80 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#16181e] border border-[#22252d] rounded-xl w-full max-w-sm p-5 relative"
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-semibold text-white">Add Installment</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input type="number" required min="1" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-[#111318] border border-[#22252d] rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7]" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Date</label>
            <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-[#111318] border border-[#22252d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7]" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-[#7c6bea] hover:bg-[#6b58e6] text-white font-medium rounded-lg py-2 mt-2">
            {loading ? 'Adding...' : 'Log Installment'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const OpportunityCard = ({ opp, onAddToPortfolio }) => {
  const colors = getTypeColor(opp.type);
  const isPositive = opp.change_pct >= 0;
  const isRateField = ['fixed_deposit', 'ppf', 'nps', 'bonds'].includes(opp.type);

  return (
    <div className="glass-card p-4 flex flex-col gap-3 transition-colors hover:border-[#3a3d47]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded uppercase ${colors.bg} ${colors.text} border ${colors.border}`}>
            {opp.type.replace(/_/g, ' ')}
          </span>
          <h4 className="text-white font-medium text-sm mt-1.5 leading-snug line-clamp-2" title={opp.name}>{opp.name}</h4>
        </div>
        <div className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isPositive ? '+' : ''}{opp.change_pct}%
        </div>
      </div>
      <div className="flex items-center justify-between bg-[#111318] rounded-md px-3 py-2 border border-[#22252d]">
        <span className="text-gray-500 text-xs">{isRateField ? 'Interest/Yield' : 'Price'}</span>
        <span className="text-white font-medium text-sm">{isRateField ? `${opp.change_pct}% p.a.` : opp.price}</span>
      </div>
      <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-1">
        <Globe size={12} /><span>{opp.source_website}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
        <a href={opp.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 bg-[#22252d] hover:bg-[#2a2d37] text-gray-300 text-xs font-medium rounded-lg py-2 transition-colors">
          <ExternalLink size={12} /> Invest
        </a>
        <button onClick={() => onAddToPortfolio(opp)} className="flex items-center justify-center gap-1.5 bg-[#4f8ff7]/10 hover:bg-[#4f8ff7]/20 text-[#4f8ff7] text-xs font-medium rounded-lg py-2 transition-colors border border-[#4f8ff7]/20">
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  );
};

const PortfolioCard = ({ inv, onEdit, onDelete }) => {
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
    <div className="glass-card p-4 flex flex-col h-full group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded uppercase mb-1.5 ${colors.bg} ${colors.text} border ${colors.border}`}>
            {inv.investment_type?.replace(/_/g, ' ')}
          </span>
          <h4 className="font-medium text-white text-sm pr-2">{inv.name}</h4>
          {inv.platform && <p className="text-xs text-gray-500 mt-0.5">{inv.platform}</p>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(inv)} className="p-1 text-gray-500 hover:text-[#4f8ff7]"><Edit size={14} /></button>
          <button onClick={() => onDelete(inv.id)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
        </div>
      </div>

      <div className="space-y-1.5 mt-auto bg-[#111318] p-3 rounded-md border border-[#22252d]">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Value</span>
          <span className="text-white font-medium text-sm">{formatCurrency(inv.current_value)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Invested</span>
          <span className="text-gray-400 text-xs">{formatCurrency(inv.invested_amount)}</span>
        </div>
        <div className="pt-1.5 mt-1.5 border-t border-[#22252d] flex justify-between items-center">
          <span className="text-xs text-gray-500">Returns</span>
          <span className={`flex items-center gap-1 text-xs font-medium ${inv.returns_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {inv.returns_pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {inv.returns_pct >= 0 ? '+' : ''}{inv.returns_pct?.toFixed(1)}%
          </span>
        </div>
      </div>

      {isSipEligible && (
        <div className="mt-3 pt-2 border-t border-[#22252d]">
          <button onClick={handleSipToggle} className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <span className="flex items-center gap-1.5"><ListPlus size={13} /> SIP Tracker</span>
            <ChevronRight size={13} className={`transform transition-transform ${showSip ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {showSip && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2 space-y-1.5">
                <button onClick={() => setIsSipModalOpen(true)} className="w-full text-xs py-1.5 bg-[#7c6bea]/10 text-[#7c6bea] hover:bg-[#7c6bea]/20 rounded border border-[#7c6bea]/20 flex items-center justify-center gap-1 transition-colors">
                  <Plus size={12} /> Add Installment
                </button>
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {sips.length === 0 ? (
                    <p className="text-[10px] text-center text-gray-600 py-1">No installments</p>
                  ) : sips.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-[10px] bg-[#111318] p-1.5 rounded border border-[#22252d] group/sip">
                      <div className="flex flex-col">
                        <span className="text-gray-300">{formatCurrency(s.amount)}</span>
                        <span className="text-gray-600">{new Date(s.date).toLocaleDateString()}</span>
                      </div>
                      <button onClick={() => handleDeleteSip(s.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover/sip:opacity-100 transition-opacity"><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {isSipModalOpen && (
        <SIPModal isOpen={isSipModalOpen} onClose={() => setIsSipModalOpen(false)} onSuccess={() => { fetchSips(); onEdit(); }} investmentId={inv.id} />
      )}
    </div>
  );
};

const FilterPill = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${active ? 'bg-[#4f8ff7] text-white' : 'bg-[#16181e] border border-[#22252d] text-gray-400 hover:text-gray-200'
    }`}
  >{label}</button>
);

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
  const [activeTab, setActiveTab] = useState('portfolio'); 

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
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Investments</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage portfolio and track market opportunities</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && activeTab !== 'market' && (
        <div className="flex flex-col gap-2">
          {alerts.slice(0, 2).map((a, i) => (
            <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${
              a.severity === 'critical' ? 'bg-red-500/10 border-red-500/20' :
              a.severity === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
              'bg-[#4f8ff7]/10 border-[#4f8ff7]/20'
              }`}>
              {a.severity === 'critical' ? <AlertTriangle className="text-red-400 mt-0.5" size={14} /> :
                a.severity === 'warning' ? <AlertTriangle className="text-yellow-400 mt-0.5" size={14} /> :
                  <Info className="text-[#4f8ff7] mt-0.5" size={14} />}
              <div>
                <p className={`text-sm font-medium ${a.severity === 'critical' ? 'text-red-400' : a.severity === 'warning' ? 'text-yellow-400' : 'text-[#4f8ff7]'}`}>
                  {a.message}
                </p>
                {a.action && <p className="text-xs mt-0.5 text-gray-400">{a.action}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#16181e] border border-[#22252d] rounded-lg p-1 w-fit overflow-x-auto">
        {[
          { id: 'portfolio', label: `Portfolio (${investments.length})` },
          { id: 'analytics', label: 'Analytics' },
          { id: 'market', label: 'Market' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab.id ? 'bg-[#22252d] text-white' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Portfolio Tab */}
      {activeTab === 'portfolio' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input type="text" placeholder="Search portfolio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#16181e] border border-[#22252d] rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7]" />
            </div>
            <button onClick={() => { setPrefill(null); setEditMode(false); setIsModalOpen(true); }} className="flex items-center justify-center gap-1.5 bg-[#4f8ff7] hover:bg-[#3a7ce6] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus size={14} /> Add Manual
            </button>
          </div>

          {loading ? (
            <div className="text-center text-gray-500 py-10 text-sm">Loading portfolio...</div>
          ) : filteredPortfolio.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center">
              <Briefcase className="text-gray-600 mb-3" size={24} />
              <h3 className="text-base font-medium text-white mb-1">Portfolio empty</h3>
              <p className="text-gray-500 text-sm">Add manual investments or browse the market.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPortfolio.map((inv, i) => (
                <PortfolioCard key={inv.id} inv={inv} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Value', value: formatCurrency(summary.total_current_value), color: 'text-white' },
              { label: 'Invested', value: formatCurrency(summary.total_invested), color: 'text-gray-400' },
              { label: 'Overall P&L', value: `${summary.total_pnl >= 0 ? '+' : ''}${formatCurrency(summary.total_pnl)}`, sub: `${summary.total_pnl_pct.toFixed(2)}%`, color: summary.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Risk Profile', value: summary.risk_label, sub: `${summary.avg_risk_score}/10`, color: 'text-[#4f8ff7]' },
            ].map((s, i) => (
              <div key={i} className="glass-card p-4">
                <p className="text-gray-500 text-xs mb-1">{s.label}</p>
                <p className={`font-semibold text-lg ${s.color}`}>{s.value}</p>
                {s.sub && <p className={`text-[10px] mt-0.5 ${s.color} opacity-80`}>{s.sub}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Asset Allocation</h3>
              <div className="space-y-4">
                {summary.asset_allocation.map((alloc) => {
                  const colors = getTypeColor(alloc.investment_type);
                  return (
                    <div key={alloc.investment_type}>
                      <div className="flex justify-between items-end mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-300 text-sm capitalize">{alloc.investment_type.replace('_', ' ')}</span>
                          <span className="text-gray-600 text-[10px]">({alloc.count})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-white font-medium text-sm">{formatCurrency(alloc.total_current_value)}</span>
                          <span className="text-gray-500 text-xs ml-1.5">{alloc.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-[#22252d] rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full ${colors.bg.replace('/10', '')} transition-all`} style={{ width: `${alloc.percentage}%` }} />
                      </div>
                      <div className="flex justify-between mt-1 text-[10px]">
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

            <div className="space-y-4">
              <div className="glass-card p-4">
                <h3 className="text-xs font-semibold text-gray-400 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider"><TrendingUp size={12} className="text-emerald-400" /> Top Performer</h3>
                {summary.best_performer ? (
                  <div>
                    <p className="text-white text-sm font-medium truncate">{summary.best_performer.name}</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">+{summary.best_performer.returns_pct}%</p>
                    <p className="text-gray-500 text-xs mt-0.5">Profit: {formatCurrency(summary.best_performer.pnl)}</p>
                  </div>
                ) : <p className="text-gray-600 text-xs">No data</p>}
              </div>

              <div className="glass-card p-4">
                <h3 className="text-xs font-semibold text-gray-400 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider"><TrendingDown size={12} className="text-red-400" /> Worst Performer</h3>
                {summary.worst_performer ? (
                  <div>
                    <p className="text-white text-sm font-medium truncate">{summary.worst_performer.name}</p>
                    <p className="text-xl font-bold text-red-400 mt-1">{summary.worst_performer.returns_pct}%</p>
                    <p className="text-gray-500 text-xs mt-0.5">Loss: {formatCurrency(summary.worst_performer.pnl)}</p>
                  </div>
                ) : <p className="text-gray-600 text-xs">No data</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Market Tab */}
      {activeTab === 'market' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input type="text" placeholder="Search opportunities..." value={oppSearch} onChange={e => setOppSearch(e.target.value)}
                className="w-full bg-[#16181e] border border-[#22252d] rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7]" />
            </div>
            <button onClick={fetchOpportunities} disabled={loadingOpp} className="flex items-center gap-1.5 px-3 py-2 bg-[#22252d] hover:bg-[#2a2d37] rounded-lg text-gray-300 text-sm font-medium transition-colors">
              <RefreshCw size={13} className={loadingOpp ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {sources.map(src => <FilterPill key={src} label={src} active={activeSource === src} onClick={() => setActiveSource(src)} />)}
          </div>

          {loadingOpp ? (
            <div className="text-center text-gray-500 py-10 text-sm">Loading market data...</div>
          ) : filteredOpp.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">No opportunities found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredOpp.map((opp, i) => (
                <OpportunityCard key={`${opp.source_website}-${opp.name}-${i}`} opp={opp} onAddToPortfolio={handleAddToPortfolio} />
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <InvestmentModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setPrefill(null); }} onSuccess={fetchData} prefill={prefill} editMode={editMode} />
        )}
      </AnimatePresence>
    </div>
  );
}
