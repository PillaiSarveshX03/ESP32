const express = require('express');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// WebSocket Servers for ESP32 and React Web Dashboard
const wssESP32 = new WebSocketServer({ noServer: true });
const wssClient = new WebSocketServer({ noServer: true });

// --- System State Store ---
const state = {
  temperature: null,
  humidity: null,
  heatIndex: null,
  motion: false,
  occupied: false,
  servoAngle: 0,
  mode: 'AUTO',       // 'AUTO' | 'MANUAL'
  targetTemp: 24.0,
  ecoAngle: 0,
  balancedAngle: 90,
  maxAngle: 180,
  rssi: null,
  uptime: 0,
  lastSeen: null,
  lastMotionTime: null,
  pirTimeoutSec: 20,
  espConnected: false,
  simulatorActive: false
};

// Rolling history buffer for frontend charts (max 60 points)
const historyBuffer = [];
function addHistoryPoint(data) {
  if (data.temperature === null || data.temperature === undefined) return;
  const point = {
    timestamp: new Date().toLocaleTimeString(),
    rawTime: Date.now(),
    temperature: Number(Number(data.temperature).toFixed(1)),
    humidity: Number(Number(data.humidity).toFixed(1)),
    heatIndex: Number(Number(data.heatIndex).toFixed(1)),
    servoAngle: data.servoAngle,
    motion: data.motion,
    occupied: data.occupied
  };
  historyBuffer.push(point);
  if (historyBuffer.length > 60) {
    historyBuffer.shift();
  }
}

// Compute Heat Index helper
function calculateHeatIndex(tempC, humidity) {
  const tempF = (tempC * 9 / 5) + 32;
  let hiF = 0.5 * (tempF + 61.0 + ((tempF - 68.0) * 1.2) + (humidity * 0.094));
  if (hiF >= 80.0) {
    hiF = -42.379 + 2.04901523 * tempF + 10.14333127 * humidity
      - 0.22475541 * tempF * humidity - 0.00683783 * tempF * tempF
      - 0.05481717 * humidity * humidity + 0.00122874 * tempF * tempF * humidity
      + 0.00085282 * tempF * humidity * humidity - 0.00000199 * tempF * tempF * humidity * humidity;
  }
  return Number(((hiF - 32) * 5 / 9).toFixed(1));
}

// Broadcast system state to all connected web clients
function broadcastToClients() {
  const payload = JSON.stringify({
    type: 'state_update',
    data: {
      ...state,
      clientCount: wssClient.clients.size,
      history: historyBuffer.slice(-20)
    }
  });

  wssClient.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Send command payload to connected ESP32
function sendToESP32(commandObj) {
  const msg = JSON.stringify(commandObj);
  let sent = false;
  wssESP32.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
      sent = true;
    }
  });
  return sent;
}

