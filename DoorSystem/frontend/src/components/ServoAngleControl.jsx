import React, { useState, useEffect } from 'react';
import { Sliders, RotateCw, Compass, Check, ArrowRight, Zap, Minus, Plus, ShieldCheck } from 'lucide-react';
import { setServoAngle } from '../services/api';

export default function ServoAngleControl({ currentAngle = 0, onAngleChanged, isDeviceOnline = true }) {
  const [selectedAngle, setSelectedAngle] = useState(currentAngle);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastAppliedAngle, setLastAppliedAngle] = useState(currentAngle);
  const [successFeedback, setSuccessFeedback] = useState(false);

  // Sync with real-time hardware telemetry updates from backend
  useEffect(() => {
    setSelectedAngle(currentAngle);
    setLastAppliedAngle(currentAngle);
  }, [currentAngle]);

  const presets = [
    { label: '0° Locked', angle: 0, tag: 'Secured' },
    { label: '45° Partial', angle: 45, tag: 'Ajar' },
    { label: '90° Standard', angle: 90, tag: 'Default Unlock' },
    { label: '135° Wide', angle: 135, tag: 'Wide Access' },
    { label: '180° Full', angle: 180, tag: 'Max Sweep' },
  ];

  const handleApplyAngle = async (angleToApply) => {
    const angle = Math.max(0, Math.min(180, parseInt(angleToApply, 10) || 0));
    setIsUpdating(true);
    setSuccessFeedback(false);

    try {
      await setServoAngle(angle, `UI Servo Angle Setting: ${angle}°`);
      setLastAppliedAngle(angle);
      setSuccessFeedback(true);
      if (onAngleChanged) onAngleChanged(angle);
      setTimeout(() => setSuccessFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to set servo angle:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickPreset = (angle) => {
    setSelectedAngle(angle);
    handleApplyAngle(angle);
  };

  const handleSliderChange = (e) => {
    setSelectedAngle(parseInt(e.target.value, 10));
  };

  const adjustAngle = (delta) => {
    const newAngle = Math.max(0, Math.min(180, selectedAngle + delta));
    setSelectedAngle(newAngle);
  };

  // Calculate rotation angle for visual dial needle
  // 0° points left-horizontal or top, 180° sweeps clockwise
  const dialRotation = selectedAngle - 90; // -90deg at 0°, 0deg at 90°, +90deg at 180°

  return (
    <div className="servo-control-card">
      <div className="servo-header">
        <div className="servo-header-left">
          <div className="servo-icon-wrapper">
            <Sliders size={22} className="text-cyber" />
          </div>
          <div>
            <div className="servo-badge">PHYSICAL ACTUATOR CALIBRATION</div>
            <h3 className="servo-title">Servo Angle & Latch Controller</h3>
            <p className="servo-subtitle">
              Adjust SG90 physical horn angle (0° to 180°). Directional sweep polarity is preserved.
            </p>
          </div>
        </div>

        <div className="servo-status-pill">
          <span className={`servo-status-dot ${isDeviceOnline ? 'online' : 'offline'}`} />
          <span className="servo-status-text">
            {isDeviceOnline ? `HW Position: ${lastAppliedAngle}°` : 'Device Offline'}
          </span>
        </div>
      </div>

      <div className="servo-body-grid">
        {/* Visual Dial / Gauge */}
        <div className="servo-visual-container">
          <div className="servo-dial-box">
            <svg className="servo-dial-svg" viewBox="0 0 200 120">
              {/* Background Arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="rgba(148, 163, 184, 0.15)"
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* Dynamic Active Arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#servoGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * (selectedAngle / 180))}
                className="servo-active-arc"
              />
              <defs>
                <linearGradient id="servoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>

            {/* Needle Pivot & Arm */}
            <div
              className="servo-needle-arm"
              style={{ transform: `rotate(${dialRotation}deg)` }}
            >
              <div className="servo-needle-tip" />
            </div>

            {/* Central Angle Readout */}
            <div className="servo-angle-readout">
              <span className="servo-angle-number">{selectedAngle}°</span>
              <span className="servo-angle-state-label">
                {selectedAngle === 0 ? 'LOCKED' : selectedAngle === 90 ? 'UNLOCKED' : 'CUSTOM ANGLE'}
              </span>
            </div>
          </div>

          <div className="servo-dial-legend">
            <span>0° (Locked)</span>
            <span>90° (Standard)</span>
            <span>180° (Max)</span>
          </div>
        </div>

        {/* Interactive Controls & Presets */}
        <div className="servo-interactive-panel">
          {/* Quick Presets */}
          <div className="servo-section-label">Quick Angle Presets</div>
          <div className="servo-preset-grid">
            {presets.map((p) => {
              const isActive = lastAppliedAngle === p.angle;
              return (
                <button
                  key={p.angle}
                  className={`servo-preset-btn ${isActive ? 'active' : ''}`}
                  onClick={() => handleQuickPreset(p.angle)}
                  disabled={isUpdating}
                  title={`Rotate servo to ${p.angle}°`}
                >
                  <span className="preset-btn-angle">{p.angle}°</span>
                  <span className="preset-btn-name">{p.tag}</span>
                </button>
              );
            })}
          </div>

          {/* Precision Slider & Fine Tuning */}
          <div className="servo-slider-container">
            <div className="servo-slider-header">
              <span className="servo-section-label">Precision Angle Slider</span>
              <span className="servo-slider-val-badge">{selectedAngle}° / 180°</span>
            </div>

            <div className="servo-slider-row">
              <button
                className="servo-step-btn"
                onClick={() => adjustAngle(-5)}
                disabled={selectedAngle <= 0 || isUpdating}
                title="Decrease 5°"
              >
                <Minus size={16} />
              </button>

              <input
                type="range"
                min="0"
                max="180"
                step="1"
                value={selectedAngle}
                onChange={handleSliderChange}
                className="servo-range-input"
              />

              <button
                className="servo-step-btn"
                onClick={() => adjustAngle(5)}
                disabled={selectedAngle >= 180 || isUpdating}
                title="Increase 5°"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="servo-action-row">
            <button
              className={`btn-apply-servo ${successFeedback ? 'success' : ''}`}
              onClick={() => handleApplyAngle(selectedAngle)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <RotateCw size={17} className="animate-spin" />
                  <span>Rotating Servo to {selectedAngle}°...</span>
                </>
              ) : successFeedback ? (
                <>
                  <Check size={17} />
                  <span>Servo Angle Set to {selectedAngle}°!</span>
                </>
              ) : (
                <>
                  <Zap size={17} />
                  <span>Set Servo to {selectedAngle}°</span>
                </>
              )}
            </button>

            <div className="servo-help-note">
              <ShieldCheck size={14} className="text-cyber" />
              <span>0° = Low pulse (500µs) • 180° = High pulse (2500µs)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
