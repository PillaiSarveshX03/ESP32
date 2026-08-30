import React from 'react';
import { 
  Gauge, 
  RotateCw, 
  Power, 
  Wind, 
  Cpu, 
  HandMetal,
  CheckCircle2
} from 'lucide-react';

export function VentControlCard({ systemState, onSetMode, onSetServoAngle }) {
  const { servoAngle, mode, occupied, espConnected } = systemState;
  const isAuto = mode === 'AUTO';
  const isOnline = espConnected;

  // Compute damper opening percentage
  const openPercentage = isOnline ? Math.round((servoAngle / 180) * 100) : 0;
  const displayAngle = isOnline ? servoAngle : 0;

  // SVG Damper Blade visualization angle
  const bladeRotation = (displayAngle / 180) * 90;

  const presets = [
    { label: '0° Eco', angle: 0 },
    { label: '45° Low', angle: 45 },
    { label: '90° Bal', angle: 90 },
    { label: '135° High', angle: 135 },
    { label: '180° Max', angle: 180 }
  ];

  return (
    <div className="glass-card" style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Card Header & Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: isOnline ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: isOnline ? '#818cf8' : 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Gauge size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Smart Vent Damper</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {isOnline ? 'SG90 / MG995 PWM Servo Actuator' : 'Awaiting ESP32 Actuator...'}
            </p>
          </div>
        </div>

        {/* Mode Toggle Button */}
        <div style={{
          display: 'flex',
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '3px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          opacity: isOnline ? 1 : 0.5
        }}>
          <button
            onClick={() => isOnline && onSetMode('AUTO')}
            disabled={!isOnline}
            style={{
              padding: '6px 14px',
              borderRadius: '9px',
              border: 'none',
              cursor: isOnline ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: (isAuto && isOnline) ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent',
              color: (isAuto && isOnline) ? '#ffffff' : 'var(--text-muted)',
              boxShadow: (isAuto && isOnline) ? '0 2px 10px rgba(2, 132, 199, 0.4)' : 'none'
            }}
          >
            <Cpu size={14} />
            <span>AUTO (Smart)</span>
          </button>

          <button
            onClick={() => isOnline && onSetMode('MANUAL')}
            disabled={!isOnline}
            style={{
              padding: '6px 14px',
              borderRadius: '9px',
              border: 'none',
              cursor: isOnline ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              background: (!isAuto && isOnline) ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
              color: (!isAuto && isOnline) ? '#ffffff' : 'var(--text-muted)',
              boxShadow: (!isAuto && isOnline) ? '0 2px 10px rgba(245, 158, 11, 0.4)' : 'none'
            }}
          >
            <HandMetal size={14} />
            <span>MANUAL</span>
          </button>
        </div>
      </div>

      {/* Center Damper Duct Visualizer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '10px 0'
      }}>
        
        {/* Damper Duct Cross-Section Graphic */}
        <div style={{ position: 'relative', width: '150px', height: '150px' }}>
          <svg width="150" height="150" viewBox="0 0 150 150">
            {/* Outer Duct Pipe */}
            <circle cx="75" cy="75" r="64" fill="rgba(15, 23, 42, 0.9)" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="6" />
            <circle cx="75" cy="75" r="54" fill="none" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="2" strokeDasharray="4 4" />
            
            {/* Airflow Particles / Glow */}
            {servoAngle > 10 && (
              <circle
                cx="75"
                cy="75"
                r="40"
                fill="none"
                stroke="rgba(0, 242, 254, 0.35)"
                strokeWidth={`${Math.max(1, (servoAngle / 180) * 12)}`}
                style={{ opacity: servoAngle / 180, transition: 'all 0.3s' }}
              />
            )}

            {/* Rotating Damper Blade */}
            <g transform={`rotate(${bladeRotation}, 75, 75)`} style={{ transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              {/* Blade Plate */}
              <rect x="25" y="70" width="100" height="10" rx="5" fill="url(#bladeGrad)" stroke="#38bdf8" strokeWidth="1.5" />
              {/* Center Axis Pin */}
              <circle cx="75" cy="75" r="9" fill="#0f172a" stroke="#00f2fe" strokeWidth="3" />
            </g>

            <defs>
              <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>

          {/* Damper Opening Status Overlay */}
          <div style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap'
          }}>
            <span className="badge-glass badge-blue" style={{ fontSize: '11px' }}>
              {openPercentage}% Airflow
            </span>
          </div>
        </div>

        {/* Right Info Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '160px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Damper Position</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: isOnline ? '#38bdf8' : 'var(--text-dim)', lineHeight: 1.1 }} className="font-mono">
              {isOnline ? `${servoAngle}°` : 'OFFLINE'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
              {!isOnline 
                ? 'Connect ESP32 to activate' 
                : servoAngle === 0 
                ? 'Eco Closed (0°)' 
                : servoAngle >= 170 
                ? 'Wide Open (180°)' 
                : 'Partially Open'}
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            padding: '10px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '12px',
            color: 'var(--text-muted)'
          }}>
            {!isOnline ? (
              <div>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>• Hardware Standby</span>
                <p style={{ fontSize: '11px', marginTop: '3px' }}>
                  Awaiting connection from ESP32 on <span className="font-mono">GPIO 18</span>
                </p>
              </div>
            ) : isAuto ? (
              <div>
                <span style={{ color: '#34d399', fontWeight: 600 }}>• Auto Algorithm Active</span>
                <p style={{ fontSize: '11px', marginTop: '3px' }}>
                  {occupied ? 'Occupied → Regulating airflow' : 'Unoccupied → Eco mode engaged'}
                </p>
              </div>
            ) : (
              <div>
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>• Manual Override</span>
                <p style={{ fontSize: '11px', marginTop: '3px' }}>
                  Slider & presets take immediate direct control
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Manual Slider & Presets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px', opacity: isOnline ? 1 : 0.4 }}>
        
        {/* Angle Slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>0° (Closed)</span>
            <span style={{ fontWeight: 600, color: isOnline ? 'var(--accent-blue)' : 'var(--text-dim)' }}>
              {isOnline ? 'Adjust Damper Angle' : 'Controls Locked (Hardware Disconnected)'}
            </span>
            <span>180° (Open)</span>
          </div>
          <input
            type="range"
            min="0"
            max="180"
            step="5"
            value={displayAngle}
            disabled={!isOnline || isAuto}
            onChange={(e) => onSetServoAngle(Number(e.target.value))}
            className="custom-slider"
          />
        </div>

        {/* Quick Angle Presets */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {presets.map((preset) => (
            <button
              key={preset.angle}
              disabled={!isOnline}
              onClick={() => {
                if (isOnline) {
                  if (isAuto) onSetMode('MANUAL');
                  onSetServoAngle(preset.angle);
                }
              }}
              className={`btn-preset ${(isOnline && servoAngle === preset.angle) ? 'active' : ''}`}
              style={{ flex: 1, textAlign: 'center', minWidth: '55px', cursor: isOnline ? 'pointer' : 'not-allowed' }}
            >
              {preset.label}
            </button>
          ))}
        </div>

      </div>

    </div>
  );
}
