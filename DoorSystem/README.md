# 🚪 Smart AI Door Security System

A modern, production-grade smart residential/office security access control prototype. It combines an **ESP32 DevKit V1** hardware controller with a **Node.js/Express + Socket.IO** backend, an **AI Advisory Service (Google Gemini)**, and a **React + Vite** security command dashboard.

---

## 1. Introduction

Traditional doorbells merely ring a chime, leaving owners blind to who is outside. Commercial smart doorbells frequently run proprietary code that traps users in expensive subscriptions.

The **Smart AI Door Security System** addresses this with an open, modular, fail-secure architecture:
1. **Motion Detection**: A PIR sensor detects an approaching individual.
2. **Visitor Engagement**: The visitor is prompted to state their identity and purpose.
3. **AI Summarization**: The backend summarizes the visitor's intent and flags suspicious discrepancies as an *advisory note* for the owner.
4. **Owner Authority**: The owner reviews the live request, visitor statement, photograph, and AI assessment on a responsive web dashboard.
5. **Physical Actuation**: The owner issues an `ALLOW` or `DENY` decision, commanding the ESP32 to safely actuate the servo latch and visual indicators.

> [!IMPORTANT]
> **AI Authority Principle**: In this prototype, AI **never** automatically unlocks the door. It acts strictly as an intelligence advisor; the human owner retains final, exclusive access authority.

---

## 2. System Architecture

