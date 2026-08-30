import React, { useState } from 'react';
import { Activity, LineChart, TrendingUp, Filter } from 'lucide-react';

export function TelemetryChart({ history = [], espConnected }) {
  const [showTemp, setShowTemp] = useState(true);
  const [showHum, setShowHum] = useState(true);
  const [showServo, setShowServo] = useState(true);

  if (!espConnected || !history || history.length < 2) {
    return (
      <div className="glass-card" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '260px', gap: '10px' }}>
        <Activity size={32} style={{ color: 'var(--text-dim)', opacity: 0.6 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>
          {espConnected ? 'Collecting live telemetry data stream...' : 'Awaiting live sensor stream from ESP32 hardware...'}
        </p>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
          DHT11 and Servo telemetry will render here in real-time once connected
        </span>
      </div>
    );
  }

  // Dimensions
  const width = 640;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Extents
  const temps = history.map(d => d.temperature || 24);
  const hums = history.map(d => d.humidity || 50);
  const servos = history.map(d => d.servoAngle || 90);

  const minTemp = Math.floor(Math.min(...temps) - 1);
  const maxTemp = Math.ceil(Math.max(...temps) + 1);

  // Generate SVG path for Temperature
  const getTempY = (val) => chartH - ((val - minTemp) / (maxTemp - minTemp || 1)) * chartH + padding.top;
  const getHumY = (val) => chartH - (val / 100) * chartH + padding.top;
  const getServoY = (val) => chartH - (val / 180) * chartH + padding.top;
  const getX = (idx) => padding.left + (idx / (history.length - 1)) * chartW;

  const tempPath = history.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getTempY(d.temperature)}`).join(' ');
  const humPath = history.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getHumY(d.humidity)}`).join(' ');
  const servoPath = history.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getServoY(d.servoAngle)}`).join(' ');

  return (
    <div className="glass-card" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Header & Series Toggles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Telemetry Stream</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Real-time 60-point Dynamic Trend Analysis</p>
          </div>
        </div>

        {/* Series Filter Badges */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowTemp(!showTemp)}
            className={`btn-preset ${showTemp ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', borderColor: showTemp ? '#00f2fe' : 'rgba(255,255,255,0.1)' }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f2fe' }}></span>
            <span>Temp (°C)</span>
          </button>

          <button
            onClick={() => setShowHum(!showHum)}
            className={`btn-preset ${showHum ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', borderColor: showHum ? '#38bdf8' : 'rgba(255,255,255,0.1)' }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }}></span>
            <span>Humidity (%)</span>
          </button>

          <button
            onClick={() => setShowServo(!showServo)}
            className={`btn-preset ${showServo ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', borderColor: showServo ? '#f59e0b' : 'rgba(255,255,255,0.1)' }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
            <span>Vent (°)</span>
          </button>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', minWidth: '450px' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
            <line
              key={i}
              x1={padding.left}
              y1={padding.top + p * chartH}
              x2={width - padding.right}
              y2={padding.top + p * chartH}
              stroke="rgba(255, 255, 255, 0.05)"
              strokeDasharray="4 4"
            />
          ))}

          {/* Time Labels */}
          {history.length > 0 && (
            <>
              <text x={padding.left} y={height - 8} fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="sans-serif">
                {history[0]?.timestamp || ''}
              </text>
              <text x={width - padding.right} y={height - 8} fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="end" fontFamily="sans-serif">
                {history[history.length - 1]?.timestamp || ''}
              </text>
            </>
          )}

          {/* Paths */}
          {showHum && (
            <path
              d={humPath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="3 3"
              opacity="0.6"
            />
          )}

          {showServo && (
            <path
              d={servoPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              opacity="0.8"
            />
          )}

          {showTemp && (
            <path
              d={tempPath}
              fill="none"
              stroke="#00f2fe"
              strokeWidth="3"
              style={{ filter: 'drop-shadow(0 0 6px rgba(0, 242, 254, 0.5))' }}
            />
          )}

          {/* Data Points on Latest Value */}
          {showTemp && history.length > 0 && (
            <circle
              cx={getX(history.length - 1)}
              cy={getTempY(history[history.length - 1].temperature)}
              r="4.5"
              fill="#00f2fe"
              stroke="#080c14"
              strokeWidth="2"
            />
          )}
        </svg>
      </div>

    </div>
  );
}
