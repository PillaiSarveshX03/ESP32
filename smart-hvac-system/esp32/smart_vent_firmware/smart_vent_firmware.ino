/*
 * ==============================================================================
 * Smart Automated HVAC / Smart Vent System - ESP32 Firmware
 * ==============================================================================
 * 
 * Hardware Configuration:
 *   - DHT11 Sensor:      GPIO 4   (Data with optional 10k pull-up resistor)
 *   - PIR Motion Sensor: GPIO 13  (Digital Input)
 *   - Servo Damper:      GPIO 18  (PWM via ESP32Servo library)
 * 
 * Required Libraries (Install via Arduino Library Manager):
 *   1. WebSockets by Markus Sattler (v2.4.0+)
 *   2. ArduinoJson by Benoit Blanchon (v6.x or v7.x)
 *   3. DHT sensor library by Adafruit
 *   4. Adafruit Unified Sensor
 *   5. ESP32Servo by Kevin Harrington
 * ==============================================================================
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESP32Servo.h>

// ======================== WiFi & Server Configuration ========================
const char* WIFI_SSID     = "Airtel_praf_7435";
const char* WIFI_PASSWORD = "air69935";

// WebSocket Server Details (Your Node.js server machine local Wi-Fi IP)
const char* WS_SERVER_HOST = "192.168.1.6"; 
const int   WS_SERVER_PORT = 5000;
const char* WS_SERVER_PATH = "/ws/esp32";

// ============================ Pin Definitions ================================
#define DHTPIN        4
#define DHTTYPE       DHT11
#define PIRPIN        13
#define SERVOPIN      18

// ========================== Global Objects & State ===========================
DHT dht(DHTPIN, DHTTYPE);
Servo ventServo;
WebSocketsClient webSocket;

// System States
enum ControlMode {
  MODE_AUTO,
  MODE_MANUAL
};

ControlMode currentMode   = MODE_AUTO;
int currentServoAngle      = 90;
int targetServoAngle       = 90;
float currentTemp          = 24.0;
float currentHumidity      = 50.0;
float heatIndex            = 24.0;
bool motionDetected        = false;
bool lastMotionState       = false;

// Climate & Auto Control Parameters
float targetTempThreshold  = 24.0;  // Desired room temp in °C
int ecoAngle               = 0;     // Vent closed angle when unoccupied
int balancedAngle          = 90;    // Half-open angle
int maxVentAngle           = 180;   // Wide open angle
unsigned long pirTimeoutMs = 15000; // 15 seconds unoccupied timeout before Eco mode
unsigned long lastMotionTime = 0;

// Timing intervals
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 1500; // Send telemetry every 1.5s
unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL = 1000;

// ========================== Helper Functions =================================

// Move servo smoothly or directly
void setVentAngle(int angle) {
  angle = constrain(angle, 0, 180);
  currentServoAngle = angle;
  ventServo.write(angle);
  Serial.printf("[SERVO] Position set to %d deg\n", angle);
}

// Compute Heat Index (Rothfusz equation)
float computeHeatIndex(float tempC, float humidity) {
  float tempF = (tempC * 9.0 / 5.0) + 32.0;
  float hiF = 0.5 * (tempF + 61.0 + ((tempF - 68.0) * 1.2) + (humidity * 0.094));
  
  if (hiF >= 80.0) {
    hiF = -42.379 + 2.04901523 * tempF + 10.14333127 * humidity
          - 0.22475541 * tempF * humidity - 0.00683783 * tempF * tempF
          - 0.05481717 * humidity * humidity + 0.00122874 * tempF * tempF * humidity
          + 0.00085282 * tempF * humidity * humidity - 0.00000199 * tempF * tempF * humidity * humidity;
  }
  return (hiF - 32.0) * 5.0 / 9.0;
}

// Evaluate smart HVAC damper logic in Auto Mode
void evaluateAutoClimateLogic() {
  if (currentMode != MODE_AUTO) return;

  unsigned long now = millis();
  bool isOccupied = (motionDetected || (now - lastMotionTime < pirTimeoutMs));

  int desiredAngle = 0;

  if (!isOccupied) {
    // Unoccupied -> Eco Mode (close damper to conserve cooling/heating)
    desiredAngle = ecoAngle;
  } else {
    // Room is occupied
    if (currentTemp > targetTempThreshold + 0.5) {
      // Room is hot -> open vent fully for maximum airflow
      desiredAngle = maxVentAngle;
    } else if (currentTemp < targetTempThreshold - 0.5) {
      // Room is cooler than target -> throttle airflow to minimum/eco
      desiredAngle = ecoAngle;
    } else {
      // Near target -> balanced comfort airflow
      desiredAngle = balancedAngle;
    }
  }

  if (desiredAngle != currentServoAngle) {
    setVentAngle(desiredAngle);
  }
}

// Send Telemetry JSON to WebSocket Server
void sendTelemetry() {
  StaticJsonDocument<256> doc;
  doc["type"]           = "telemetry";
  doc["temperature"]    = round(currentTemp * 10.0) / 10.0;
  doc["humidity"]       = round(currentHumidity * 10.0) / 10.0;
  doc["heatIndex"]      = round(heatIndex * 10.0) / 10.0;
  doc["motion"]         = motionDetected;
  doc["occupied"]       = (motionDetected || (millis() - lastMotionTime < pirTimeoutMs));
  doc["servoAngle"]     = currentServoAngle;
  doc["mode"]           = (currentMode == MODE_AUTO) ? "AUTO" : "MANUAL";
  doc["targetTemp"]     = targetTempThreshold;
  doc["ecoAngle"]       = ecoAngle;
  doc["rssi"]           = WiFi.RSSI();
  doc["uptime"]         = millis() / 1000;

  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

// ========================== WebSocket Event Handler ==========================
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected from server!");
      break;
    case WStype_CONNECTED:
      Serial.printf("[WS] Connected to url: %s\n", payload);
      // Immediately send handshake/telemetry
      sendTelemetry();
      break;
    case WStype_TEXT: {
      Serial.printf("[WS] Received text: %s\n", payload);
      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, payload);
      if (error) {
        Serial.print("[WS] JSON Deserialization failed: ");
        Serial.println(error.f_str());
        return;
      }

      const char* action = doc["action"];
      if (action == nullptr) return;

      if (strcmp(action, "set_mode") == 0) {
        const char* modeStr = doc["mode"];
        if (strcmp(modeStr, "AUTO") == 0) {
          currentMode = MODE_AUTO;
          Serial.println("[CTRL] Mode switched to AUTO");
          evaluateAutoClimateLogic();
        } else if (strcmp(modeStr, "MANUAL") == 0) {
          currentMode = MODE_MANUAL;
          Serial.println("[CTRL] Mode switched to MANUAL");
        }
      } else if (strcmp(action, "set_servo") == 0) {
        if (currentMode == MODE_MANUAL) {
          int angle = doc["angle"];
          setVentAngle(angle);
        } else {
          Serial.println("[CTRL] Cannot set servo directly in AUTO mode (switch to MANUAL first)");
        }
      } else if (strcmp(action, "set_target_temp") == 0) {
        float newTarget = doc["targetTemp"];
        if (newTarget >= 15.0 && newTarget <= 35.0) {
          targetTempThreshold = newTarget;
          Serial.printf("[CTRL] Target temp updated to %.1f C\n", targetTempThreshold);
          evaluateAutoClimateLogic();
        }
      } else if (strcmp(action, "set_eco_angle") == 0) {
        int newEco = doc["ecoAngle"];
        ecoAngle = constrain(newEco, 0, 180);
        Serial.printf("[CTRL] Eco angle updated to %d deg\n", ecoAngle);
      }

      // Broadcast new state after command
      sendTelemetry();
      break;
    }
    case WStype_BIN:
      Serial.println("[WS] Received binary data");
      break;
    case WStype_ERROR:
      Serial.println("[WS] Error occurred");
      break;
    default:
      break;
  }
}

// ========================== Setup & Loop =====================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n==========================================");
  Serial.println("   Smart HVAC Damper System - ESP32       ");
  Serial.println("==========================================");

  // Initialize Pins
  pinMode(PIRPIN, INPUT);

  // Initialize DHT11
  dht.begin();

  // Initialize Servo
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  ventServo.setPeriodHertz(50);
  ventServo.attach(SERVOPIN, 500, 2400);
  setVentAngle(balancedAngle);

  // Connect to WiFi
  Serial.printf("Connecting to Wi-Fi: %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.printf("[WiFi] IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WiFi] Signal Strength (RSSI): %d dBm\n", WiFi.RSSI());

    // Connect WebSocket Client
    webSocket.begin(WS_SERVER_HOST, WS_SERVER_PORT, WS_SERVER_PATH);
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(3000);
  } else {
    Serial.println("\n[WiFi] Connection timed out. Running in standalone fallback mode!");
  }
}

void loop() {
  // Service WebSocket
  if (WiFi.status() == WL_CONNECTED) {
    webSocket.loop();
  }

  unsigned long now = millis();

  // Read PIR Sensor
  bool pirState = (digitalRead(PIRPIN) == HIGH);
  if (pirState != motionDetected) {
    motionDetected = pirState;
    if (motionDetected) {
      lastMotionTime = now;
      Serial.println("[PIR] Motion Detected -> Active");
    } else {
      Serial.println("[PIR] Motion Cleared");
    }
    // Instant update on state change
    evaluateAutoClimateLogic();
    if (WiFi.status() == WL_CONNECTED) {
      sendTelemetry();
    }
  }

  // Periodic Sensor Read (DHT11)
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;

    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (!isnan(t) && !isnan(h)) {
      currentTemp = t;
      currentHumidity = h;
      heatIndex = computeHeatIndex(currentTemp, currentHumidity);
      evaluateAutoClimateLogic();
    }
  }

  // Periodic Telemetry Broadcast
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = now;
    if (WiFi.status() == WL_CONNECTED) {
      sendTelemetry();
    }
  }
}
