import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, ShieldAlert, AlertTriangle, Info, X, Check,
  Wifi, WifiOff, ChevronDown, ChevronUp, Trash2
} from 'lucide-react';
import useWebSocket from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';

const severityConfig = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: ShieldAlert, glow: 'shadow-red-500/20' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertTriangle, glow: 'shadow-orange-500/20' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: AlertTriangle, glow: 'shadow-yellow-500/20' },
  low: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Info, glow: 'shadow-blue-500/20' },
};

const AnomalyAlerts = () => {
  const { user } = useAuth();
  const { isConnected, alerts, unreadCount, markAsRead, clearAlerts } = useWebSocket(user?.id);
  const [isExpanded, setIsExpanded] = useState(false);
  const [manualAlerts, setManualAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch anomalies from API on mount
  useEffect(() => {
    const fetchAnomalies = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/ai/anomalies`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const mapped = (data.anomalies || []).slice(0, 8).map((a, i) => ({
            id: `api-${i}`,
            severity: a.severity || 'medium',
            message: a.reason || `Unusual ₹${a.amount?.toLocaleString()} transaction`,
            agent: 'Fraud Detection',
            type: 'anomaly',
            read: false,
            merchant: a.merchant,
            amount: a.amount,
            category: a.category,
            date: a.date,
          }));
          setManualAlerts(mapped);
        }
      } catch (e) {
        console.error('Failed to fetch anomalies:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnomalies();
  }, []);

  const allAlerts = [...alerts, ...manualAlerts];
  const totalUnread = allAlerts.filter(a => !a.read).length;

  if (allAlerts.length === 0 && !loading) {
    return (
      <div className="glass-card p-4 flex items-center gap-3 border-emerald-500/20">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <Check size={16} className="text-emerald-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-400">All Clear</p>
          <p className="text-[10px] text-gray-500">No anomalies detected</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {isConnected ? <Wifi size={12} className="text-emerald-500" /> : <WifiOff size={12} className="text-red-500" />}
          <span className="text-[9px] text-gray-500">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden border-white/10">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Bell size={16} className="text-red-400" />
            </div>
            {totalUnread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
              >
                {totalUnread}
              </motion.span>
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">Anomaly Alerts</p>
            <p className="text-[10px] text-gray-500">{allAlerts.length} alert{allAlerts.length !== 1 ? 's' : ''} detected</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {isConnected ? <Wifi size={10} className="text-emerald-500" /> : <WifiOff size={10} className="text-red-500" />}
            <span className="text-[8px] text-gray-500 uppercase tracking-wider">{isConnected ? 'LIVE' : 'OFF'}</span>
          </div>
          {isExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </button>

      {/* Alert List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/5"
          >
            <div className="max-h-[300px] overflow-y-auto">
              {loading && (
                <div className="p-4 text-center text-gray-500 text-xs animate-pulse">Scanning transactions...</div>
              )}
              {allAlerts.map((alert, i) => {
                const cfg = severityConfig[alert.severity] || severityConfig.low;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={alert.id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-3 border-b border-white/5 flex items-start gap-3 hover:bg-white/5 transition-colors ${alert.read ? 'opacity-60' : ''}`}
                    onClick={() => markAsRead(alert.id)}
                  >
                    <div className={`w-6 h-6 rounded-md ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon size={12} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white leading-snug">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color} font-bold uppercase`}>
                          {alert.severity}
                        </span>
                        {alert.agent && (
                          <span className="text-[9px] text-gray-500">{alert.agent}</span>
                        )}
                        {alert.amount && (
                          <span className="text-[9px] text-gray-400">₹{alert.amount.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    {!alert.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </motion.div>
                );
              })}
            </div>

            {allAlerts.length > 0 && (
              <div className="p-2 border-t border-white/5 flex justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); clearAlerts(); setManualAlerts([]); }}
                  className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
                >
                  <Trash2 size={10} /> Clear All
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnomalyAlerts;
