import React from 'react';
import { Terminal, Zap, UserCheck, ShieldOff, Play } from 'lucide-react';
import { triggerSimulatedEvent, sendDoorCommand } from '../services/api';

export default function DevSimulatorBar({ onSimulateVisitor }) {
  const handleSimulateMotion = async () => {
    try {
      await triggerSimulatedEvent('MOTION_DETECTED');
    } catch (err) {
      console.error('Failed to trigger simulation:', err);
    }
  };

  const handleSimulateDelivery = () => {
    if (onSimulateVisitor) {
      onSimulateVisitor({
        name: 'Rahul Sharma (Amazon Delivery)',
        message: 'Hello, I have an urgent parcel delivery from Amazon for Office 4B. Need a signature.',
        aiSummary: 'Likely delivery agent with commercial package. Consistent with typical delivery pattern, identity requires owner verification.',
        photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80'
      });
    }
  };

  const handleSimulateUnknown = () => {
    if (onSimulateVisitor) {
      onSimulateVisitor({
        name: 'Unrecognized Visitor',
        message: 'Hi, I am looking for the building manager. Is anyone available?',
        aiSummary: 'Unverified guest inquiry. No delivery or scheduled appointment detected. Recommend owner screening before entry.',
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80'
      });
    }
  };

  const handleSimulateUnlock = async () => {
    await sendDoorCommand('UNLOCK', 'Simulated Owner Approval');
  };

  const handleSimulateLock = async () => {
    await sendDoorCommand('LOCK', 'Simulated Owner Denial');
  };

  return (
    <div className="simulator-panel">
      <div className="sim-tag">
        <Terminal size={16} />
        <span>Dev Simulation Bar (Hardware Testing & Demo)</span>
      </div>

      <div className="sim-buttons">
        <button className="btn-sim" onClick={handleSimulateMotion}>
          <Zap size={13} style={{ display: 'inline', marginRight: '4px' }} />
          Simulate PIR Motion
        </button>

        <button className="btn-sim" onClick={handleSimulateDelivery}>
          <UserCheck size={13} style={{ display: 'inline', marginRight: '4px' }} />
          Simulate Delivery Visitor
        </button>

        <button className="btn-sim" onClick={handleSimulateUnknown}>
          <Play size={13} style={{ display: 'inline', marginRight: '4px' }} />
          Simulate Unknown Visitor
        </button>

        <button className="btn-sim" onClick={handleSimulateUnlock}>
          Simulate Allow
        </button>

        <button className="btn-sim" onClick={handleSimulateLock}>
          Simulate Deny
        </button>
      </div>
    </div>
  );
}
