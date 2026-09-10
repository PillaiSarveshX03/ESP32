/*
 * ==============================================================================
 * SMART AI DOOR SECURITY SYSTEM — PHASE 3 FIRMWARE
 * ==============================================================================
 * Objective: ESP32 <-> Backend Realtime Wi-Fi Communication
 * Target Board: ESP32 DevKit V1
 * Author: Antigravity AI & Student
 *
 * WHAT'S NEW IN PHASE 3:
 * 1. Wi-Fi Connectivity: Automatically connects to your local Wi-Fi router.
 * 2. Authenticated Backend Registration: Performs handshake with the Express
 * server using a secure pre-shared token (x-device-token).
 * 3. Event Dispatching: When the PIR sensor detects motion, ESP32 makes an HTTP
 * POST to /api/device/event, alerting the server and connected web clients.
 * 4. Remote Door Actuation: Receives UNLOCK / LOCK commands sent from the
 * server.
 * 5. Maintained Servo Latch & Safe LED Protections from Phases 1 & 2.
 * ==============================================================================
 */

#include <ESP32Servo.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <WiFi.h>

// ==========================================
// 1. WI-FI & BACKEND SERVER CONFIGURATION
// ==========================================
// Replace with your local Wi-Fi credentials:
const char *WIFI_SSID = "Airtel_praf_7435";
const char *WIFI_PASSWORD = "air69935";

// Backend Server URL (Your computer's local IP address on the Wi-Fi network)
// Default port is 5000. Example: "http://192.168.1.6:5000"
const char *BACKEND_URL = "http://192.168.1.6:5000";

// Device Security Credentials
const char *DEVICE_TOKEN = "smart-door-esp32-secret-token-2026";
const char *DEVICE_ID = "door-001";

// ==========================================
// 2. HARDWARE PIN CONFIGURATION
// ==========================================
#define PIR_PIN 27        // Input: PIR Motion Sensor
#define RED_LED_PIN 25    // Output: Red LED (Locked / Denied)
#define GREEN_LED_PIN 26  // Output: Green LED (Unlocked / Motion)
#define BUILTIN_LED_PIN 2 // Output: Onboard Blue LED (Network Status)
#define SERVO_PIN 13      // Output: SG90 Servo PWM Signal

// ==========================================
// 3. SERVO CONFIGURATION
// ==========================================
// Set to FALSE: Operates as a precise positional servo (moves to exact angles)
const bool IS_CONTINUOUS_360_SERVO = false;

// Configured for 180° -> 270° sweep as requested:
const int LOCKED_POSITION = 0;           // Starting / Locked position (degrees)
const int UNLOCKED_POSITION = 90;        // Unlocked position (degrees)
const int SERVO_MAX_PHYSICAL_RANGE = 90; // Physical limit scale
const int SERVO_STEP_DELAY = 25;         // Speed: ms per degree (smooth glide)

// ==========================================
// 4. TIMING & ELECTRICAL SAFETY
// ==========================================
const bool USE_PWM_CURRENT_LIMIT =
    true; // Safe mode for zero-resistor breadboards
const uint8_t SAFE_LED_DUTY_CYCLE = 22; // ~8% duty cycle

// Set to FALSE for Web Dashboard Authority:
// When owner clicks ALLOW / UNLOCK, door remains unlocked until owner clicks LOCK / SECURE!
// Set to TRUE if you want a timed auto-relock safety feature.
const bool ENABLE_AUTO_RELOCK = false; 
const unsigned long DOOR_UNLOCK_HOLD_MS = 30000; // Used only if ENABLE_AUTO_RELOCK is true
const unsigned long PIR_WARMUP_MS = 15000;
const unsigned long MOTION_COOLDOWN_MS = 6000;
const unsigned long POLL_INTERVAL_MS =
    1500; // How often to check for remote commands

// ==========================================
// 5. SYSTEM STATE MACHINE
// ==========================================
enum DoorState {
  STATE_CONNECTING_WIFI,
  STATE_WARMING_UP,
  STATE_IDLE_LOCKED,
  STATE_MOTION_DETECTED,
  STATE_DOOR_UNLOCKED,
  STATE_COOLDOWN
};

