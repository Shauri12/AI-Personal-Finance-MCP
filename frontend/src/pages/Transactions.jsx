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
      alert('Failed to create transaction');
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
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Add Transaction</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 p-1 bg-gray-800 rounded-lg">
            {['expense', 'income'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, transaction_type: type, category: categories[type][0] })}
                className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
                  formData.transaction_type === type 
                    ? type === 'expense' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
              <input 
                type="number" 
                name="amount"
                required
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <input 
              type="text" 
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              placeholder="What was this for?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all capitalize"
              >
                {categories[formData.transaction_type]?.map(cat => (
                  <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Method</label>
              <select 
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2.5 mt-6 transition-colors disabled:opacity-50"
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
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Transactions</h1>
          <p className="text-gray-400 mt-1">Manage and track your daily expenses and income.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
        >
          <Plus size={18} />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 shrink-0">
          {['all', 'expense', 'income'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                filterType === type 
                  ? 'bg-gray-800 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Filter className="text-gray-500" size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No transactions found</h3>
            <p className="text-gray-400 max-w-md">Try adjusting your search or filters, or add a new transaction to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-4 font-medium">Transaction</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium text-right">Amount</th>
                  <th className="px-6 py-4 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                <AnimatePresence>
                  {filteredTransactions.map((t) => (
                    <motion.tr 
                      key={t.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            t.transaction_type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {t.transaction_type === 'income' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                          </div>
                          <div>
                            <p className="font-medium text-white truncate max-w-[200px]">{t.description || 'Untitled Transaction'}</p>
                            <p className="text-xs text-gray-500 capitalize">{t.payment_method?.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-800 text-gray-300 capitalize border border-gray-700">
                          {t.category?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-300">{formatDate(t.timestamp)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className={`font-semibold ${
                          t.transaction_type === 'income' ? 'text-emerald-400' : 'text-white'
                        }`}>
                          {t.transaction_type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete transaction"
                        >
                          <Trash2 size={16} />
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
