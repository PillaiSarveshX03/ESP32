# 🌬️ Smart Automated HVAC / Smart Vent Damper System

A full-stack, end-to-end IoT climate control solution powered by **ESP32**, **DHT11**, **PIR Motion Sensor**, **Servo Damper (SG90/MG995)**, a **Node.js** WebSocket Hub, and a glassmorphic **React** dashboard.

---

## 🌟 Key Features

1. **Autonomous Dual-Mode Damper Control**:
   - **AUTO (Smart Climate Logic)**:
     - **Occupied & Hot** ($T_{room} > T_{target}$): Damper opens 100% (180°) for high airflow.
     - **Occupied & Balanced** ($T_{room} \approx T_{target}$): Damper maintains 50% (90°) comfort airflow.
     - **Unoccupied (Eco Mode)**: Damper throttles down (0°–15°) after PIR timeout to reduce energy loss.
   - **MANUAL Override**: Direct interactive slider control with quick presets (0°, 45°, 90°, 135°, 180°).
2. **Real-time Telemetry Streaming**:
   - Live Temperature (°C / °F), Humidity (%), Apparent Heat Index, PIR Occupancy Radar, Damper Angle, and WiFi RSSI.
3. **Built-in Mock Hardware Simulator**:
   - Test and demonstrate all smart vent reactions right from the web dashboard even before flashing or attaching physical ESP32 hardware!
4. **Lightweight ESP32 Communication**:
   - 100% offloaded UI: The ESP32 handles simple JSON over WebSocket (`ws://<SERVER_IP>:5000/ws/esp32`), allowing lightning-fast responsive control without freezing.

---

## 📁 Project Structure

```
smart-hvac-system/
├── esp32/
│   ├── README.md                      # Arduino IDE setup & library prerequisites
│   └── smart_vent_firmware/
│       └── smart_vent_firmware.ino    # ESP32 C++ firmware (WebSocketsClient + ArduinoJson)
├── server/
│   ├── package.json
│   ├── server.js                      # Express + ws Relay & State Persistence
│   └── .env.example
└── client/                            # React + Vite Dashboard
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── index.css                  # Cyber-clean glassmorphic dark theme
        ├── hooks/
        │   └── useWebSocket.js        # Reconnecting WebSocket hook
        └── components/
            ├── Header.jsx             # Live status badges, WiFi RSSI
            ├── ClimateCard.jsx        # Radial Temp Gauge, Humidity, Heat Index
            ├── VentControlCard.jsx    # SVG Damper visualizer, Slider, Auto/Manual
            ├── OccupancyCard.jsx      # PIR Radar scan, Eco countdown timer
            ├── TelemetryChart.jsx     # Live multi-series rolling timeline
            ├── SimulatorPanel.jsx     # Testing scenarios & climate sliders
            └── SettingsModal.jsx      # Setpoints & Calibration
```

---

## ⚡ Quick Start Guide

### 🚀 1-Click Launch (Windows)
Double-click [`start-system.bat`](file:///c:/Users/Sarvesh%20Pillai/Desktop/git/ESP32/smart-hvac-system/start-system.bat) in the root folder. It will:
1. Verify dependencies and run `npm install` if required.
2. Launch the Node.js backend hub on port 5000.
3. Launch the Vite React dashboard on port 3000.
4. Open `http://localhost:3000` automatically in your browser.

To stop both services at any time, run [`stop-system.bat`](file:///c:/Users/Sarvesh%20Pillai/Desktop/git/ESP32/smart-hvac-system/stop-system.bat).

---

### Manual Launch

### Step 1: Start the Backend Hub
```bash
cd smart-hvac-system/server
npm install
npm start
```
*Backend runs on `http://localhost:5000` (`ws://localhost:5000/ws/esp32` and `ws://localhost:5000/ws/client`)*.

---

### Step 2: Start the Web Dashboard
```bash
cd smart-hvac-system/client
npm install
npm run dev
```
*Open `http://localhost:3000` in your browser to view the live dashboard!*

---

### Step 3: Flash ESP32 Firmware
1. Open `smart-hvac-system/esp32/smart_vent_firmware/smart_vent_firmware.ino` in **Arduino IDE**.
2. Install required libraries:
   - `WebSockets` by Markus Sattler
   - `ArduinoJson` by Benoit Blanchon
   - `DHT sensor library` by Adafruit
   - `Adafruit Unified Sensor`
   - `ESP32Servo` by Kevin Harrington
3. Update `WIFI_SSID`, `WIFI_PASSWORD`, and `WS_SERVER_HOST` (your PC's local LAN IP).
4. Connect ESP32 via USB and click **Upload**.

---

## 🔌 Hardware Wiring & Pin Mapping

| Component | Pin on ESP32 | Voltage (VCC) | Ground (GND) |
| :--- | :--- | :--- | :--- |
| **DHT11 Data** | `GPIO 4` | 3.3V or 5V | GND |
| **PIR Sensor Out** | `GPIO 13` | 5V / 3.3V | GND |
| **Servo Signal (PWM)** | `GPIO 18` | 5V (VIN or Ext 5V) | GND (Common) |
