import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (userId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (!userId) return;

    const wsUrl = `${(import.meta.env.VITE_API_URL || 'http://localhost:8000').replace('http', 'ws')}/ws/alerts/${userId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);

          if (data.type === 'alert' || data.type === 'budget_alert') {
            setAlerts(prev => {
              const updated = [{ ...data, id: Date.now(), read: false }, ...prev];
              return updated.slice(0, 50); // Keep last 50 alerts
            });
          } else if (data.type === 'alerts_batch') {
            setAlerts(prev => {
              const newAlerts = (data.alerts || []).map((a, i) => ({
                ...a, type: 'alert', id: Date.now() + i, read: false,
              }));
              return [...newAlerts, ...prev].slice(0, 50);
            });
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        reconnectRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error('WS connection error:', e);
    }
  }, [userId]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  const sendMessage = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const requestAlerts = useCallback(() => {
    sendMessage({ type: 'request_alerts' });
  }, [sendMessage]);

  const markAsRead = useCallback((alertId) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const unreadCount = alerts.filter(a => !a.read).length;

  return {
    isConnected,
    alerts,
    unreadCount,
    lastMessage,
    sendMessage,
    requestAlerts,
    markAsRead,
    clearAlerts,
  };
};

export default useWebSocket;
