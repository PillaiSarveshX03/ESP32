import React, { useState } from 'react';
import { 
  Sparkles, 
  Flame, 
  Snowflake, 
  UserCheck, 
  UserX, 
  SunMedium, 
  ChevronDown, 
  ChevronUp,
  Sliders
} from 'lucide-react';

export function SimulatorPanel({ 
  systemState, 
  onSimulateTemp, 
  onSimulateHumidity, 
  onSimulateMotion, 
  onToggleSimulator 
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { temperature, humidity, motion, occupied, simulatorActive, espConnected } = systemState;

  if (espConnected) {
    return null; // When real ESP32 hardware is connected, hide simulator controls
  }

  return (
    <div className="glass-card" style={{
      marginTop: '24px',
      border: '1px solid rgba(56, 189, 248, 0.25)',
      background: 'rgba(15, 23, 42, 0.85)'
    }}>
      
      {/* Header */}
      <div 
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(56, 189, 248, 0.2)',
            color: 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Interactive Hardware Simulator</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Test & demonstrate smart damper reactions in real-time
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="badge-glass badge-blue" style={{ fontSize: '11px' }}>
            {simulatorActive ? 'Simulation Active' : 'Simulation Paused'}
          </span>
          <button className="btn-preset" style={{ padding: '4px 8px' }}>
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Quick Scenario Triggers */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                onSimulateTemp(30.5);
                onSimulateMotion(true);
              }}
              className="btn-preset"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: '#f43f5e', color: '#fb7185' }}
            >
              <Flame size={15} />
              <span>Hot Room (30.5°C) &rarr; Vent Opens</span>
            </button>

            <button
              onClick={() => {
                onSimulateTemp(19.0);
                onSimulateMotion(true);
              }}
              className="btn-preset"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: '#38bdf8', color: '#38bdf8' }}
            >
              <Snowflake size={15} />
              <span>Cold Draft (19.0°C) &rarr; Vent Throttles</span>
            </button>

            <button
              onClick={() => {
                onSimulateTemp(24.0);
                onSimulateMotion(true);
              }}
              className="btn-preset"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: '#10b981', color: '#34d399' }}
            >
              <SunMedium size={15} />
              <span>Balanced Climate (24.0°C)</span>
            </button>

            <button
              onClick={() => onSimulateMotion(true)}
              className="btn-preset"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: '#f59e0b', color: '#fbbf24' }}
            >
              <UserCheck size={15} />
              <span>Trigger Person Presence</span>
            </button>
          </div>

          {/* Sliders Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            {/* Temp Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Simulate Room Temperature</span>
                <span className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{Number(temperature).toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min="16"
                max="34"
                step="0.5"
                value={temperature}
                onChange={(e) => onSimulateTemp(Number(e.target.value))}
                className="custom-slider"
              />
            </div>

            {/* Humidity Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Simulate Relative Humidity</span>
                <span className="font-mono" style={{ fontWeight: 700, color: '#38bdf8' }}>{Number(humidity).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="90"
                step="1"
                value={humidity}
                onChange={(e) => onSimulateHumidity(Number(e.target.value))}
                className="custom-slider"
              />
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