// Global Objects
Servo doorServo;
WebServer
    localServer(80); // Local server on port 80 for instant direct commands
DoorState currentState = STATE_CONNECTING_WIFI;

unsigned long stateStartTime = 0;
unsigned long lastTelemetryTime = 0;
unsigned long lastPollTime = 0;
unsigned long motionTriggerCount = 0;
int currentServoAngle = LOCKED_POSITION;
int lastRedState = -1;
int lastGreenState = -1;

// ==========================================
// 6. HARDWARE HELPERS
// ==========================================

void setLedSafe(uint8_t pin, bool turnOn) {
  if (pin == RED_LED_PIN) {
    if (lastRedState == (turnOn ? 1 : 0))
      return;
    lastRedState = (turnOn ? 1 : 0);
  } else if (pin == GREEN_LED_PIN) {
    if (lastGreenState == (turnOn ? 1 : 0))
      return;
    lastGreenState = (turnOn ? 1 : 0);
  }

  if (!turnOn) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
    return;
  }

  if (USE_PWM_CURRENT_LIMIT) {
    analogWrite(pin, SAFE_LED_DUTY_CYCLE);
  } else {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, HIGH);
  }
}

void writeServoPulse(int angleDegrees) {
  angleDegrees = constrain(angleDegrees, 0, SERVO_MAX_PHYSICAL_RANGE);
  int pulseUs = map(angleDegrees, 0, SERVO_MAX_PHYSICAL_RANGE, 500, 2500);
  doorServo.writeMicroseconds(pulseUs);
}

void setDoorLatch(bool unlock) {
  if (!doorServo.attached()) {
    doorServo.attach(SERVO_PIN, 500, 2500);
    delay(30);
  }

  int targetAngle = unlock ? UNLOCKED_POSITION : LOCKED_POSITION;

  // Guard: If servo is ALREADY at target angle, do not move!
  if (currentServoAngle == targetAngle) {
    return;
  }

  Serial.print(F("[SERVO] Rotating latch from "));
  Serial.print(currentServoAngle);
  Serial.print(F("° to "));
  Serial.print(targetAngle);
  Serial.println(F("°..."));

  if (currentServoAngle < targetAngle) {
    for (int pos = currentServoAngle; pos <= targetAngle; pos++) {
      writeServoPulse(pos);
      delay(SERVO_STEP_DELAY);
    }
  } else {
    for (int pos = currentServoAngle; pos >= targetAngle; pos--) {
      writeServoPulse(pos);
      delay(SERVO_STEP_DELAY);
    }
  }

  currentServoAngle = targetAngle;
  Serial.print(F("[SERVO] Position locked at "));
  Serial.print(currentServoAngle);
  Serial.println(F("°."));
}

void updateIndicators() {
  switch (currentState) {
  case STATE_CONNECTING_WIFI:
    // Rapid flash onboard LED while Wi-Fi is connecting
    digitalWrite(BUILTIN_LED_PIN, (millis() / 150) % 2 == 0 ? HIGH : LOW);
    setLedSafe(RED_LED_PIN, false);
    setLedSafe(GREEN_LED_PIN, false);
    break;

  case STATE_WARMING_UP:
    digitalWrite(BUILTIN_LED_PIN, (millis() / 400) % 2 == 0 ? HIGH : LOW);
    setLedSafe(RED_LED_PIN, false);
    setLedSafe(GREEN_LED_PIN, false);
    break;

  case STATE_IDLE_LOCKED:
    digitalWrite(BUILTIN_LED_PIN, HIGH); // Solid blue indicates Wi-Fi connected
    setLedSafe(RED_LED_PIN, true);
    setLedSafe(GREEN_LED_PIN, false);
    break;

  case STATE_MOTION_DETECTED:
    // Door remains LOCKED: Red LED ON, Green LED stays OFF until owner approves
    digitalWrite(BUILTIN_LED_PIN, HIGH);
    setLedSafe(RED_LED_PIN, true);
    setLedSafe(GREEN_LED_PIN, false);
    break;

  case STATE_DOOR_UNLOCKED:
    // Access Granted by owner: Green LED ON, Red LED OFF
    digitalWrite(BUILTIN_LED_PIN, HIGH);
    setLedSafe(RED_LED_PIN, false);
    setLedSafe(GREEN_LED_PIN, true);
    break;

  case STATE_COOLDOWN:
    digitalWrite(BUILTIN_LED_PIN, HIGH);
    setLedSafe(RED_LED_PIN, (millis() / 250) % 2 == 0 ? true : false);
    setLedSafe(GREEN_LED_PIN, false);
    break;
  }
}

