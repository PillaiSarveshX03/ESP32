import React from 'react';
import { History, ShieldAlert, KeyRound, AlertCircle } from 'lucide-react';

export default function EventHistoryTable({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="history-section">
        <div className="section-header">
          <div className="section-title">
            <History size={20} style={{ color: 'var(--color-cyber)' }} />
            Security Audit Trail
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
          No security events recorded yet. Approaching motion or manual door commands will appear here in real time.
        </div>
      </div>
    );
  }

  return (
    <div className="history-section">
      <div className="section-header">
        <div className="section-title">
          <History size={20} style={{ color: 'var(--color-cyber)' }} />
          Security Audit Trail
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
          Showing latest {events.length} system events
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="event-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Trigger Type</th>
              <th>Node</th>
              <th>Visitor / Source</th>
              <th>Resulting Action</th>
            </tr>
          </thead>
          <tbody>
            {events.map((evt, idx) => {
              const formattedTime = evt.timestamp
                ? new Date(evt.timestamp).toLocaleTimeString()
                : 'Just now';

              return (
                <tr key={evt.id || idx}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#94a3b8' }}>
                    {formattedTime}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      {evt.event === 'MOTION_DETECTED' ? (
                        <ShieldAlert size={16} style={{ color: 'var(--color-motion)' }} />
                      ) : (
                        <KeyRound size={16} style={{ color: 'var(--color-cyber)' }} />
                      )}
                      {evt.event || 'MANUAL_COMMAND'}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#64748b', fontSize: '0.8rem' }}>
                    {evt.deviceId || 'door-001'}
                  </td>
                  <td style={{ color: '#cbd5e1' }}>
                    {evt.visitorName || 'Physical Sensor Trigger'}
                  </td>
                  <td>
                    <span className={`badge-status ${evt.status || 'APPROVED'}`}>
                      {evt.status || 'PROCESSED'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
