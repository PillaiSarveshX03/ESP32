# ESP32 Smart Vent Damper Firmware

## Required Libraries
Install the following libraries via the Arduino IDE Library Manager (**Sketch -> Include Library -> Manage Libraries...**):

1. **WebSockets** by *Markus Sattler* (`WebSocketsClient`)
2. **ArduinoJson** by *Benoit Blanchon* (v6.x or v7.x)
3. **DHT sensor library** by *Adafruit*
4. **Adafruit Unified Sensor** by *Adafruit*
5. **ESP32Servo** by *Kevin Harrington*

---

## Hardware Pinout & Wiring

| Component | Pin on ESP32 | Voltage (VCC) | Ground (GND) | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **DHT11 Data** | `GPIO 4` | 3.3V or 5V | GND | Add 10kΩ pull-up to VCC if module doesn't have one built-in |
| **PIR Sensor Out** | `GPIO 13` | 5V / 3.3V | GND | Digital HIGH on motion trigger |
| **Servo PWM (SG90/MG995)** | `GPIO 18` | 5V (VIN / Ext 5V) | GND | **Important:** Share GND with ESP32 if using external power supply |

---

## Configuration

Before uploading to your ESP32 in Arduino IDE:
1. Open `smart_vent_firmware.ino`.
2. Update `WIFI_SSID` and `WIFI_PASSWORD` if necessary.
3. Update `WS_SERVER_HOST` with your computer's local IP address (e.g. `192.168.1.X`) where the Node.js backend is running.
4. Set the Board to **ESP32 Dev Module** (or your specific ESP32 board).
5. Set Upload Speed to `921600` or `115200` and Flash!