// ==========================================
// 7. BACKEND NETWORK CLIENT FUNCTIONS
// ==========================================

/**
 * Perform initial handshake with the backend server.
 */
bool registerWithBackend() {
  if (WiFi.status() != WL_CONNECTED)
    return false;

  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/device/register";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);

  String payload = "{\"deviceId\":\"" + String(DEVICE_ID) + "\",\"ip\":\"" +
                   WiFi.localIP().toString() +
                   "\",\"firmwareVersion\":\"phase3-1.0\"}";

  int httpCode = http.POST(payload);
  bool success = false;

  if (httpCode == 200) {
    Serial.println(F("[HTTP] Registered with backend server successfully."));
    success = true;
  } else {
    Serial.print(F("[HTTP ERROR] Failed to register. HTTP Code: "));
    Serial.println(httpCode);
  }

  http.end();
  return success;
}

/**
 * Report motion event to the backend server.
 */
void reportMotionEvent() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[HTTP WARN] Cannot send motion event: Wi-Fi offline."));
    return;
  }

  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/device/event";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);

  String payload = "{\"deviceId\":\"" + String(DEVICE_ID) +
                   "\",\"event\":\"MOTION_DETECTED\",\"timestamp\":\"" +
                   String(millis()) + "\"}";

  Serial.println(F("[HTTP POST] Sending MOTION_DETECTED alert to backend..."));
  int httpCode = http.POST(payload);

  if (httpCode == 200) {
    Serial.println(F("[HTTP] Server acknowledged motion event."));
  } else {
    Serial.print(F("[HTTP WARN] Motion event delivery code: "));
    Serial.println(httpCode);
  }

  http.end();
}

/**
 * Report door state change (e.g. LOCKED, UNLOCKED) to the backend server.
 */
static String lastReportedDoorState = "";
void reportDoorStateToBackend(const char* newStateStr) {
  if (WiFi.status() != WL_CONNECTED)
    return;

  if (lastReportedDoorState == newStateStr) {
    return; // Already synchronized
  }

  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/device/state";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);

  String payload = "{\"deviceId\":\"" + String(DEVICE_ID) +
                   "\",\"doorState\":\"" + String(newStateStr) + "\"}";

  Serial.print(F("[STATE SYNC] Reporting door state '"));
  Serial.print(newStateStr);
  Serial.println(F("' to backend..."));

  int httpCode = http.POST(payload);
  if (httpCode == 200) {
    lastReportedDoorState = newStateStr;
    Serial.println(F("[STATE SYNC] Backend synchronized successfully."));
  } else {
    Serial.print(F("[STATE SYNC WARN] State sync HTTP code: "));
    Serial.println(httpCode);
  }

  http.end();
}

/**
 * Poll server for any owner commands (UNLOCK or LOCK).
 */
void pollServerCommands() {
  if (WiFi.status() != WL_CONNECTED)
    return;

  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/device/poll-command";

  http.begin(url);
  http.addHeader("x-device-token", DEVICE_TOKEN);

  int httpCode = http.GET();
  if (httpCode == 200) {
    String response = http.getString();
    // Simple fast substring search (avoids heavy JSON library requirements)
    if (response.indexOf("\"command\":\"UNLOCK\"") > 0) {
      Serial.println(F("\n🔑 [REMOTE COMMAND] Received 'UNLOCK' from Backend!"));
      transitionTo(STATE_DOOR_UNLOCKED);
    } else if (response.indexOf("\"command\":\"LOCK\"") > 0) {
      Serial.println(F("\n🔒 [REMOTE COMMAND] Received 'LOCK' from Backend!"));
      transitionTo(STATE_IDLE_LOCKED);
    }
  }

  http.end();
}

