import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_WS_URL = `ws://${window.location.hostname}:5000/ws/client`;

export function useWebSocket(url = DEFAULT_WS_URL) {
  const [wsStatus, setWsStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected'
  const [systemState, setSystemState] = useState({
    temperature: null,
    humidity: null,
    heatIndex: null,
    motion: false,
    occupied: false,
    servoAngle: 0,
    mode: 'AUTO',
    targetTemp: 24.0,
    ecoAngle: 0,
    rssi: null,
    uptime: 0,
    lastSeen: null,
    espConnected: false,
    simulatorActive: false,
    clientCount: 1,
    history: []
  });

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isDestroyedRef = useRef(false);

  const connect = useCallback(() => {
    if (isDestroyedRef.current) return;

    // Clear any existing pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Cleanly close any existing socket and remove its old handlers
    if (wsRef.current) {
      const oldWs = wsRef.current;
      oldWs.onopen = null;
      oldWs.onmessage = null;
      oldWs.onclose = null;
      oldWs.onerror = null;
      if (oldWs.readyState === WebSocket.OPEN || oldWs.readyState === WebSocket.CONNECTING) {
        oldWs.close();
      }
      wsRef.current = null;
    }

    try {
      setWsStatus('connecting');
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isDestroyedRef.current || wsRef.current !== ws) {
          ws.close();
          return;
        }
        console.log('[WS Hook] ✅ Connected to Backend Relay Server');
        setWsStatus('connected');
      };

      ws.onmessage = (event) => {
        if (isDestroyedRef.current || wsRef.current !== ws) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'state_update' || payload.type === 'initial_state') {
            setSystemState(prev => ({
              ...prev,
              ...payload.data,
              history: payload.data.history && payload.data.history.length > 0 
                ? payload.data.history 
                : prev.history
            }));
          }
        } catch (e) {
          console.error('[WS Hook] Error parsing message payload:', e);
        }
      };

      ws.onclose = () => {
        if (isDestroyedRef.current || wsRef.current !== ws) return;
        console.log('[WS Hook] ⚠️ Connection dropped. Reconnecting in 3s...');
        setWsStatus('disconnected');
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (err) => {
        if (isDestroyedRef.current || wsRef.current !== ws) return;
        console.warn('[WS Hook] Socket error detected');
        // Let onclose handle reconnect
      };
    } catch (e) {
      console.error('[WS Hook] Failed to create WebSocket connection:', e);
      setWsStatus('disconnected');
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    }
  }, [url]);

  useEffect(() => {
    isDestroyedRef.current = false;
    connect();

    return () => {
      isDestroyedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        const ws = wsRef.current;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Send JSON command over WebSocket
  const sendCommand = useCallback((commandObj) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(commandObj));
      return true;
    } else {
      console.warn('[WS Hook] Cannot send, WebSocket not open:', commandObj);
      return false;
    }
  }, []);

  return {
    wsStatus,
    systemState,
    sendCommand,
    reconnect: connect
  };
}
