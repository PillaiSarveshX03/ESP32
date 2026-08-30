import React, { useState } from 'react';
import { X, Sliders, Save, RefreshCw, Cpu, Server, Shield, Check } from 'lucide-react';

export function SettingsModal({ 
  isOpen, 
  onClose, 
  systemState, 
  onSaveSettings 
}) {
  const [targetTemp, setTargetTemp] = useState(systemState.targetTemp || 24);
  const [ecoAngle, setEcoAngle] = useState(systemState.ecoAngle || 0);
  const [pirTimeout, setPirTimeout] = useState(systemState.pirTimeoutSec || 20);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSaveSettings({
      targetTemp: Number(targetTemp),
      ecoAngle: Number(ecoAngle),
      pirTimeoutSec: Number(pirTimeout)
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '520px',
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
        position: 'relative'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sliders size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>System Settings & Calibration</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>HVAC thresholds & ESP32 parameters</p>
            </div>
          </div>

          <button onClick={onClose} className="btn-preset" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Target Temp */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <label style={{ fontWeight: 600 }}>Target Room Temperature</label>
              <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{targetTemp}°C</span>
            </div>
            <input
              type="range"
              min="16"
              max="32"
              step="0.5"
              value={targetTemp}
              onChange={(e) => setTargetTemp(e.target.value)}
              className="custom-slider"
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              When temperature exceeds this target, damper opens for full cooling.
            </p>
          </div>

          {/* Eco Damper Angle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <label style={{ fontWeight: 600 }}>Eco Mode Damper Position</label>
              <span className="font-mono" style={{ color: '#38bdf8', fontWeight: 700 }}>{ecoAngle}&deg;</span>
            </div>
            <input
              type="range"
              min="0"
              max="45"
              step="5"
              value={ecoAngle}
              onChange={(e) => setEcoAngle(e.target.value)}
              className="custom-slider"
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Angle used when room is unoccupied (0° = 100% closed, 15° = minimum trickle).
            </p>
          </div>

          {/* PIR Timeout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <label style={{ fontWeight: 600 }}>PIR Occupancy Timeout</label>
              <span className="font-mono" style={{ color: '#34d399', fontWeight: 700 }}>{pirTimeout} seconds</span>
            </div>
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={pirTimeout}
              onChange={(e) => setPirTimeout(e.target.value)}
              className="custom-slider"
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Inactivity delay before switching from Occupied to Eco Mode.
            </p>
          </div>

          {/* Hardware Connection Info */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            padding: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-blue)', fontWeight: 600 }}>
              <Server size={14} />
              <span>Network Information</span>
            </div>
            <div style={{ marginTop: '6px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              <div>WebSocket Host: <span className="font-mono" style={{ color: '#ffffff' }}>ws://localhost:5000/ws/client</span></div>
              <div>ESP32 Hardware: <span className="font-mono" style={{ color: '#ffffff' }}>ws://&lt;IP&gt;:5000/ws/esp32</span></div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn-preset">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {savedSuccess ? (
                <>
                  <Check size={16} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