// Local WebServer handler for direct push commands from backend
void handleDirectCommand() {
  if (!localServer.hasHeader("x-device-token") ||
      localServer.header("x-device-token") != DEVICE_TOKEN) {
    localServer.send(401, "application/json", "{\"error\":\"Unauthorized\"}");
    return;
  }

  String body = localServer.arg("plain");
  if (body.indexOf("UNLOCK") >= 0) {
    Serial.println(F("\n🔑 [DIRECT PUSH] Received 'UNLOCK' command!"));
    localServer.send(200, "application/json",
                     "{\"success\":true,\"state\":\"UNLOCKED\"}");
    transitionTo(STATE_DOOR_UNLOCKED);
  } else if (body.indexOf("LOCK") >= 0) {
    Serial.println(F("\n🔒 [DIRECT PUSH] Received 'LOCK' command!"));
    localServer.send(200, "application/json",
                     "{\"success\":true,\"state\":\"LOCKED\"}");
    transitionTo(STATE_IDLE_LOCKED);
  } else {
    localServer.send(400, "application/json",
                     "{\"error\":\"Unknown command\"}");
  }
}

// ==========================================
// 8. STATE TRANSITION LOGIC
// ==========================================
void transitionTo(DoorState newState) {
  // Guard: If already in target state, ignore duplicate triggers (or refresh hold if UNLOCKED)
  if (currentState == newState) {
    if (currentState == STATE_DOOR_UNLOCKED) {
      stateStartTime = millis(); // Refresh hold duration on duplicate unlock
      Serial.println(F("[TIMER] Unlock hold refreshed by owner command."));
    }
    return;
  }
  currentState = newState;

  Serial.println();
  Serial.print(F("[STATE CHANGE] "));
  Serial.print(millis() / 1000.0, 2);
  Serial.print(F("s -> "));

  switch (currentState) {
  case STATE_CONNECTING_WIFI:
    Serial.println(F("CONNECTING_WIFI"));
    break;

  case STATE_WARMING_UP:
    Serial.println(F("WARMING_UP (PIR stabilization)"));
    stateStartTime = millis();
    break;

  case STATE_IDLE_LOCKED:
    Serial.println(F("IDLE_LOCKED (Secured. RED LED ON)"));
    setDoorLatch(false);
    stateStartTime = millis();
    reportDoorStateToBackend("LOCKED");
    break;

  case STATE_MOTION_DETECTED:
    motionTriggerCount++;
    Serial.print(F("MOTION_DETECTED (Event #"));
    Serial.print(motionTriggerCount);
    Serial.println(F("! Door remains LOCKED. Awaiting owner command from Web...)"));
    setDoorLatch(false); // Physical latch stays locked
    stateStartTime = millis();
    reportMotionEvent(); // Report event to backend
    break;

  case STATE_DOOR_UNLOCKED:
    Serial.println(F("DOOR_UNLOCKED (Access Granted! Latch opened)"));
    setDoorLatch(true);
    stateStartTime = millis(); // CRITICAL: Start hold timer ONLY after physical latch reaches 90°
    reportDoorStateToBackend("UNLOCKED");
    break;

  case STATE_COOLDOWN:
    Serial.println(F("COOLDOWN (Securing latch & ignoring bounces)"));
    setDoorLatch(false);
    stateStartTime = millis();
    reportDoorStateToBackend("LOCKED");
    break;
  }
}

