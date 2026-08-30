import React, { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Header } from './components/Header';
import { ClimateCard } from './components/ClimateCard';
import { VentControlCard } from './components/VentControlCard';
import { OccupancyCard } from './components/OccupancyCard';
import { TelemetryChart } from './components/TelemetryChart';
import { SettingsModal } from './components/SettingsModal';
import { Cpu, AlertCircle, Sparkles, Wifi } from 'lucide-react';

export function App() {
  const { wsStatus, systemState, sendCommand, reconnect } = useWebSocket();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Command dispatchers
  const handleSetMode = (mode) => {
    sendCommand({ action: 'set_mode', mode });
  };

  const handleSetServoAngle = (angle) => {
    sendCommand({ action: 'set_servo', angle });
  };

  const handleUpdateTargetTemp = (targetTemp) => {
    sendCommand({ action: 'set_target_temp', targetTemp });
  };

  const handleTriggerMockMotion = () => {
    sendCommand({ action: 'simulate_motion', motion: true });
    setTimeout(() => {
      sendCommand({ action: 'simulate_motion', motion: false });
    }, 3500);
  };

  const handleSaveSettings = (settings) => {
    if (settings.targetTemp !== undefined) {
      sendCommand({ action: 'set_target_temp', targetTemp: settings.targetTemp });
    }
    if (settings.ecoAngle !== undefined) {
      sendCommand({ action: 'set_eco_angle', ecoAngle: settings.ecoAngle });
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        systemState={systemState}
        wsStatus={wsStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReconnect={reconnect}
      />

      {/* Standby / Awaiting Hardware Notification Banner */}
      {!systemState.espConnected && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Cpu size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fbbf24' }}>
                  System Standby • Awaiting ESP32 Hardware Connection
                </h3>
                <span className="badge-glass badge-amber" style={{ fontSize: '10px' }}>
                  Auto-Activates On Connect
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Flash <span className="font-mono" style={{ color: '#ffffff' }}>smart_vent_firmware.ino</span> to your ESP32 with server host IP. Real-time telemetry & damper controls will activate automatically!
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-dim)', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              ws://&lt;PC_IP&gt;:5000/ws/esp32
            </span>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Climate Card (DHT11 Telemetry & Heat Index) */}
        <ClimateCard
          systemState={systemState}
          onUpdateTargetTemp={handleUpdateTargetTemp}
        />

        {/* Vent Damper Card (Servo Control & Auto/Manual) */}
        <VentControlCard
          systemState={systemState}
          onSetMode={handleSetMode}
          onSetServoAngle={handleSetServoAngle}
        />

        {/* Real-time Rolling Telemetry Chart */}
        <TelemetryChart
          history={systemState.history}
          espConnected={systemState.espConnected}
        />

        {/* PIR Occupancy Sensor & Eco Countdown */}
        <OccupancyCard
          systemState={systemState}
          onTriggerMockMotion={handleTriggerMockMotion}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        systemState={systemState}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}

export default App;
