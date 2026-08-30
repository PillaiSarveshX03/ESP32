import React, { useState } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Flame, 
  ChevronUp, 
  ChevronDown, 
  Target, 
  Smile, 
  AlertCircle 
} from 'lucide-react';

export function ClimateCard({ systemState, onUpdateTargetTemp }) {
  const [useFahrenheit, setUseFahrenheit] = useState(false);
  const { temperature, humidity, heatIndex, targetTemp, espConnected } = systemState;
  const isOnline = espConnected && temperature !== null;

  // Temperature unit conversion
  const toDisplayTemp = (c) => {
    if (c === null || c === undefined) return '--.-';
    if (useFahrenheit) return ((c * 9) / 5 + 32).toFixed(1);
    return Number(c).toFixed(1);
  };
  const unit = useFahrenheit ? '°F' : '°C';

  // Comfort classification
  const getComfortStatus = () => {
    if (!isOnline) {
      return { text: 'Awaiting Hardware Data', color: 'badge-amber', desc: 'Connect ESP32 with DHT11 sensor to activate' };
    }
    const diff = temperature - targetTemp;
    if (Math.abs(diff) <= 0.6) {
      return { text: 'Optimal Comfort', color: 'badge-green', desc: 'Damper maintaining target balanced climate' };
    } else if (diff > 0.6) {
      return { text: 'Cooling Active', color: 'badge-blue', desc: 'Damper opening for increased airflow' };
    } else {
      return { text: 'Eco Restricting', color: 'badge-amber', desc: 'Damper throttled to prevent overcooling' };
    }
  };

  const comfort = getComfortStatus();

  // SVG Gauge calculations
  const minGauge = 15;
  const maxGauge = 35;
  const currentVal = isOnline ? temperature : minGauge;
  const clampedTemp = Math.min(Math.max(currentVal, minGauge), maxGauge);
  const percentage = isOnline ? (clampedTemp - minGauge) / (maxGauge - minGauge) : 0;
  const radius = 70;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (240 / 360);
  const strokeDashoffset = isOnline ? arcLength * (1 - percentage) : arcLength;

  return (
    <div className="glass-card" style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Thermometer size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Climate Telemetry</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>DHT11 Live Air Quality & Thermal Sense</p>
          </div>
        </div>

        {/* Unit Toggle */}
        <button
          onClick={() => setUseFahrenheit(!useFahrenheit)}
          className="btn-preset"
          style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px' }}
        >
          {useFahrenheit ? 'Switch to °C' : 'Switch to °F'}
        </button>
      </div>

      {/* Main Dial & Metrics Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* Radial Temperature Gauge */}
        <div style={{ position: 'relative', width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(150deg)' }}>
            <defs>
              <linearGradient id="tempGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#00f2fe" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>
            {/* Background Arc */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeLinecap="round"
            />
            {/* Value Arc */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke="url(#tempGradient)"
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
          </svg>

          {/* Centered Readout */}
          <div style={{
            position: 'absolute',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {toDisplayTemp(temperature)}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '2px' }}>
              {unit}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Room Temp
            </span>
          </div>
        </div>

        {/* Supporting Metrics: Humidity & Heat Index */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '170px' }}>
          
          {/* Humidity Stat */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '14px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ color: '#38bdf8' }}><Droplets size={20} /></div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Humidity</div>
                <div style={{ fontSize: '18px', fontWeight: 700 }} className="font-mono">
                  {humidity !== null && humidity !== undefined ? `${Number(humidity).toFixed(1)}%` : '--.-%'}
                </div>
              </div>
            </div>
            {/* Mini Progress Bar */}
            <div style={{ width: '40px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${isOnline ? Math.min(100, Math.max(0, humidity)) : 0}%`, height: '100%', background: '#38bdf8' }}></div>
            </div>
          </div>

          {/* Heat Index Stat */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '14px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{ color: '#f59e0b' }}><Flame size={20} /></div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Apparent Heat Index</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }} className="font-mono">
                {heatIndex !== null && heatIndex !== undefined ? `${toDisplayTemp(heatIndex)}${unit}` : `--.-${unit}`}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`badge-glass ${comfort.color}`} style={{ width: '100%', justifyContent: 'center', padding: '8px 12px' }}>
            <Smile size={14} />
            <span>{comfort.text}</span>
          </div>

        </div>

      </div>

      {/* Target Temperature Slider & Quick Controls */}
      <div style={{
        background: 'rgba(0, 242, 254, 0.04)',
        border: '1px solid rgba(0, 242, 254, 0.15)',
        borderRadius: '14px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Target size={18} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Target Setpoint</span>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Auto Damper regulates towards this threshold</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-cyan)' }} className="font-mono">
            {toDisplayTemp(targetTemp)}{unit}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button
              onClick={() => onUpdateTargetTemp(Math.min(32, targetTemp + 0.5))}
              className="btn-preset"
              style={{ padding: '2px 8px' }}
              title="Increase Target Temp"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => onUpdateTargetTemp(Math.max(16, targetTemp - 0.5))}
              className="btn-preset"
              style={{ padding: '2px 8px' }}
              title="Decrease Target Temp"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