// ==========================================
// 9. SETUP ROUTINE
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println(F("=================================================="));
  Serial.println(F("  SMART AI DOOR SECURITY SYSTEM — PHASE 3"));
  Serial.println(F("  ESP32 <-> Backend Realtime Wi-Fi Controller"));
  Serial.println(F("=================================================="));

  pinMode(PIR_PIN, INPUT);
  pinMode(BUILTIN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);

  doorServo.setPeriodHertz(50);
  setDoorLatch(false); // Secure latch on power up

  // Connect to Wi-Fi
  Serial.print(F("[WI-FI] Connecting to '"));
  Serial.print(WIFI_SSID);
  Serial.println(F("'..."));

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - wifiStart < 20000) {
    delay(500);
    Serial.print(F("."));
  }

  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("[WI-FI] Connected successfully!"));
    Serial.print(F("[WI-FI] ESP32 Local IP: "));
    Serial.println(WiFi.localIP());

    // Register with backend server
    registerWithBackend();

    // Start local direct command server
    localServer.on("/command", HTTP_POST, handleDirectCommand);
    const char *headerkeys[] = {"x-device-token"};
    localServer.collectHeaders(headerkeys, 1);
    localServer.begin();
    Serial.println(F("[HTTP SERVER] Local command listener active on port 80"));
  } else {
    Serial.println(F("[WI-FI WARN] Connection timed out. Operating in "
                     "standalone fallback mode."));
  }

  Serial.println(F("\n[INIT] PIR sensor warming up... Keep area clear."));
  transitionTo(STATE_WARMING_UP);
}

// ==========================================
// 10. MAIN SUPERVISORY LOOP
// ==========================================
void loop() {
  unsigned long now = millis();
  int rawPir = digitalRead(PIR_PIN);

  // Handle local HTTP requests (Direct backend push commands)
  if (WiFi.status() == WL_CONNECTED) {
    localServer.handleClient();
  }

  // Periodic poll to backend for pending commands (every 1.5s)
  if (now - lastPollTime >= POLL_INTERVAL_MS) {
    lastPollTime = now;
    pollServerCommands();
  }

  // Update physical indicators
  updateIndicators();

  // State Machine Evaluation
  switch (currentState) {
  case STATE_WARMING_UP: {
    if (now - stateStartTime >= PIR_WARMUP_MS) {
      Serial.println(
          F("[WARMUP COMPLETE] System armed, Wi-Fi connected, & monitoring."));
      transitionTo(STATE_IDLE_LOCKED);
    }
    break;
  }

  case STATE_IDLE_LOCKED: {
    if (rawPir == HIGH) {
      transitionTo(STATE_MOTION_DETECTED);
    }
    break;
  }

  case STATE_MOTION_DETECTED: {
    // Physical latch remains strictly LOCKED at 0°.
    // The door can ONLY be unlocked when the owner clicks ALLOW / UNLOCK on the Web Dashboard!
    // If no command is received within 30 seconds, automatically return to COOLDOWN.
    if (now - stateStartTime >= 30000) {
      Serial.println(F("[TIMEOUT] No owner response within 30s. Door remains secure."));
      transitionTo(STATE_COOLDOWN);
    }
    break;
  }

  case STATE_DOOR_UNLOCKED: {
    // Under Web Control: Door remains UNLOCKED until owner clicks LOCK / SECURE on the Web Dashboard!
    if (ENABLE_AUTO_RELOCK && (now - stateStartTime >= DOOR_UNLOCK_HOLD_MS)) {
      Serial.println(
          F("[TIMER] Auto-relock hold expired. Returning to locked state."));
      transitionTo(STATE_COOLDOWN);
    }
    break;
  }

  case STATE_COOLDOWN: {
    if ((now - stateStartTime >= MOTION_COOLDOWN_MS) && (rawPir == LOW)) {
      transitionTo(STATE_IDLE_LOCKED);
    }
    break;
  }
  }

  // Periodic serial heartbeat
  if (currentState == STATE_IDLE_LOCKED && (now - lastTelemetryTime >= 6000)) {
    lastTelemetryTime = now;
    Serial.print(F("[HEARTBEAT] Wi-Fi: "));
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print(F("CONNECTED ("));
      Serial.print(WiFi.localIP());
      Serial.print(F(")"));
    } else {
      Serial.print(F("OFFLINE"));
    }
    Serial.print(F(" | PIR: "));
    Serial.print(rawPir == HIGH ? F("HIGH") : F("LOW"));
    Serial.print(F(" | Events: "));
    Serial.println(motionTriggerCount);
  }

  delay(20);
}
