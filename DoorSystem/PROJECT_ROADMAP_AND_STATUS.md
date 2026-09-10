# 🚪 Smart AI Door Security System — Project Roadmap & Status

> **Current Status**: **Phases 1 to 4 Complete & Production-Verified**  
> **Presentation Readiness**: **Ready for Demo**  
> **Last Updated**: September 10, 2026

---

## 📊 Summary of Completed Phases (Phases 1 – 4)

| Phase | Description | Key Deliverables & Achievements | Status |
|---|---|---|---|
| **Phase 1** | **ESP32 Hardware Core & Electrical Safety** | • ESP32 DevKit V1 pin configuration.<br>• PIR Motion Sensor (GPIO 27) debounce & warmup filter.<br>• Software PWM current limiting for Red (GPIO 25) & Green (GPIO 26) LEDs for zero-resistor breadboard protection (`SAFE_LED_DUTY_CYCLE = 22`). | ✅ **Completed & Verified** |
| **Phase 2** | **Actuator Latch Control & Physical Calibration** | • SG90 Micro-Servo latch on GPIO 13.<br>• Exact physical angle constraints ($0^\circ$ = Locked, $90^\circ$ = Unlocked).<br>• Smooth glide stepping loop (`25ms/degree`) eliminating power rail jitter & electrical resets. | ✅ **Completed & Verified** |
| **Phase 3** | **Wi-Fi Connectivity & Express Realtime Backend** | • Node.js + Express + Socket.IO server on port `5000`.<br>• Pre-shared token security (`x-device-token`).<br>• Dual-channel communication (Direct HTTP push + fallback polling).<br>• Live motion event ingestion and watchdog liveness monitor. | ✅ **Completed & Verified** |
| **Phase 4** | **React + Vite Dark Security Dashboard** | • Modern glassmorphism dark console at `http://localhost:5173`.<br>• `DoorStatusHero` with real-time state badge & manual controls.<br>• `VisitorRequestCard` with visitor photo & identification.<br>• `DevSimulatorBar` for end-to-end testing without standing up.<br>• `EventHistoryTable` live audit logging.<br>• **Full Bi-directional State Sync**: ESP32 reports state back to `/api/device/state`, and door holds unlock state under full Web Dashboard authority. | ✅ **Completed & Verified** |

---

## 🎯 Demo Guide for Tomorrow's Presentation

### 1. Starting the System (One-Click Launch)
Simply double-click the master launcher in the project root:
* 🚀 **`start_all.bat`** — Launches Backend Server, Frontend Dev Server, and opens your browser to `http://localhost:5173` automatically!
* 🛑 **`stop_all.bat`** — Closes all active processes and frees ports `5000` & `5173` instantly!

*Individual Scripts (if needed):*
* ⚙️ **`start_backend.bat`** — Starts Node.js backend on `http://localhost:5000`.
* 💻 **`start_frontend.bat`** — Starts React security console on `http://localhost:5173`.

*ESP32 Hardware:*
* Power on ESP32 connected to Wi-Fi `Airtel_praf_7435`.
* Onboard Blue LED turns solid blue when connected.
* Physical Red LED turns ON (System Secure & Armed at $0^\circ$).

---

### 2. Live Demo Flow for Presentation

1. **Show Standby Security State**:
   - Point out that Red LED is ON, servo is locked at $0^\circ$, and Web Dashboard displays **`DOOR LOCKED`** in green/red armed mode with live hardware telemetry.
2. **Demonstrate Visitor Approach (PIR Motion)**:
   - Wave hand in front of the PIR sensor.
   - Hardware sends instant HTTP POST to backend.
   - Dashboard flashes **`MOTION DETECTED`**, sounds an alert, and displays the **Visitor Request Card** with visitor prompt.
   - Highlight: *The door stays locked by default (fail-secure design) until the owner explicitly approves entry.*
3. **Demonstrate Remote Unlock**:
   - Click **`ALLOW / UNLOCK DOOR`** on the web console.
   - SG90 servo rotates smoothly from $0^\circ \to 90^\circ$.
   - Red LED turns OFF, Green LED turns ON.
   - Web console updates immediately to **`DOOR UNLOCKED`**.
4. **Demonstrate Remote Lock**:
   - Click **`LOCK / SECURE`** on the web console.
   - SG90 servo rotates back to $0^\circ$.
   - Green LED turns OFF, Red LED turns ON.
   - Web console automatically updates to **`DOOR LOCKED`**.
5. **Show Real-Time Audit Log**:
   - Scroll down to the **Security Event History Table** showing timestamped entries for Motion Triggers, Remote Commands, and Door State transitions.

---

## 🔮 Remaining Phases (Roadmap for Next Sprints)

```
[Phase 1: HW Baseline]  ──► [Phase 2: Servo Latch]  ──► [Phase 3: Backend Gateway]  ──► [Phase 4: Web Console]  (DONE)
                                                                                                  │
                                                                                                  ▼
[Phase 7: Hardware Polish] ◄── [Phase 6: Notifications/Cloud] ◄── [Phase 5: Gemini AI Intelligence] (NEXT)
```

