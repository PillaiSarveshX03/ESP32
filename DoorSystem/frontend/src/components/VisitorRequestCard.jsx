import React from 'react';
import { Sparkles, Check, X, Clock, MapPin } from 'lucide-react';
import { sendDoorCommand } from '../services/api';

export default function VisitorRequestCard({ visitor, onResolved }) {
  if (!visitor) return null;

  const handleAllow = async () => {
    try {
      await sendDoorCommand('UNLOCK', `Owner approved visitor: ${visitor.name || 'Visitor'}`);
      if (onResolved) onResolved('APPROVED');
    } catch (err) {
      console.error('Failed to allow visitor:', err);
    }
  };

  const handleDeny = async () => {
    try {
      await sendDoorCommand('LOCK', `Owner denied visitor: ${visitor.name || 'Visitor'}`);
      if (onResolved) onResolved('DENIED');
    } catch (err) {
      console.error('Failed to deny visitor:', err);
    }
  };

  // Safe fallback photo SVG if image fails or before camera is connected
  const defaultPhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80";

  return (
    <div className="visitor-alert-card">
      {/* Prominent Visitor Photo Frame */}
      <div className="visitor-photo-frame">
        <img
          src={visitor.photoUrl || defaultPhoto}
          alt="Visitor at Door"
          onError={(e) => {
            e.target.src = defaultPhoto;
          }}
        />
        <div className="live-badge">
          <span className="live-dot" />
          VISITOR CAMERA
        </div>
      </div>

      {/* Visitor Identification & Purpose */}
      <div className="visitor-details">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-motion)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
            <Clock size={14} />
            Detected Just Now • Front Entrance
          </div>
          <h2 className="visitor-name">
            {visitor.name || 'Unknown Approaching Visitor'}
          </h2>
        </div>

        {/* Visitor Stated Message */}
        <div className="visitor-quote">
          "{visitor.message || 'Visitor is identifying purpose at door: \"I am Rahul. I have a package delivery for the office.\"'}”
        </div>

        {/* AI Advisory Intelligence Layer */}
        <div className="ai-summary-box">
          <Sparkles size={18} style={{ color: '#06b6d4', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', color: '#38bdf8', marginBottom: '2px' }}>AI Advisory Analysis (Gemini)</strong>
            <span>
              {visitor.aiSummary || 'Likely delivery courier based on verbal statement. Request appears legitimate, but identity has not been verified.'}
            </span>
          </div>
        </div>

        {/* Decision Controls */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-allow" onClick={handleAllow} style={{ flex: 1, minWidth: '160px' }}>
            <Check size={18} />
            ALLOW ENTRY
          </button>
          <button className="btn btn-deny" onClick={handleDeny} style={{ flex: 1, minWidth: '160px' }}>
            <X size={18} />
            DENY ACCESS
          </button>
        </div>
      </div>
    </div>
  );
}
