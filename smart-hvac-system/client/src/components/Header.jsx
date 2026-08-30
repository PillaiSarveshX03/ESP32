import React from 'react';
import {
  Wifi,
  WifiOff,
  Cpu,
  Sliders,
  Sparkles,
  RefreshCw,
  Activity,
  Wind,
  ShieldCheck
} from 'lucide-react';

export function Header({
  systemState,
  wsStatus,
  onOpenSettings,
  onToggleSimulator,
  onReconnect
}) {
  const { espConnected, simulatorActive, rssi, clientCount } = systemState;

  // Signal strength indicator
  const getRssiBars = (dbm) => {
    if (!espConnected && !simulatorActive) return 0;
    if (dbm >= -60) return 4;
    if (dbm >= -70) return 3;
    if (dbm >= -80) return 2;
    return 1;
  };

  const signalBars = getRssiBars(rssi);

  return (
    <header className="glass-card" style={{ padding: '16px 24px', marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)',
            color: '#080c14'
          }}>
            <Wind size={26} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Project AeroFlow V1
              </h1>
              <span className="badge-glass badge-blue" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                v1.0 ESP32
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Autonomous Climate & Smart Damper Vent System
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

          {/* WebSocket Relay Status */}
          <div className={`badge-glass ${wsStatus === 'connected' ? 'badge-green' : wsStatus === 'connecting' ? 'badge-amber' : 'badge-rose'}`}>
            <span className="animate-pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: wsStatus === 'connected' ? '#10b981' : wsStatus === 'connecting' ? '#f59e0b' : '#f43f5e' }}></span>
            <span>Relay: {wsStatus === 'connected' ? 'Connected' : wsStatus === 'connecting' ? 'Connecting...' : 'Offline'}</span>
          </div>

          {/* Hardware Status Indicator */}
          {espConnected ? (
            <div className="badge-glass badge-green" title={`ESP32 Hardware Online • RSSI: ${rssi || '--'} dBm`}>
              <Cpu size={14} />
              <span>ESP32 Online & Active</span>
              <div style={{ display: 'flex', gap: '2px', marginLeft: '4px', alignItems: 'flex-end', height: '12px' }}>
                {[1, 2, 3, 4].map(bar => (
                  <span
                    key={bar}
                    style={{
                      width: '3px',
                      height: `${bar * 3}px`,
                      borderRadius: '1px',
                      background: bar <= signalBars ? '#34d399' : 'rgba(255,255,255,0.2)'
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="badge-glass badge-amber" title="Awaiting physical ESP32 to connect to /ws/esp32">
              <span className="animate-pulse-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b' }}></span>
              <Cpu size={14} />
              <span>ESP32 Disconnected (Standby)</span>
            </div>
          )}

          {/* Settings & Controls */}
          <button
            onClick={onOpenSettings}
            className="btn-preset"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Configure System Thresholds & Parameters"
          >
            <Sliders size={16} />
            <span>Settings</span>
          </button>

          {wsStatus === 'disconnected' && (
            <button
              onClick={onReconnect}
              className="btn-preset"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: '#f43f5e', color: '#fb7185' }}
            >
              <RefreshCw size={14} />
              <span>Reconnect</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
