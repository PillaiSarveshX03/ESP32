import React from 'react';
import { Shield, Wifi, WifiOff, User, Cpu } from 'lucide-react';

export default function Navbar({ deviceStatus, esp32Ip }) {
  const isOnline = deviceStatus === 'ONLINE';

  return (
    <header className="navbar">
      <div className="brand-section">
        <div className="brand-icon-wrapper">
          <Shield size={22} />
        </div>
        <div>
          <div className="brand-title">
            AegisGuard <span className="brand-badge">PROTOTYPE</span>
          </div>
        </div>
      </div>

      <div className="nav-actions">
        {/* ESP32 Hardware Status */}
        <div className="status-pill">
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
          <span style={{ color: isOnline ? '#10b981' : '#ef4444' }}>
            {isOnline ? 'ESP32 ONLINE' : 'ESP32 OFFLINE'}
          </span>
          {isOnline && esp32Ip && (
            <span style={{ color: '#64748b', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
              ({esp32Ip})
            </span>
          )}
        </div>

        {/* Owner Profile */}
        <div className="user-profile-pill">
          <div className="avatar-circle">
            <User size={15} />
          </div>
          <span style={{ fontWeight: 600 }}>Owner Console</span>
        </div>
      </div>
    </header>
  );
}
