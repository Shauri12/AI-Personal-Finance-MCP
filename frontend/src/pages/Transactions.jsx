import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, ArrowUpRight, ArrowDownRight, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TransactionModal = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    amount: '',
    transaction_type: 'expense',
    category: 'food',
    description: '',
    payment_method: 'upi',
  });
  const [loading, setLoading] = useState(false);

  const categories = {
    expense: ['food', 'transport', 'shopping', 'entertainment', 'utilities', 'rent', 'healthcare', 'education', 'travel', 'groceries', 'subscriptions', 'emi', 'insurance', 'other'],
    income: ['salary', 'freelance', 'investment_income', 'gift', 'other'],
    transfer: ['other']
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/finance/transactions', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      onSuccess();
      onClose();
      setFormData({ amount: '', transaction_type: 'expense', category: 'food', description: '', payment_method: 'upi' });
    } catch (error) {
      console.error('Error creating transaction:', error);
      const errorMsg = error.response?.data?.detail || error.message;
      alert(`Failed to create transaction: ${JSON.stringify(errorMsg)}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#16181e] border border-[#22252d] rounded-xl w-full max-w-md p-5 relative"
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-semibold text-white">Add Transaction</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3 p-1 bg-[#111318] rounded-lg border border-[#22252d]">
            {['expense', 'income'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, transaction_type: type, category: categories[type][0] })}
                className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
                  formData.transaction_type === type 
                    ? type === 'expense' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input 
                type="number" 
                name="amount"
                required
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={handleChange}
                className="w-full bg-[#111318] border border-[#2a2d37] rounded-lg pl-8 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input 
              type="text" 
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full bg-[#111318] border border-[#2a2d37] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors"
              placeholder="What was this for?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-[#111318] border border-[#2a2d37] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors capitalize"
              >
                {categories[formData.transaction_type]?.map(cat => (
                  <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Method</label>
              <select 
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                className="w-full bg-[#111318] border border-[#2a2d37] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors"
              >
                <option value="upi">UPI</option>
                <option value="credit_card">Credit Card</option>
                <option value="debit_card">Debit Card</option>
                <option value="cash">Cash</option>
                <option value="net_banking">Net Banking</option>
              </select>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#4f8ff7] hover:bg-[#3a7ce6] text-white font-medium rounded-lg py-2.5 mt-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Transaction'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/api/finance/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      await api.delete(`/api/finance/transactions/${id}`);
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.transaction_type === filterType;
    return matchesSearch && matchesType;
  });

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track your income and expenses</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 bg-[#4f8ff7] hover:bg-[#3a7ce6] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text" 
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#16181e] border border-[#22252d] rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors"
          />
        </div>
        <div className="flex bg-[#16181e] border border-[#22252d] rounded-lg p-0.5 shrink-0">
          {['all', 'expense', 'income'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                filterType === type 
                  ? 'bg-[#22252d] text-white' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#16181e] border border-[#22252d] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-[#22252d] rounded-full flex items-center justify-center mb-3">
              <Filter className="text-gray-600" size={20} />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">No transactions found</h3>
            <p className="text-gray-500 text-sm max-w-sm">Try adjusting your search or add a new transaction.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#22252d] text-xs text-gray-500">
                  <th className="px-5 py-3 font-medium">Transaction</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium text-right">Amount</th>
                  <th className="px-5 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22252d]/50">
                <AnimatePresence>
                  {filteredTransactions.map((t) => (
                    <motion.tr 
                      key={t.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            t.transaction_type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {t.transaction_type === 'income' ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}
                          </div>
                          <div>
                            <p className="text-sm text-white truncate max-w-[200px]">{t.description || 'Untitled'}</p>
                            <p className="text-[11px] text-gray-600 capitalize">{t.payment_method?.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-gray-400 bg-[#111318] border border-[#22252d] capitalize">
                          {t.category?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-gray-400">{formatDate(t.timestamp)}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <p className={`text-sm font-medium ${
                          t.transaction_type === 'income' ? 'text-emerald-400' : 'text-white'
                        }`}>
                          {t.transaction_type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-gray-600 hover:text-red-400 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <TransactionModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={fetchTransactions}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
