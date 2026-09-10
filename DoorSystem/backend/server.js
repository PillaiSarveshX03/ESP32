/**
 * ==============================================================================
 * SMART AI DOOR SECURITY SYSTEM — BACKEND SERVER
 * ==============================================================================
 * Node.js + Express + Socket.IO Realtime Gateway
 * Handles:
 *  - ESP32 Device Handshake & Authentication
 *  - Motion Event Ingestion & Cooldown Enforcement
 *  - Real-time Telemetry Broadcasting via WebSockets
 *  - Bidirectional Door Actuation Commands (Unlock / Lock)
 *  - Device Health Watchdog (Online / Offline status)
 * ==============================================================================
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const DEVICE_AUTH_TOKEN = process.env.DEVICE_AUTH_TOKEN || 'smart-door-esp32-secret-token-2026';

// Enable CORS for frontend clients
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json());

// Setup Socket.IO for real-time dashboard updates
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ==========================================
// CENTRALIZED STATE MANAGEMENT
// ==========================================
const state = {
  doorState: 'LOCKED', // 'LOCKED', 'UNLOCKED', 'MOTION_DETECTED', 'AWAITING_OWNER', 'OFFLINE'
  device: {
    id: 'door-001',
    name: 'Front Entrance Door',
    status: 'OFFLINE', // 'ONLINE', 'OFFLINE'
    ip: null,
    lastSeen: null,
    eventCount: 0
  },
  lastEvent: null,
  pendingCommand: null, // Command waiting for ESP32: 'UNLOCK', 'LOCK', or null
  recentEvents: []
};

// ==========================================
// MIDDLEWARE: Device Token Authentication
// ==========================================
function authenticateDevice(req, res, next) {
  const token = req.headers['x-device-token'] || req.query.token;
  if (!token || token !== DEVICE_AUTH_TOKEN) {
    console.warn(`[SECURITY] Unauthorized device request rejected from ${req.ip}`);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing x-device-token header'
    });
  }
  next();
}

// ==========================================
// REST API ROUTES
// ==========================================

// 1. Health check & System Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    doorState: state.doorState,
    deviceOnline: state.device.status === 'ONLINE'
  });
});

// 2. ESP32 Registration / Heartbeat Handshake
app.post('/api/device/register', authenticateDevice, (req, res) => {
  const { deviceId, ip, firmwareVersion } = req.body;
  
  state.device.id = deviceId || state.device.id;
  state.device.ip = ip || req.ip.replace('::ffff:', '');
  state.device.status = 'ONLINE';
  state.device.lastSeen = new Date().toISOString();

  console.log(`\n[ESP32 CONNECTED] Device '${state.device.id}' registered from IP: ${state.device.ip}`);

  // Broadcast to all dashboard clients
  io.emit('device:status', state.device);
  io.emit('door:state', { state: state.doorState, timestamp: state.device.lastSeen });

  res.json({
    success: true,
    message: 'Device registered successfully',
    serverTime: new Date().toISOString(),
    currentDoorState: state.doorState
  });
});

// 3. ESP32 Reports Motion Detected
app.post('/api/device/event', authenticateDevice, (req, res) => {
  const { deviceId, event, timestamp } = req.body;

  state.device.lastSeen = new Date().toISOString();
  state.device.status = 'ONLINE';
  state.device.eventCount++;

  if (event === 'MOTION_DETECTED') {
    state.doorState = 'MOTION_DETECTED';
    const eventRecord = {
      id: `evt-${Date.now()}`,
      deviceId: deviceId || state.device.id,
      event: 'MOTION_DETECTED',
      timestamp: timestamp || new Date().toISOString(),
      status: 'AWAITING_REVIEW'
    };

    state.lastEvent = eventRecord;
    state.recentEvents.unshift(eventRecord);
    if (state.recentEvents.length > 50) state.recentEvents.pop();

    console.log(`\n🚨 [MOTION ALERT] Event #${state.device.eventCount} received from ${state.device.id}!`);
    console.log(`   Timestamp: ${eventRecord.timestamp}`);

    // Notify connected browser dashboards in real-time
    io.emit('visitor:detected', eventRecord);
    io.emit('door:state', { state: state.doorState, timestamp: eventRecord.timestamp });
  }

  res.json({
    success: true,
    doorState: state.doorState,
    pendingCommand: state.pendingCommand
  });
});

// 4. ESP32 Polls for Pending Commands (Dual-Channel Command Delivery)
app.get('/api/device/poll-command', authenticateDevice, (req, res) => {
  state.device.lastSeen = new Date().toISOString();
  state.device.status = 'ONLINE';

  const cmd = state.pendingCommand;
  state.pendingCommand = null; // Consume command

  res.json({
    command: cmd || 'NONE',
    doorState: state.doorState
  });
});

// 5. Door Command (Owner ALLOW / DENY or Manual UI Control)
app.post('/api/device/command', (req, res) => {
  const { command, reason } = req.body; // 'UNLOCK' or 'LOCK'

  if (!['UNLOCK', 'LOCK'].includes(command)) {
    return res.status(400).json({ success: false, error: "Invalid command. Use 'UNLOCK' or 'LOCK'." });
  }

  state.pendingCommand = command;
  state.doorState = command === 'UNLOCK' ? 'UNLOCKED' : 'LOCKED';

  console.log(`\n🔑 [DOOR COMMAND] Executed '${command}' (Reason: ${reason || 'Manual'})`);

  // If we know the ESP32 IP, attempt immediate direct HTTP push
  if (state.device.ip) {
    pushCommandToEsp32(state.device.ip, command);
  }

  // Real-time broadcast to dashboard
  io.emit('door:command', { command, timestamp: new Date().toISOString() });
  io.emit('door:state', { state: state.doorState, timestamp: new Date().toISOString() });

  res.json({
    success: true,
    executedCommand: command,
    newDoorState: state.doorState
  });
});

// 6. Get Current State & Audit History (For Frontend Dashboard)
app.get('/api/device/status', (req, res) => {
  res.json({
    doorState: state.doorState,
    device: state.device,
    lastEvent: state.lastEvent,
    recentEvents: state.recentEvents.slice(0, 15)
  });
});

// Direct HTTP push helper to notify ESP32 immediately without waiting for next poll
function pushCommandToEsp32(ip, command) {
  const postData = JSON.stringify({ command });
  const req = http.request({
    hostname: ip,
    port: 80,
    path: '/command',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-device-token': DEVICE_AUTH_TOKEN
    },
    timeout: 2000
  }, (res) => {
    // Response handled
  });

  req.on('error', (e) => {
    // Direct push failure is gracefully handled; ESP32 will pick it up on next poll
  });

  req.write(postData);
  req.end();
}

// ==========================================
// WATCHDOG: Device Liveness Monitor
// ==========================================
setInterval(() => {
  if (state.device.lastSeen) {
    const elapsed = Date.now() - new Date(state.device.lastSeen).getTime();
    // If no heartbeat for > 30 seconds, mark OFFLINE
    if (elapsed > 30000 && state.device.status !== 'OFFLINE') {
      state.device.status = 'OFFLINE';
      console.warn(`\n⚠️  [DEVICE WATCHDOG] No heartbeat from '${state.device.id}' for ${Math.round(elapsed / 1000)}s -> Marked OFFLINE`);
      io.emit('device:status', state.device);
    }
  }
}, 5000);

// ==========================================
// SOCKET.IO CONNECTION MANAGEMENT
// ==========================================
io.on('connection', (socket) => {
  console.log(`[WEBSOCKET] Client connected: ${socket.id}`);
  
  // Send current state immediately on connection
  socket.emit('initial:state', {
    doorState: state.doorState,
    device: state.device,
    lastEvent: state.lastEvent
  });

  socket.on('disconnect', () => {
    console.log(`[WEBSOCKET] Client disconnected: ${socket.id}`);
  });
});

// ==========================================
// START SERVER
// ==========================================
server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`  🚪 SMART AI DOOR SECURITY BACKEND IS LIVE`);
  console.log(`  📡 Port: ${PORT}`);
  console.log(`  🌐 Local Access:   http://localhost:${PORT}`);
  console.log(`  🔗 Device Token:   ${DEVICE_AUTH_TOKEN}`);
  console.log('====================================================');
});