```text
┌────────────────────────────────────────────────────────┐
│               ESP32 HARDWARE CONTROLLER                │
│                                                        │
│  [PIR Sensor] ── GPIO 27 ──┐                           │
│  [Red LED]    ◄── GPIO 25 ─┼── [ESP32 DevKit V1]       │
│  [Green LED]  ◄── GPIO 26 ─┤       │ (Wi-Fi)           │
│  [SG90 Servo] ◄── GPIO 13 ─┘       ▼                   │
└────────────────────────────────────┼───────────────────┘
                                     │ HTTP REST / WebSockets
                                     ▼
┌────────────────────────────────────────────────────────┐
│                    BACKEND SERVER                      │
│             (Node.js + Express + Socket.IO)            │
│                                                        │
│  • REST API Gateway (Device telemetry & Owner actions) │
│  • Duplex Realtime Gateway (Socket.IO events)          │
│  • Centralized Door State Machine (LOCKED, PENDING...) │
│  • Local SQLite Storage (Users, Devices, Audit Events) │
│  • AI Service Layer (Google Gemini 1.5/2.0 API)        │
└────────────────────────────────────┬───────────────────┘
                                     │ WebSockets & Authenticated REST
                                     ▼
┌────────────────────────────────────────────────────────┐
│                 OWNER WEB APPLICATION                  │
│                   (React 18 + Vite)                    │
│                                                        │
│  • Real-time Door Status Indicator & Telemetry         │
│  • Instant Visitor Request Cards (Allow / Deny)        │
│  • Interactive Visitor Identification Modal            │
│  • Filterable Audit Log & Historical Event Timeline    │
│  • Integrated Simulator (Test without physical board)  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Hardware Requirements

| Item | Quantity | Description / Specifications |
| :--- | :--- | :--- |
| **ESP32 DevKit V1** | 1 | 30-pin or 36-pin dual-core development board |
| **PIR Motion Sensor** | 1 | HC-SR501 (recommended) or AM312 mini sensor |
| **Servo Motor** | 1 | SG90 9g micro-servo (4.8V – 6V) |
| **Red 5mm LED** | 1 | Indicates Locked / Denied / Cooldown state |
| **Green 5mm LED** | 1 | Indicates Motion Detected / Access Granted |
| **Solderless Breadboard** | 1 | 400-point or 830-point breadboard |
| **Jumper Wires** | 10+ | Male-to-Male (M-M) and Male-to-Female (M-F) |
| **Micro-USB Cable** | 1 | Data-capable cable for programming and power |
| *(Future)* Resistors | 2 | 220Ω to 330Ω (read safety section below) |
| *(Future)* Camera | 1 | ESP32-CAM or USB Webcam |

---

## 4. Software Requirements

- **Arduino IDE** (v2.0 or higher) or PlatformIO
- **ESP32 Board Package by Espressif** (installed via Arduino Board Manager)
- **Node.js** (v18.0.0 or v20.0.0 LTS) and **npm** (v9+)
- **Git**
- **Modern Web Browser** (Chrome, Firefox, Edge, Brave)

---

## 5. Repository Folder Structure

```text
DoorSystem/
├── esp32/
│   ├── phase1_pir_led/
│   │   └── phase1_pir_led.ino    # Current: Phase 1 PIR & LED test firmware
│   ├── phase2_servo/
│   │   └── phase2_servo.ino      # Phase 2: Servo locking integration
│   └── firmware/
│       ├── config.h              # Wi-Fi, pin mappings, timeouts
│       └── firmware.ino          # Full networked ESP32 firmware
├── backend/
│   ├── config/                   # Database & server configuration
│   ├── controllers/              # REST endpoint logic
│   ├── middleware/               # Auth, error handling, rate limiting
│   ├── models/                   # SQLite database models
│   ├── routes/                   # Express route definitions
│   ├── services/                 # AI service & State Machine
│   ├── sockets/                  # Socket.IO realtime connection handlers
│   └── server.js                 # Server entry point
├── frontend/
│   ├── public/                   # Static assets & test images
│   └── src/
│       ├── components/           # UI components (Cards, Navbar, Modals)
│       ├── context/              # Auth & Socket state providers
│       ├── services/             # Axios API & Socket client instances
│       └── App.jsx               # Dashboard entry point
├── docs/                         # Additional diagrams & specifications
├── .env.example                  # Environment variable reference
├── .gitignore                    # Git tracking ignore rules
└── README.md                     # Project documentation
```

---

## 6. Hardware Wiring & Electrical Safety

### Complete Pin Assignment Table

| Component | Component Pin | ESP32 Pin | Purpose | Electrical Note |
| :--- | :--- | :--- | :--- | :--- |
| **PIR Sensor** | VCC | **VIN (5V)** | Power Supply | Connect to VIN when powered via USB (5V). |
| | GND | **GND** | Ground | Connect to ESP32 ground rail. |
| | OUT | **GPIO 27** | Motion Signal | Digital 3.3V logic (ESP32 safe). |
| **Red LED** | Anode (Long +) | **GPIO 25** | Denied / Locked | Driven via safe PWM current limiter. |
| | Cathode (Short -)| **GND** | Ground | Connect to ground rail. |
| **Green LED** | Anode (Long +) | **GPIO 26** | Granted / Motion | Driven via safe PWM current limiter. |
| | Cathode (Short -)| **GND** | Ground | Connect to ground rail. |
| **Servo Motor** | VCC (Red wire) | **VIN (5V)** | Motor Power | Do NOT connect to 3.3V. Powers from USB 5V. |
| *(SG90)* | GND (Brown wire)| **GND** | Ground | Common system ground. |
| | SIG (Orange wire)| **GPIO 13** | PWM Control | Standard 50Hz PWM signal. |

---

### ⚠️ CRITICAL NOTICE: Running LEDs with ZERO Resistors

If you connect an LED directly between an ESP32 3.3V pin and GND with **NO resistor**, the LED forward voltage drop ($1.8\text{V}-2.0\text{V}$ for Red) causes an effective short circuit. The GPIO will attempt to deliver 50–80 mA. 

Because the ESP32 is rated for **maximum 12 mA recommended per pin**, this can permanently burn out the microcontroller's internal output transistor or destroy your LED.

#### The Safe Prototype Solution implemented in Phase 1 & 2:
The firmware utilizes **Hardware PWM Current Limiting** (`analogWrite` / `ledc`):
- Instead of keeping the pin continuously `HIGH` (100% duty cycle), it pulses at a safe ~8% duty cycle (`SAFE_LED_DUTY_CYCLE = 22/255`).
- This restricts average power dissipation while keeping the LED visibly illuminated in typical room lighting.
- Once you obtain **220Ω to 330Ω resistors**, wire them in series with each LED anode and set `USE_PWM_CURRENT_LIMIT = false` in the firmware.

---

## 7. Phase 2: SG90 Servo Latch Setup & Verification

Phase 2 builds upon Phase 1 by adding the physical door locking actuator: the **SG90 Micro-Servo**.

### Required Library: ESP32Servo
1. In **Arduino IDE**, click `Tools` → `Manage Libraries...` (or press `Ctrl + Shift + I`).
2. Type **ESP32Servo** in the search bar.
3. Find the library by **Kevin Harrington / John K. Bennett** and click **Install**.

### Step 1: Wire the SG90 Servo
Ensure the ESP32 is disconnected from USB power while plugging wires:
- **Red wire (VCC)** → ESP32 **VIN** (5V power rail from USB).
- **Brown wire (GND)** → ESP32 **GND** (Common ground rail).
- **Orange/Yellow wire (Signal)** → ESP32 **GPIO 13**.

> [!WARNING]
> Never connect the SG90 Red wire to the **3V3** pin of the ESP32! The 3.3V voltage regulator cannot deliver the sudden inrush current demanded by the motor and will trigger an immediate brownout reset.

### Step 2: Flash Phase 2 Firmware
1. Open [`esp32/phase2_servo/phase2_servo.ino`](file:///c:/Users/Sarvesh%20Pillai/Desktop/git/ESP32/DoorSystem/esp32/phase2_servo/phase2_servo.ino) in Arduino IDE.
2. Ensure your board is set to **ESP32 Dev Module** and the correct COM port is selected.
3. Click **Upload**.
4. Open the **Serial Monitor** at **115200 baud**.

### Step 3: Interactive Testing & Verification
Phase 2 includes an **Interactive Serial Console**:
- Type **`o`** (or `u`) and press Enter: Manually triggers **UNLOCK** (Servo smoothly sweeps to 90°, Green LED ON).
- Type **`d`** (or `l`) and press Enter: Manually triggers **LOCK** (Servo smoothly sweeps to 0°, Red LED ON).
- Type **`t`** and press Enter: Runs a full **sweep calibration test** (0° → 90° → 180° → 0°).
- **Trigger Motion**: Wave your hand in front of the PIR. The Green LED will turn on, the servo will unlock to 90°, stay open for 5 seconds, and then automatically secure back to 0° with a 6-second cooldown.

### Expected Serial Monitor Output:
```text
==================================================
  SMART AI DOOR SECURITY SYSTEM — PHASE 1
  PIR Motion Detection & Safe LED Controller
