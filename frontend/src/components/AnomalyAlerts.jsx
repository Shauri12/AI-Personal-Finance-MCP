import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Info, X } from 'lucide-react';
import api from '../api/client';

const AnomalyAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get('/api/finance/anomalies');
        setAlerts(res.data);
      } catch (err) {
        console.error('Failed to fetch anomalies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  const dismissAlert = (id) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  if (loading) {
    return <div className="text-gray-500 text-xs py-2">Checking for anomalies...</div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="glass-card p-4 text-center">
        <p className="text-gray-500 text-xs">No unusual activity detected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div 
          key={alert.id}
          className={`relative p-3 rounded-lg border flex gap-2.5 items-start ${
            alert.severity === 'high' 
              ? 'bg-red-500/10 border-red-500/20' 
              : alert.severity === 'medium'
              ? 'bg-yellow-500/10 border-yellow-500/20'
              : 'bg-[#4f8ff7]/10 border-[#4f8ff7]/20'
          }`}
        >
          {alert.severity === 'high' ? (
            <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
          ) : alert.severity === 'medium' ? (
            <TrendingUp size={16} className="text-yellow-400 mt-0.5 shrink-0" />
          ) : (
            <Info size={16} className="text-[#4f8ff7] mt-0.5 shrink-0" />
          )}
          
          <div className="flex-1 min-w-0 pr-4">
            <h4 className={`text-xs font-semibold ${
              alert.severity === 'high' ? 'text-red-400' 
              : alert.severity === 'medium' ? 'text-yellow-400' 
              : 'text-[#4f8ff7]'
            }`}>
              {alert.title}
            </h4>
            <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">
              {alert.description}
            </p>
            <span className="text-[9px] text-gray-500 block mt-1">
              {new Date(alert.detected_at).toLocaleDateString()}
            </span>
          </div>

          <button 
            onClick={() => dismissAlert(alert.id)}
            className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default AnomalyAlerts;
