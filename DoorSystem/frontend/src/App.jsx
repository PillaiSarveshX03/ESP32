import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DoorStatusHero from './components/DoorStatusHero';
import ServoAngleControl from './components/ServoAngleControl';
import VisitorRequestCard from './components/VisitorRequestCard';
import EventHistoryTable from './components/EventHistoryTable';
import DevSimulatorBar from './components/DevSimulatorBar';
import { fetchSystemStatus } from './services/api';
import { socket } from './services/socket';

export default function App() {
  const [doorState, setDoorState] = useState('LOCKED');
  const [servoAngle, setServoAngle] = useState(0);
  const [device, setDevice] = useState({ id: 'door-001', status: 'OFFLINE', ip: null, eventCount: 0 });
  const [currentVisitor, setCurrentVisitor] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);

  // Fetch initial state & setup real-time WebSocket listeners
  useEffect(() => {
    // Initial fetch
    fetchSystemStatus()
      .then((data) => {
        if (data.doorState) setDoorState(data.doorState);
        if (data.servoAngle !== undefined) setServoAngle(data.servoAngle);
        if (data.device) setDevice(data.device);
        if (data.recentEvents) setRecentEvents(data.recentEvents);
      })
      .catch((err) => console.warn('Backend not reached on initial load:', err));

    // Realtime Socket.IO event subscribers
    socket.on('initial:state', (data) => {
      if (data.doorState) setDoorState(data.doorState);
      if (data.servoAngle !== undefined) setServoAngle(data.servoAngle);
      if (data.device) setDevice(data.device);
    });

    socket.on('door:state', (data) => {
      setDoorState(data.state);
      if (data.angle !== undefined) {
        setServoAngle(data.angle);
      } else if (data.state === 'LOCKED') {
        setServoAngle(0);
      } else if (data.state === 'UNLOCKED') {
        setServoAngle((prev) => (prev === 0 ? 90 : prev));
      }

      // Auto-clear visitor prompt when relocked
      if (data.state === 'LOCKED' || data.state === 'UNLOCKED') {
        setTimeout(() => {
          setCurrentVisitor((prev) => (prev ? null : prev));
        }, 5000);
      }
    });

    socket.on('servo:angle', (data) => {
      if (data.angle !== undefined) {
        setServoAngle(data.angle);
        setDoorState(data.angle === 0 ? 'LOCKED' : 'UNLOCKED');
      }
    });

    socket.on('device:status', (deviceData) => {
      setDevice(deviceData);
    });

    socket.on('visitor:detected', (eventRecord) => {
      setDoorState('MOTION_DETECTED');
      // Create active visitor request prompt
      setCurrentVisitor({
        name: 'Visitor at Front Door',
        message: 'Approaching visitor detected by PIR motion sensor.',
        aiSummary: 'Motion event active. Waiting for visitor verbal identification.',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
        timestamp: eventRecord.timestamp
      });

      // Add to event timeline
      setRecentEvents((prev) => [eventRecord, ...prev.slice(0, 14)]);
    });

    socket.on('door:command', (cmdData) => {
      const isAngleCmd = cmdData.command === 'SET_ANGLE';
      const eventLabel = isAngleCmd ? `COMMAND_SET_ANGLE_${cmdData.angle}°` : `COMMAND_${cmdData.command}`;
      
      setRecentEvents((prev) => [
        {
          id: `cmd-${Date.now()}`,
          event: eventLabel,
          deviceId: device.id || 'door-001',
          timestamp: cmdData.timestamp,
          status: (cmdData.command === 'LOCK' ? 'DENIED' : 'APPROVED'),
          visitorName: 'Owner Command'
        },
        ...prev.slice(0, 14)
      ]);
    });

    return () => {
      socket.off('initial:state');
      socket.off('door:state');
      socket.off('servo:angle');
      socket.off('device:status');
      socket.off('visitor:detected');
      socket.off('door:command');
    };
  }, []);

  const handleVisitorResolved = (action) => {
    setCurrentVisitor(null);
  };

  const handleManualCommand = (cmd) => {
    if (cmd === 'UNLOCK') {
      setDoorState('UNLOCKED');
      setServoAngle(90);
    } else {
      setDoorState('LOCKED');
      setServoAngle(0);
    }
  };

  const handleAngleChanged = (newAngle) => {
    setServoAngle(newAngle);
    setDoorState(newAngle === 0 ? 'LOCKED' : 'UNLOCKED');
  };

  return (
    <div className="app-layout">
      {/* Navigation Top Bar */}
      <Navbar deviceStatus={device.status} esp32Ip={device.ip} />

      {/* Main Content Dashboard */}
      <main className="main-content">
        {/* Development Simulator Bar (Always visible for easy testing) */}
        <DevSimulatorBar onSimulateVisitor={(v) => setCurrentVisitor(v)} />

        {/* Prominent Visitor Request Card (Displays when someone is detected) */}
        {currentVisitor && (
          <VisitorRequestCard
            visitor={currentVisitor}
            onResolved={handleVisitorResolved}
          />
        )}

        {/* Main Door Status Hero Banner */}
        <DoorStatusHero
          doorState={doorState}
          device={device}
          onCommandTriggered={handleManualCommand}
        />

        {/* Dedicated Physical Actuator Servo Angle Controller */}
        <ServoAngleControl
          currentAngle={servoAngle}
          onAngleChanged={handleAngleChanged}
          isDeviceOnline={device.status === 'ONLINE'}
        />

        {/* Security Audit History Table */}
        <EventHistoryTable events={recentEvents} />
      </main>
    </div>
  );
}
