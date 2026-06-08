import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Plus, Edit, Trash2, X, PlusCircle, AlertCircle, Calendar,
  Briefcase, Car, Home, Plane, HeartPulse, GraduationCap, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const CATEGORY_ICONS = {
  general: Target,
  emergency: HeartPulse,
  vacation: Plane,
  car: Car,
  education: GraduationCap,
  house: Home,
  retirement: Briefcase
};

const PRIORITY_COLORS = {
  low: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
  medium: { bg: 'bg-[#f0b429]/10', text: 'text-[#f0b429]', border: 'border-[#f0b429]/20' },
  high: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' }
};

const GoalModal = ({ isOpen, onClose, onSuccess, prefill = null }) => {
  const defaultForm = {
    name: '', description: '', target_amount: '', current_amount: '0',
    target_date: '', category: 'general', priority: 'medium'
  };

  const [formData, setFormData] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const editMode = !!prefill;

  useEffect(() => {
    if (prefill) {
      setFormData({
        name: prefill.name,
        description: prefill.description || '',
        target_amount: prefill.target_amount,
        current_amount: prefill.current_amount,
        target_date: prefill.target_date ? prefill.target_date.split('T')[0] : '',
        category: prefill.category || 'general',
        priority: prefill.priority || 'medium'
      });
    } else {
      setFormData(defaultForm);
    }
  }, [prefill, isOpen]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = {
      ...formData,
      target_amount: parseFloat(formData.target_amount),
      current_amount: parseFloat(formData.current_amount || 0),
      target_date: formData.target_date ? new Date(formData.target_date).toISOString() : new Date().toISOString()
    };

    try {
      if (editMode) {
        await api.put(`/api/finance/goals/${prefill.id}`, payload);
      } else {
        await api.post('/api/finance/goals', payload);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Goal save error', error);
      alert(`Failed to ${editMode ? 'update' : 'add'} goal.`);
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
          <h3 className="text-lg font-semibold text-white">{editMode ? 'Edit Goal' : 'Create New Goal'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded-md hover:bg-[#22252d] transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Goal Name</label>
            <input
              type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g., Buy a new car"
              className="w-full bg-[#111318] border border-[#22252d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description (Optional)</label>
            <textarea
              name="description" value={formData.description} onChange={handleChange} rows="2"
              className="w-full bg-[#111318] border border-[#22252d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Target Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number" name="target_amount" required min="1" step="0.01" value={formData.target_amount} onChange={handleChange}
                  className="w-full bg-[#111318] border border-[#22252d] rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Current Savings</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                <input
                  type="number" name="current_amount" min="0" step="0.01" value={formData.current_amount} onChange={handleChange}
                  className="w-full bg-[#111318] border border-[#22252d] rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <select
                name="category" value={formData.category} onChange={handleChange}
                className="w-full bg-[#111318] border border-[#22252d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors capitalize"
              >
                {Object.keys(CATEGORY_ICONS).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Priority</label>
              <select
                name="priority" value={formData.priority} onChange={handleChange}
                className="w-full bg-[#111318] border border-[#22252d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Target Date</label>
            <input
              type="date" name="target_date" required value={formData.target_date} onChange={handleChange}
              className="w-full bg-[#111318] border border-[#22252d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7] transition-colors"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-[#4f8ff7] hover:bg-[#3a7ce6] text-white font-medium rounded-lg py-2.5 mt-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : (editMode ? 'Save Changes' : 'Create Goal')}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const AddFundsModal = ({ isOpen, onClose, onSuccess, goal }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const added = parseFloat(amount);
      await api.put(`/api/finance/goals/${goal.id}`, {
        current_amount: goal.current_amount + added
      });
      onSuccess();
      onClose();
    } catch {
      alert('Failed to add funds');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !goal) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0c0d11]/80 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#16181e] border border-[#22252d] rounded-xl w-full max-w-sm p-5 relative"
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-semibold text-white">Add Funds to {goal.name}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Amount to Add</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input type="number" required min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#111318] border border-[#22252d] rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#4f8ff7]" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              New total will be: <span className="text-gray-300">{formatCurrency(goal.current_amount + (parseFloat(amount) || 0))}</span>
            </p>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-[#34c77b] hover:bg-[#2eaa69] text-white font-medium rounded-lg py-2 mt-2">
            {loading ? 'Adding...' : 'Confirm'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const GoalCard = ({ goal, onEdit, onDelete, onAddFunds }) => {
  const Icon = CATEGORY_ICONS[goal.category] || Target;
  const priorityStyle = PRIORITY_COLORS[goal.priority] || PRIORITY_COLORS.medium;
  const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  const isCompleted = progress >= 100;

  // Calculate days left
  const targetDate = new Date(goal.target_date);
  const daysLeft = Math.ceil((targetDate - new Date()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysLeft < 0 && !isCompleted;

  return (
    <div className={`glass-card p-5 flex flex-col h-full group transition-all duration-300 ${isCompleted ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#4f8ff7]/10 text-[#4f8ff7]'}`}>
            <Icon size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-white">{goal.name}</h4>
            <span className={`inline-flex mt-1 items-center text-[10px] font-medium px-1.5 py-0.5 rounded uppercase ${priorityStyle.bg} ${priorityStyle.text} border ${priorityStyle.border}`}>
              {goal.priority} Priority
            </span>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(goal)} className="p-1 text-gray-500 hover:text-[#4f8ff7]"><Edit size={14} /></button>
          <button onClick={() => onDelete(goal.id)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
        </div>
      </div>

      {goal.description && (
        <p className="text-xs text-gray-400 mb-4 line-clamp-2">{goal.description}</p>
      )}

      <div className="mt-auto space-y-4">
        <div className="bg-[#111318] p-3 rounded-lg border border-[#22252d]">
          <div className="flex justify-between items-end mb-1.5">
            <div>
              <span className="text-xl font-bold text-white">{formatCurrency(goal.current_amount)}</span>
              <span className="text-xs text-gray-500 ml-1.5">/ {formatCurrency(goal.target_amount)}</span>
            </div>
            <span className={`font-semibold text-sm ${isCompleted ? 'text-emerald-400' : 'text-[#4f8ff7]'}`}>
              {progress.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2 bg-[#22252d] rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500' : 'bg-[#4f8ff7]'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Calendar size={13} />
            <span>{formatDate(goal.target_date)}</span>
          </div>
          {!isCompleted && (
            <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
              {isOverdue ? <AlertCircle size={13} /> : null}
              {isOverdue ? 'Overdue' : `${daysLeft} days left`}
            </div>
          )}
          {isCompleted && (
            <span className="text-emerald-400 font-medium flex items-center gap-1"><Target size={13}/> Achieved</span>
          )}
        </div>

        {!isCompleted && (
          <button 
            onClick={() => onAddFunds(goal)}
            className="w-full py-2 bg-[#22252d] hover:bg-[#2a2d37] border border-[#3a3d47] rounded-lg text-sm font-medium text-gray-300 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <PlusCircle size={15} className="text-[#34c77b]" /> Add Funds
          </button>
        )}
      </div>
    </div>
  );
};

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const fetchGoals = async () => {
    try {
      const response = await api.get('/api/finance/goals');
      setGoals(response.data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await api.delete(`/api/finance/goals/${id}`);
      fetchGoals();
    } catch {
      alert('Failed to delete goal');
    }
  };

  const handleEdit = (goal) => {
    setPrefill(goal);
    setIsModalOpen(true);
  };

  const handleAddFunds = (goal) => {
    setSelectedGoal(goal);
    setIsFundModalOpen(true);
  };

  const completedGoals = goals.filter(g => g.current_amount >= g.target_amount).length;
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Goals</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track and manage your savings targets</p>
        </div>
        <button 
          onClick={() => { setPrefill(null); setIsModalOpen(true); }}
          className="flex items-center gap-1.5 bg-[#4f8ff7] hover:bg-[#3a7ce6] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          <span>Create Goal</span>
        </button>
      </div>

      {/* Summary Row */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-lg"><Target size={24} /></div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Active Goals</p>
              <p className="text-xl font-bold text-white">{goals.length}</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="p-3 bg-[#4f8ff7]/10 text-[#4f8ff7] rounded-lg"><HeartPulse size={24} /></div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Total Saved</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totalSaved)}</p>
              <p className="text-[10px] text-gray-500">of {formatCurrency(totalTarget)}</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg"><CheckCircle2 size={24} /></div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Completed</p>
              <p className="text-xl font-bold text-white">{completedGoals}</p>
            </div>
          </div>
        </div>
      )}

      {/* Goals Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center glass-card">
          <div className="w-16 h-16 bg-[#22252d] rounded-full flex items-center justify-center mb-4">
            <Target className="text-gray-500" size={28} />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No goals set yet</h3>
          <p className="text-gray-500 max-w-sm mb-6">Setting financial goals helps you stay motivated and track your savings progress.</p>
          <button 
            onClick={() => { setPrefill(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-[#16181e] border border-[#3a3d47] hover:border-[#4f8ff7] hover:text-[#4f8ff7] text-gray-300 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {goals.map((goal) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <GoalCard 
                  goal={goal} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
                  onAddFunds={handleAddFunds}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <GoalModal 
            isOpen={isModalOpen} 
            onClose={() => { setIsModalOpen(false); setPrefill(null); }} 
            onSuccess={fetchGoals} 
            prefill={prefill}
          />
        )}
        {isFundModalOpen && (
          <AddFundsModal
            isOpen={isFundModalOpen}
            onClose={() => { setIsFundModalOpen(false); setSelectedGoal(null); }}
            onSuccess={fetchGoals}
            goal={selectedGoal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
