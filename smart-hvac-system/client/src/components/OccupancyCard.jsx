import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  UserX, 
  Radio, 
  Clock, 
  Leaf, 
  Activity,
  Zap
} from 'lucide-react';

export function OccupancyCard({ systemState, onTriggerMockMotion }) {
  const { motion, occupied, lastMotionTime, pirTimeoutSec = 20, espConnected } = systemState;
  const [secondsRemaining, setSecondsRemaining] = useState(pirTimeoutSec);
  const isOnline = espConnected;

  // Calculate live countdown until eco mode
  useEffect(() => {
    if (!isOnline) return;
    const timer = setInterval(() => {
      if (motion) {
        setSecondsRemaining(pirTimeoutSec);
      } else {
        const elapsed = Math.floor((Date.now() - (lastMotionTime || Date.now())) / 1000);
        const remaining = Math.max(0, pirTimeoutSec - elapsed);
        setSecondsRemaining(remaining);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [motion, lastMotionTime, pirTimeoutSec, isOnline]);

  return (
    <div className="glass-card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: isOnline 
              ? (motion ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)') 
              : 'rgba(255, 255, 255, 0.05)',
            color: isOnline ? (motion ? '#f43f5e' : '#10b981') : 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}>
            <Radio size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Occupancy Sense</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PIR Motion (GPIO 13)</p>
          </div>
        </div>

        {/* Live Motion Badge */}
        <div className={`badge-glass ${isOnline ? (motion ? 'badge-rose' : occupied ? 'badge-green' : 'badge-amber') : 'badge-amber'}`}>
          <span className="animate-pulse-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: isOnline ? (motion ? '#f43f5e' : occupied ? '#10b981' : '#f59e0b') : '#f59e0b' }}></span>
          <span>{isOnline ? (motion ? 'MOTION ACTIVE' : occupied ? 'ROOM OCCUPIED' : 'UNOCCUPIED') : 'HARDWARE OFFLINE'}</span>
        </div>
      </div>

      {/* Radar Animation Area */}
      <div style={{
        position: 'relative',
        height: '130px',
        background: 'rgba(0, 0, 0, 0.25)',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        
        {/* Radar Ring Pulses */}
        {isOnline && motion && (
          <>
            <div className="radar-ring" style={{ width: '80px', height: '80px', border: '2px solid rgba(244, 63, 94, 0.7)', animationDelay: '0s' }} />
            <div className="radar-ring" style={{ width: '80px', height: '80px', border: '2px solid rgba(244, 63, 94, 0.5)', animationDelay: '0.6s' }} />
            <div className="radar-ring" style={{ width: '80px', height: '80px', border: '2px solid rgba(244, 63, 94, 0.3)', animationDelay: '1.2s' }} />
          </>
        )}

        {/* Center Human Avatar */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: isOnline 
            ? (motion ? 'linear-gradient(135deg, #f43f5e, #be123c)' : occupied ? 'linear-gradient(135deg, #10b981, #047857)' : 'rgba(255, 255, 255, 0.08)')
            : 'rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isOnline ? '#ffffff' : 'var(--text-dim)',
          boxShadow: isOnline && motion ? '0 0 25px rgba(244, 63, 94, 0.8)' : isOnline && occupied ? '0 0 15px rgba(16, 185, 129, 0.5)' : 'none',
          transition: 'all 0.3s ease',
          zIndex: 2
        }}>
          {isOnline ? (occupied ? <UserCheck size={28} /> : <UserX size={28} style={{ opacity: 0.5 }} />) : <UserX size={28} style={{ opacity: 0.3 }} />}
        </div>
      </div>

      {/* Eco Countdown Status Bar */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        padding: '12px 14px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        opacity: isOnline ? 1 : 0.5
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Leaf size={14} style={{ color: '#34d399' }} />
            Eco Timeout Timer
          </span>
          <span className="font-mono" style={{ fontWeight: 600, color: !isOnline ? 'var(--text-dim)' : secondsRemaining === 0 ? '#fbbf24' : '#34d399' }}>
            {!isOnline ? 'Awaiting hardware' : motion ? 'Resetting (Active)' : secondsRemaining > 0 ? `${secondsRemaining}s remaining` : 'Eco Mode Active'}
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            width: isOnline ? `${(secondsRemaining / pirTimeoutSec) * 100}%` : '0%',
            height: '100%',
            background: secondsRemaining > 5 ? 'linear-gradient(to right, #10b981, #34d399)' : 'linear-gradient(to right, #f59e0b, #ef4444)',
            transition: 'width 0.5s ease-out'
          }} />
        </div>
      </div>

    </div>
  );
}
