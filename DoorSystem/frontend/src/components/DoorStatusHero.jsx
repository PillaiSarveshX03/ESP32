import React, { useState } from 'react';
import { Lock, Unlock, Radio, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { sendDoorCommand } from '../services/api';

export default function DoorStatusHero({ doorState, device, onCommandTriggered }) {
  const [loading, setLoading] = useState(false);

  const handleCommand = async (command) => {
    setLoading(true);
    try {
      await sendDoorCommand(command, 'Manual Dashboard Action');
      if (onCommandTriggered) onCommandTriggered(command);
    } catch (err) {
      console.error('Failed to dispatch command:', err);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const getStatusDisplay = () => {
    switch (doorState) {
      case 'UNLOCKED':
        return {
          icon: <Unlock size={32} />,
          title: 'DOOR UNLOCKED',
          subtitle: 'Access granted. Physical latch opened (Servo 90°, Green LED)',
          themeClass: 'UNLOCKED'
        };
      case 'MOTION_DETECTED':
        return {
          icon: <Radio size={32} />,
          title: 'MOTION DETECTED',
          subtitle: 'PIR sensor triggered at front threshold. Monitoring activity.',
          themeClass: 'MOTION_DETECTED'
        };
      case 'OFFLINE':
        return {
          icon: <AlertTriangle size={32} />,
          title: 'DEVICE OFFLINE',
          subtitle: 'Fail-secure active: Physical latch locked at 0°',
          themeClass: 'OFFLINE'
        };
      case 'LOCKED':
      default:
        return {
          icon: <Lock size={32} />,
          title: 'DOOR LOCKED',
          subtitle: 'System secure & armed. Latch engaged at 0° (Red LED)',
          themeClass: 'LOCKED'
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="hero-grid">
      {/* Main Door State Hero Card */}
      <div className={`door-hero-card ${status.themeClass}`}>
        <div className="hero-header">
          <div>
            <div className="hero-label">Primary Entrance Access Point</div>
            <div className={`hero-state-title ${status.themeClass}`}>
              {status.title}
            </div>
            <p style={{ color: 'var(--color-text-muted)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
              {status.subtitle}
            </p>
          </div>

          <div className={`hero-status-icon ${status.themeClass}`}>
            {status.icon}
          </div>
        </div>

        {/* Action Controls */}
        <div className="hero-controls">
          <button
            className="btn btn-allow"
            onClick={() => handleCommand('UNLOCK')}
            disabled={loading}
          >
            <CheckCircle2 size={18} />
            ALLOW / UNLOCK DOOR
          </button>

          <button
            className="btn btn-deny"
            onClick={() => handleCommand('LOCK')}
            disabled={loading}
          >
            <XCircle size={18} />
            LOCK / SECURE
          </button>
        </div>
      </div>

      {/* Telemetry Side Card */}
      <div className="telemetry-card">
        <div>
          <div className="hero-label" style={{ marginBottom: '1rem' }}>Hardware Telemetry</div>
          
          <div className="telemetry-item">
            <span className="telemetry-label">Assigned Node</span>
            <span className="telemetry-val">{device?.id || 'door-001'}</span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">Physical Hardware</span>
            <span className="telemetry-val">ESP32 DevKit V1</span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">Actuator Latch</span>
            <span className="telemetry-val">SG90 Micro-Servo</span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-label">Total Events</span>
            <span className="telemetry-val">{device?.eventCount || 0} Triggers</span>
          </div>
        </div>

        <div style={{ paddingTop: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Fail-Secure: Under network loss or power interruption, door latch strictly defaults to LOCKED.
          </div>
        </div>
      </div>
    </div>
  );
}