---

### 📍 Phase 5: Google Gemini AI Multimodal Security Intelligence *(ON HOLD - Next Up)*
* **Objective**: Transform standard visitor detection into an intelligent AI concierge using Google Gemini 2.5 Flash / 1.5 Flash.
* **Key Tasks**:
  1. **Multimodal Analysis Service**:
     - Integrate `@google/genai` in Node.js backend.
     - Analyze visitor image snapshot (apparel, delivery packages, badges, concealed objects).
     - Analyze visitor spoken statement / speech transcript (*"I have a package delivery from Amazon for Apt 4B"*).
  2. **Structured AI Assessment**:
     - Classify visitor category: `COURIER_DELIVERY`, `SERVICE_TECHNICIAN`, `KNOWN_FRIEND`, `SUSPICIOUS_LOITERER`, `SOLICITOR`.
     - Output `riskLevel`: `LOW`, `MEDIUM`, `HIGH`.
     - Output `recommendation`: `ALLOW_ENTRY`, `HOLD_FOR_CONFIRMATION`, `DENY_ENTRY`.
     - Output `confidenceScore` ($0\% - 100\%$) and 1-sentence executive reasoning.
  3. **Frontend AI Radar & Insights**:
     - Real-time Gemini AI Advisory badge with color-coded risk meter.
     - One-click smart response buttons mapped to AI recommendations.
  4. **Multi-Scenario Simulator**:
     - Test presets for Amazon delivery, internet technician, friendly neighbor, and nighttime suspicious loiterer.

---

### 📍 Phase 6: Cloud Storage, Live Video Stream & Push Notifications
* **Objective**: Production cloud connectivity, image/video storage, and mobile alerts.
* **Key Tasks**:
  1. **ESP32-CAM / USB Webcam Stream Integration**:
     - Stream live video feed directly into the React dashboard.
     - Snapshot capture on PIR trigger.
  2. **Cloud Media Storage (Firebase Storage / AWS S3 / Cloudinary)**:
     - Automatically upload visitor photos and associate permanent URLs with audit events.
  3. **Mobile Push & Webhook Alerts (Telegram / WhatsApp / Pushover / Email)**:
     - Immediate push notifications with visitor photo and 1-tap Approve/Deny buttons.
  4. **Persistent Database Integration (SQLite / PostgreSQL / MongoDB)**:
     - Store long-term security event history, visitor logs, and AI confidence records.

---

### 📍 Phase 7: Hardware Packaging, Power Management & Final Enclosure
* **Objective**: Transition from breadboard prototype to a polished, deployable physical unit.
* **Key Tasks**:
  1. **3D Printed Enclosure Design / Mounting**:
     - Compact housing for ESP32, SG90 servo, LEDs, and PIR sensor with clean wire routing.
  2. **Power Supply & Battery Backup**:
     - Dedicated $5\text{V} / 2\text{A}$ power rail with 18650 Li-ion battery backup and charge controller.
  3. **Hardware Killswitch & Manual Override Button**:
     - Physical emergency exit button on interior side.
  4. **Final System Documentation & User Manual**:
     - Complete schematics, wiring diagrams, API documentation, and deployment instructions.

---

## 🛠️ Hardware Pinout Quick Reference

| ESP32 Pin | Component | Function / Mode |
|---|---|---|
| **GPIO 27** | PIR Motion Sensor | Digital Input (High on movement) |
| **GPIO 25** | Red LED | PWM Output (Locked indicator, safe duty cycle: `22`) |
| **GPIO 26** | Green LED | PWM Output (Unlocked / Motion indicator, safe duty cycle: `22`) |
| **GPIO 2** | Onboard Blue LED | Digital Output (Wi-Fi status: Blinking = Connecting, Solid = Connected) |
| **GPIO 13** | SG90 Servo Latch | PWM Signal ($500\mu\text{s} - 2500\mu\text{s}$, $0^\circ$ Locked, $90^\circ$ Unlocked) |
| **5V / VIN** | SG90 Red Wire | Actuator Power |
| **GND** | Common Ground | Common Ground for all components |

---

## 🌐 Network & Endpoint Reference

* **ESP32 IP**: `192.168.1.16` (Port 80)
* **Backend Gateway**: `http://192.168.1.6:5000` / `http://localhost:5000`
* **Frontend Console**: `http://localhost:5173`
* **Device Auth Token**: `smart-door-esp32-secret-token-2026`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/device/register` | ESP32 initial registration and IP sync |
| `POST` | `/api/device/event` | Motion trigger alert from ESP32 |
| `POST` | `/api/device/state` | Bi-directional door state confirmation (`LOCKED` / `UNLOCKED`) |
| `GET` | `/api/device/poll-command` | ESP32 polling fallback for pending commands |
| `POST` | `/api/device/command` | Owner command dispatch (`UNLOCK` / `LOCK`) |
| `GET` | `/api/device/status` | Dashboard system health and recent audit history |