// --- WebSocket Connection Routing ---
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);

  if (pathname === '/ws/esp32') {
    wssESP32.handleUpgrade(request, socket, head, (ws) => {
      wssESP32.emit('connection', ws, request);
    });
  } else if (pathname === '/ws/client') {
    wssClient.handleUpgrade(request, socket, head, (ws) => {
      wssClient.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// --- ESP32 WebSocket Handlers ---
wssESP32.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[ESP32] Hardware connected from ${ip}`);
  state.espConnected = true;
  state.simulatorActive = false; // Real hardware takes precedence
  broadcastToClients();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'telemetry') {
        state.temperature = data.temperature;
        state.humidity = data.humidity;
        state.heatIndex = data.heatIndex || calculateHeatIndex(data.temperature, data.humidity);
        state.motion = !!data.motion;
        state.occupied = !!data.occupied;
        state.servoAngle = data.servoAngle;
        state.mode = data.mode || state.mode;
        state.targetTemp = data.targetTemp || state.targetTemp;
        state.ecoAngle = data.ecoAngle !== undefined ? data.ecoAngle : state.ecoAngle;
        state.rssi = data.rssi || -60;
        state.uptime = data.uptime || state.uptime;
        state.lastSeen = Date.now();

        if (state.motion) {
          state.lastMotionTime = Date.now();
        }

        addHistoryPoint(state);
        broadcastToClients();
      }
    } catch (err) {
      console.error('[ESP32] Error parsing message:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('[ESP32] Hardware disconnected');
    state.espConnected = false;
    state.temperature = null;
    state.humidity = null;
    state.heatIndex = null;
    state.rssi = null;
    state.motion = false;
    state.occupied = false;
    broadcastToClients();
  });

  ws.on('error', (err) => {
    console.error('[ESP32] WS error:', err.message);
  });
});

// --- React Client WebSocket Handlers ---
wssClient.on('connection', (ws) => {
  console.log(`[CLIENT] Web dashboard client connected (Total: ${wssClient.clients.size})`);
  
  // Send immediate initial sync
  ws.send(JSON.stringify({
    type: 'initial_state',
    data: {
      ...state,
      clientCount: wssClient.clients.size,
      history: historyBuffer
    }
  }));

  ws.on('message', (message) => {
    try {
      const cmd = JSON.parse(message.toString());
      console.log('[CLIENT] Command received:', cmd);

      if (cmd.action === 'set_mode') {
        state.mode = cmd.mode === 'MANUAL' ? 'MANUAL' : 'AUTO';
        if (state.espConnected) {
          sendToESP32({ action: 'set_mode', mode: state.mode });
        }
      } else if (cmd.action === 'set_servo') {
        const angle = Math.max(0, Math.min(180, Number(cmd.angle)));
        state.servoAngle = angle;
        if (state.espConnected) {
          sendToESP32({ action: 'set_servo', angle: angle });
        }
      } else if (cmd.action === 'set_target_temp') {
        const t = Number(cmd.targetTemp);
        if (!isNaN(t) && t >= 15 && t <= 35) {
          state.targetTemp = t;
          if (state.espConnected) {
            sendToESP32({ action: 'set_target_temp', targetTemp: t });
          }
        }
      } else if (cmd.action === 'set_eco_angle') {
        const eco = Math.max(0, Math.min(180, Number(cmd.ecoAngle)));
        state.ecoAngle = eco;
        if (state.espConnected) {
          sendToESP32({ action: 'set_eco_angle', ecoAngle: eco });
        }
      } else if (cmd.action === 'toggle_simulator') {
        state.simulatorActive = !!cmd.active;
      } else if (cmd.action === 'simulate_motion') {
        state.motion = !!cmd.motion;
        if (state.motion) {
          state.lastMotionTime = Date.now();
          state.occupied = true;
        }
      } else if (cmd.action === 'simulate_temp') {
        const newT = Number(cmd.temperature);
        if (!isNaN(newT)) {
          state.temperature = newT;
          state.heatIndex = calculateHeatIndex(newT, state.humidity);
        }
      } else if (cmd.action === 'simulate_humidity') {
        const newH = Number(cmd.humidity);
        if (!isNaN(newH)) {
          state.humidity = newH;
          state.heatIndex = calculateHeatIndex(state.temperature, newH);
        }
      }

      broadcastToClients();
    } catch (err) {
      console.error('[CLIENT] Command error:', err.message);
    }
  });

  ws.on('close', () => {
    console.log(`[CLIENT] Web dashboard client disconnected (Total: ${wssClient.clients.size})`);
    broadcastToClients();
  });
});

// --- Mock Hardware Simulator Engine ---
// Runs automatically when no physical ESP32 is connected or when simulator is active
let simTick = 0;
setInterval(() => {
  if (state.simulatorActive && !state.espConnected) {
    simTick++;
    state.uptime += 2;
    state.lastSeen = Date.now();

    // Check occupancy based on PIR timeout
    const now = Date.now();
    const timeSinceMotion = (now - state.lastMotionTime) / 1000;
    state.occupied = (state.motion || timeSinceMotion < state.pirTimeoutSec);

    // Dynamic temperature drift simulation
    if (state.mode === 'AUTO') {
      if (state.occupied) {
        // Room is occupied: damper reacts to cool or warm
        if (state.temperature > state.targetTemp + 0.3) {
          // Vent opens wide (180°) -> Cooling airflow reduces temp gradually
          state.servoAngle = state.maxAngle;
          state.temperature = Math.max(state.targetTemp - 0.5, state.temperature - 0.06);
        } else if (state.temperature < state.targetTemp - 0.3) {
          // Vent closes (0°) -> Room warms slightly from ambient
          state.servoAngle = state.ecoAngle;
          state.temperature = Math.min(state.targetTemp + 1.5, state.temperature + 0.05);
        } else {
          // Balanced comfort mode (90°)
          state.servoAngle = state.balancedAngle;
          state.temperature += (Math.random() - 0.48) * 0.04;
        }
      } else {
        // Unoccupied: Eco mode damper (0°) -> Ambient natural drift
        state.servoAngle = state.ecoAngle;
        state.temperature += 0.03 * (26.5 - state.temperature);
      }
    }

    // Gentle humidity oscillation
    state.humidity = Math.max(30, Math.min(80, state.humidity + (Math.random() - 0.5) * 0.2));
    state.heatIndex = calculateHeatIndex(state.temperature, state.humidity);

    // Random realistic motion toggle in simulation (every ~30s if idle)
    if (simTick % 18 === 0 && Math.random() > 0.4) {
      state.motion = true;
      state.lastMotionTime = Date.now();
      state.occupied = true;
      setTimeout(() => {
        state.motion = false;
        broadcastToClients();
      }, 4000);
    }

    addHistoryPoint(state);
    broadcastToClients();
  }
}, 2000);

// --- REST Endpoints ---
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    system: state,
    clients: wssClient.clients.size,
    espConnected: state.espConnected,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/history', (req, res) => {
  res.json({
    count: historyBuffer.length,
    history: historyBuffer
  });
});

app.post('/api/control', (req, res) => {
  const { mode, angle, targetTemp, ecoAngle } = req.body;
  if (mode) state.mode = mode;
  if (angle !== undefined) state.servoAngle = Number(angle);
  if (targetTemp !== undefined) state.targetTemp = Number(targetTemp);
  if (ecoAngle !== undefined) state.ecoAngle = Number(ecoAngle);

  if (state.espConnected) {
    if (mode) sendToESP32({ action: 'set_mode', mode });
    if (angle !== undefined) sendToESP32({ action: 'set_servo', angle });
    if (targetTemp !== undefined) sendToESP32({ action: 'set_target_temp', targetTemp });
    if (ecoAngle !== undefined) sendToESP32({ action: 'set_eco_angle', ecoAngle });
  }

  broadcastToClients();
  res.json({ success: true, state });
});

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 Smart HVAC Backend Server running on port ${PORT}`);
  console.log(`📡 ESP32 WebSocket endpoint: ws://localhost:${PORT}/ws/esp32`);
  console.log(`💻 Web Client WebSocket endpoint: ws://localhost:${PORT}/ws/client`);
  console.log(`🌐 REST API: http://localhost:${PORT}/api/status`);
  console.log(`=================================================\n`);
});
