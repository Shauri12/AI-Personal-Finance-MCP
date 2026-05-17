import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, TrendingUp, TrendingDown, Briefcase, X, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const InvestmentModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    investment_type: 'mutual_fund',
    invested_amount: '',
    current_value: '',
    platform: '',
    risk_score: '5'
  });
  const [loading, setLoading] = useState(false);

  const investmentTypes = [
    'mutual_fund', 'stocks', 'sip', 'fixed_deposit', 
    'ppf', 'nps', 'gold', 'crypto', 'bonds', 'real_estate'
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const invested = parseFloat(formData.invested_amount);
    const current = parseFloat(formData.current_value);
    let returns_pct = 0;
    if (invested > 0) {
      returns_pct = ((current - invested) / invested) * 100;
    }

    try {
      await api.post('/api/finance/investments', {
        ...formData,
        invested_amount: invested,
        current_value: current,
        returns_pct: parseFloat(returns_pct.toFixed(2)),
        risk_score: parseFloat(formData.risk_score)
      });
      onSuccess();
      onClose();
      setFormData({
        name: '',
        investment_type: 'mutual_fund',
        invested_amount: '',
        current_value: '',
        platform: '',
        risk_score: '5'
      });
    } catch (error) {
      console.error('Error creating investment:', error);
      alert('Failed to create investment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Add Investment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Asset Name</label>
            <input 
              type="text" 
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="e.g. S&P 500 Index Fund"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Asset Type</label>
              <select 
                name="investment_type"
                value={formData.investment_type}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all capitalize"
              >
                {investmentTypes.map(type => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Platform/Broker</label>
              <input 
                type="text" 
                name="platform"
                value={formData.platform}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="e.g. Vanguard"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Invested Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input 
                  type="number" 
                  name="invested_amount"
                  required
                  step="0.01"
                  min="0"
                  value={formData.invested_amount}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Current Value</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input 
                  type="number" 
                  name="current_value"
                  required
                  step="0.01"
                  min="0"
                  value={formData.current_value}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1 flex justify-between">
              <span>Risk Score (1-10)</span>
              <span className="text-blue-400 font-bold">{formData.risk_score}</span>
            </label>
            <input 
              type="range" 
              name="risk_score"
              min="1"
              max="10"
              step="1"
              value={formData.risk_score}
              onChange={handleChange}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Low Risk</span>
              <span>High Risk</span>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2.5 mt-6 transition-colors disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Investment'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default function Investments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInvestments = async () => {
    try {
      const response = await api.get('/api/finance/investments');
      setInvestments(response.data);
    } catch (error) {
      console.error('Error fetching investments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInvestments();
    }
  }, [user]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this investment?')) return;
    
    try {
      await api.delete(`/api/finance/investments/${id}`);
      fetchInvestments();
    } catch (error) {
      console.error('Error deleting investment:', error);
      alert('Failed to delete investment');
    }
  };

  const filteredInvestments = investments.filter(i => 
    (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.platform || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalInvested = investments.reduce((sum, item) => sum + item.invested_amount, 0);
  const totalCurrent = investments.reduce((sum, item) => sum + item.current_value, 0);
  const totalReturns = totalCurrent - totalInvested;
  const totalReturnsPct = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Investments</h1>
          <p className="text-gray-400 mt-1">Track and grow your portfolio across multiple asset classes.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
        >
          <Plus size={18} />
          <span>Add Investment</span>
        </button>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="text-gray-400 text-sm font-medium mb-1">Total Portfolio Value</div>
          <div className="text-3xl font-bold text-white">{formatCurrency(totalCurrent)}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="text-gray-400 text-sm font-medium mb-1">Total Invested</div>
          <div className="text-2xl font-bold text-gray-300">{formatCurrency(totalInvested)}</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="text-gray-400 text-sm font-medium mb-1">Total Returns</div>
          <div className={`text-2xl font-bold flex items-center gap-2 ${totalReturns >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalReturns >= 0 ? '+' : ''}{formatCurrency(totalReturns)}
            <span className="text-sm px-2 py-1 rounded-md bg-black/20">
              {totalReturns >= 0 ? '+' : ''}{totalReturnsPct.toFixed(2)}%
            </span>
          </div>
          {totalReturns >= 0 ? (
            <TrendingUp className="absolute -right-4 -bottom-4 text-emerald-500/10 w-24 h-24" />
          ) : (
            <TrendingDown className="absolute -right-4 -bottom-4 text-red-500/10 w-24 h-24" />
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search investments by name or platform..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Investments List */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading portfolio...</div>
        ) : filteredInvestments.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Briefcase className="text-gray-500" size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No investments found</h3>
            <p className="text-gray-400 max-w-md">Start tracking your wealth by adding an asset to your portfolio.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            <AnimatePresence>
              {filteredInvestments.map((inv) => (
                <motion.div 
                  key={inv.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-colors group relative"
                >
                  <button 
                    onClick={() => handleDelete(inv.id)}
                    className="absolute top-4 right-4 p-2 bg-gray-900/80 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm z-10"
                    title="Delete investment"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-lg text-white truncate max-w-[200px]" title={inv.name}>{inv.name}</h4>
                      <div className="flex gap-2 mt-1 text-xs">
                        <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded capitalize">{inv.investment_type?.replace('_', ' ')}</span>
                        {inv.platform && <span className="px-2 py-0.5 border border-gray-700 text-gray-400 rounded">{inv.platform}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mt-6">
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-gray-400">Current Value</span>
                      <span className="text-lg font-bold text-white">{formatCurrency(inv.current_value)}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-gray-400">Invested Amount</span>
                      <span className="text-sm font-medium text-gray-300">{formatCurrency(inv.invested_amount)}</span>
                    </div>
                    
                    <div className="pt-3 mt-3 border-t border-gray-700 flex justify-between items-center">
                      <span className="text-sm text-gray-400">Total Return</span>
                      <div className={`flex items-center gap-1 font-semibold ${inv.returns_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {inv.returns_pct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {inv.returns_pct >= 0 ? '+' : ''}{inv.returns_pct}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <InvestmentModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={fetchInvestments}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