==================================================
[SAFETY] PWM Current Limiting: ACTIVE (Duty: 22/255) — Protecting GPIOs without resistors.
[CONFIG] PIR Sensor Pin: GPIO 27
[CONFIG] Red LED Pin: GPIO 25
[CONFIG] Green LED Pin: GPIO 26

[INIT] PIR sensor warming up... Please keep area motionless.
[STATE CHANGE] 1.02s -> WARMING_UP (Stabilizing PIR sensor)
[WARMUP] Stabilizing... 12 seconds remaining
[WARMUP] Stabilizing... 9 seconds remaining
[WARMUP] Stabilizing... 6 seconds remaining
[WARMUP COMPLETE] PIR sensor is now armed and active.

[STATE CHANGE] 16.05s -> IDLE_LOCKED (Door secure, monitoring for motion. RED LED ON)
[HEARTBEAT] System armed | PIR: LOW (Clear) | State: IDLE_LOCKED | Total Events: 0

-- Wave hand across sensor --

[STATE CHANGE] 22.40s -> MOTION_DETECTED (Event #1! GREEN LED ON)
[STATE CHANGE] 26.41s -> COOLDOWN (Ignoring repeat PIR triggers for 6.0s)
[STATE CHANGE] 32.42s -> IDLE_LOCKED (Door secure, monitoring for motion. RED LED ON)
```

---

## 8. Development Roadmap & Testing Matrix

| Test | Objective | Target Phase | Status |
| :--- | :--- | :--- | :--- |
| **Test 1** | ESP32 Boots & Serial Output at 115200 baud | Phase 1 | ✅ Ready |
| **Test 2** | Red & Green LEDs Safe PWM drive | Phase 1 | ✅ Ready |
| **Test 3** | PIR warm-up stabilization countdown | Phase 1 | ✅ Ready |
| **Test 4** | PIR trigger transitions to `MOTION_DETECTED` | Phase 1 | ✅ Ready |
| **Test 5** | Software debounce prevents erratic re-triggering | Phase 1 | ✅ Ready |
| **Test 6** | SG90 Servo moves to Lock (0°) and Unlock (90°) | Phase 2 | Planned |
| **Test 7** | ESP32 connects to local Wi-Fi router | Phase 3 | Planned |
| **Test 8** | Backend Node.js server receives HTTP/WebSocket events | Phase 3 | Planned |
| **Test 9** | React Dashboard displays live door status in real time | Phase 4 | Planned |
| **Test 10** | Owner reviews visitor request card with photo preview | Phase 5 | Planned |
| **Test 11** | Owner clicks `ALLOW` → Backend sends UNLOCK to ESP32 | Phase 8 | Planned |
| **Test 12** | Owner clicks `DENY` → Backend logs refusal, Red LED ON | Phase 8 | Planned |
| **Test 13** | Google Gemini AI summarizes visitor stated intent | Phase 9 | Planned |
| **Test 14** | Fail-safe: Door remains LOCKED if backend goes offline | Phase 10 | Planned |

---

## 9. Troubleshooting Guide

### 1. ESP32 Not Detected by PC
- **Symptoms**: Arduino IDE shows `No port discovered` or fails to open COM port.
- **Remedy**:
  - Many Micro-USB cables are power-only charging cords. Swap to a confirmed data-capable cable.
  - Install the USB-to-UART bridge driver for your board:
    - For boards with **CP2102** chip: Silicon Labs CP210x Driver.
    - For boards with **CH340** chip: WCH CH340 Driver.

### 2. PIR Always Outputs HIGH (False Triggering)
- **Symptoms**: Green LED turns on immediately and never turns off.
- **Remedy**:
  - PIR sensors require 15–30 seconds after power-on to calibrate their infrared background baseline. Keep hands and heat sources away during startup.
  - Check the PIR power pin: HC-SR501 sensors require **5V (VIN)** to power their onboard 3.3V linear regulator properly. Feeding 3.3V into an HC-SR501 will cause erratic brownout switching.
  - Turn the sensitivity potentiometer counter-clockwise to reduce sensitivity.

### 3. ESP32 Stuck on "Connecting......____" During Upload
- **Remedy**:
  - Hold down the physical **BOOT** button on the ESP32 while Arduino IDE displays `Connecting......`. Release the button as soon as the flash progress percentage begins.

### 4. LEDs Are Too Dim
- **Remedy**:
  - The firmware is currently set to `SAFE_LED_DUTY_CYCLE = 22` (~8%) to protect your microcontroller pins without resistors. Once you wire physical 220Ω resistors in series, change `USE_PWM_CURRENT_LIMIT = false` for maximum brightness.

---

## 10. Common Mistakes / What NOT To Do

1. ❌ **Do NOT connect LEDs directly to 3.3V with 100% duty cycle without resistors**: Always use the software current limiting mode in `phase1_pir_led.ino` until resistors are wired.
2. ❌ **Do NOT power the SG90 servo from the ESP32 3.3V rail**: Servos draw high inrush current spikes (up to 500mA–1A under stall). Power it from the **VIN (5V)** pin or an external 5V supply with common ground.
3. ❌ **Do NOT use strapping pins blindly**: Avoid using GPIO 0, 2, 12, or 15 for critical inputs, as state changes on these pins at power-up can force the ESP32 into bootloader flash mode.
4. ❌ **Do NOT rely on AI as the sole security authority**: The Gemini AI service provides advisory summaries; never design the system to unlock automatically without explicit owner confirmation.
5. ❌ **Do NOT hardcode credentials in code**: Never commit Wi-Fi SSIDs, passwords, or JWT secrets to Git. Always use `.env` and `config.h` templates.
6. ❌ **Do NOT allow unauthenticated REST endpoints**: Commands like `/api/devices/:id/command` must be secured with JWT owner auth or device auth tokens.
