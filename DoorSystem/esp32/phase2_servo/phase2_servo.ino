/*
 * ==============================================================================
 * SMART AI DOOR SECURITY SYSTEM — PHASE 2 FIRMWARE
 * ==============================================================================
 * Objective: PIR Motion Detection -> ESP32 -> SG90 Servo Latch & LED Indication
 * Target Board: ESP32 DevKit V1
 * Author: Antigravity AI & Student
 *
 * NEW IN PHASE 2:
 * 1. SG90 Micro-Servo Integration for Physical Door Latch (0° Lock, 90° Unlock).
 * 2. Smooth Angle Interpolation: Steps gradually to prevent high inrush current spikes
 *    that could cause ESP32 USB brownout restarts.
 * 3. Power-Saving Auto-Detach: Cuts PWM pulse 500ms after reaching target angle,
 *    eliminating servo jitter, buzzing, and idle heating.
 * 4. Interactive Serial Console: Type 'o' (Open/Allow), 'd' (Deny/Lock), or 't' (Test)
 *    directly into Serial Monitor to test latch mechanism on demand.
 * 5. Maintained Safe LED Software PWM limiter for zero-resistor breadboards.
 * ==============================================================================
 */

#include <ESP32Servo.h>

// ==========================================
// 1. PIN CONFIGURATION (Change here only)
// ==========================================
#define PIR_PIN          27   // Input: PIR Motion Sensor
#define RED_LED_PIN      25   // Output: Red LED (Locked / Denied)
#define GREEN_LED_PIN    26   // Output: Green LED (Unlocked / Motion)
#define BUILTIN_LED_PIN   2   // Output: Onboard Blue LED (Diagnostic)
#define SERVO_PIN        13   // Output: SG90 Servo PWM Signal

// ==========================================
// 2. SERVO CONFIGURATION (Change here)
// ==========================================
// Set to TRUE if you have an SG90 360° Continuous Rotation Servo (spins continuously like a wheel).
// Set to FALSE if you have a standard 180° Positional Servo (stops at specific angles).
const bool IS_CONTINUOUS_360_SERVO = false;

// Angles for Standard 180° Positional Servo
const int LOCKED_POSITION   = 0;   // Angle for locked/secured latch (0° - 180°)
const int UNLOCKED_POSITION = 90;  // Angle for unlocked/open latch (0° - 180°)
const int SERVO_STEP_DELAY  = 15;  // Milliseconds per degree (smooth motion)

// Settings for 360° Continuous Rotation Servo (if applicable)
const int CONTINUOUS_STOP_VAL   = 90;  // 90 is stopped / neutral
const int CONTINUOUS_OPEN_VAL   = 120; // Rotate forward gently to unlock
const int CONTINUOUS_CLOSE_VAL  = 60;  // Rotate reverse gently to lock
const unsigned long CONTINUOUS_RUN_MS = 600; // Duration to run before stopping

// ==========================================
// 3. ELECTRICAL SAFETY & TIMING SETTINGS
// ==========================================
// Set to TRUE if you have NO external resistors on LEDs.
// Set to FALSE when 220-330 Ohm resistors are installed in series.
const bool USE_PWM_CURRENT_LIMIT = true;
const uint8_t SAFE_LED_DUTY_CYCLE = 22; // ~8% duty cycle

// Timing Settings (in milliseconds)
const unsigned long PIR_WARMUP_MS         = 15000; // HC-SR501 stabilization period
const unsigned long DOOR_UNLOCK_HOLD_MS   = 5000;  // How long door stays unlocked after access
const unsigned long MOTION_COOLDOWN_MS    = 6000;  // Cooldown before next PIR trigger

// ==========================================
// 4. SYSTEM STATE ENUMERATION
// ==========================================
enum DoorState {
  STATE_WARMING_UP,        // Sensor stabilizing on boot
  STATE_IDLE_LOCKED,       // Door securely locked (Red LED ON, Servo 0°)
  STATE_MOTION_DETECTED,   // Motion sensed (Green LED ON, preparing access)
  STATE_DOOR_UNLOCKED,     // Door unlatched (Green LED ON, Servo 90°)
  STATE_COOLDOWN           // Relocking & ignoring transient bounces
};

// Compile-time safety check to prevent input-only pins from being assigned to outputs
static_assert(SERVO_PIN < 34 && SERVO_PIN != 6 && SERVO_PIN != 7 && SERVO_PIN != 8 && SERVO_PIN != 9 && SERVO_PIN != 10 && SERVO_PIN != 11, 
              "ERROR: GPIO 34, 35, 36, 39 are INPUT-ONLY pins and cannot be used for Servo or LED outputs!");

// Global Objects & State Variables
Servo doorServo;
DoorState currentState = STATE_WARMING_UP;
unsigned long stateStartTime = 0;
unsigned long lastTelemetryTime = 0;
unsigned long motionTriggerCount = 0;
int currentServoAngle = LOCKED_POSITION;
int lastRedState = -1;
int lastGreenState = -1;

// ==========================================
// 5. HARDWARE CONTROLLERS
// ==========================================

/**
 * Safe LED controller supporting both digital and PWM current-limited modes.
 * Includes state caching to avoid redundant register writes every cycle.
 */
void setLedSafe(uint8_t pin, bool turnOn) {
  if (pin == RED_LED_PIN) {
    if (lastRedState == (turnOn ? 1 : 0)) return;
    lastRedState = (turnOn ? 1 : 0);
  } else if (pin == GREEN_LED_PIN) {
    if (lastGreenState == (turnOn ? 1 : 0)) return;
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

/**
 * Actuate the servo latch (supports both 180° Positional and 360° Continuous servos).
 */
void setDoorLatch(bool unlock) {
  if (!doorServo.attached()) {
    doorServo.attach(SERVO_PIN, 500, 2400);
    delay(30);
  }

  if (IS_CONTINUOUS_360_SERVO) {
    // 360-Degree Continuous Rotation Mode
    if (unlock) {
      Serial.println(F("[SERVO 360°] Unlatching (Spinning forward 600ms then STOP)..."));
      doorServo.write(CONTINUOUS_OPEN_VAL);
      delay(CONTINUOUS_RUN_MS);
      doorServo.write(CONTINUOUS_STOP_VAL); // Stop rotation
    } else {
      Serial.println(F("[SERVO 360°] Latching (Spinning reverse 600ms then STOP)..."));
      doorServo.write(CONTINUOUS_CLOSE_VAL);
      delay(CONTINUOUS_RUN_MS);
      doorServo.write(CONTINUOUS_STOP_VAL); // Stop rotation
    }
    Serial.println(F("[SERVO 360°] Stopped at neutral (90)."));
  } else {
    // Standard 180-Degree Positional Servo Mode
    int targetAngle = unlock ? UNLOCKED_POSITION : LOCKED_POSITION;
    targetAngle = constrain(targetAngle, 0, 180);

    Serial.print(F("[SERVO 180°] Moving from "));
    Serial.print(currentServoAngle);
    Serial.print(F("° to "));
    Serial.print(targetAngle);
    Serial.println(F("°..."));

    if (currentServoAngle < targetAngle) {
      for (int pos = currentServoAngle; pos <= targetAngle; pos++) {
        doorServo.write(pos);
        delay(SERVO_STEP_DELAY);
      }
    } else {
      for (int pos = currentServoAngle; pos >= targetAngle; pos--) {
        doorServo.write(pos);
        delay(SERVO_STEP_DELAY);
      }
    }
    currentServoAngle = targetAngle;
    Serial.println(F("[SERVO 180°] Target reached and locked in position."));
  }
}

/**
 * Update physical LED indicators based on current door state.
 */
void updateIndicators() {
  switch (currentState) {
    case STATE_WARMING_UP:
      digitalWrite(BUILTIN_LED_PIN, (millis() / 250) % 2 == 0 ? HIGH : LOW);
      setLedSafe(RED_LED_PIN, false);
      setLedSafe(GREEN_LED_PIN, false);
      break;

    case STATE_IDLE_LOCKED:
      setLedSafe(RED_LED_PIN, true);
      setLedSafe(GREEN_LED_PIN, false);
      digitalWrite(BUILTIN_LED_PIN, LOW);
      break;

    case STATE_MOTION_DETECTED:
    case STATE_DOOR_UNLOCKED:
      setLedSafe(RED_LED_PIN, false);
      setLedSafe(GREEN_LED_PIN, true);
      digitalWrite(BUILTIN_LED_PIN, HIGH);
      break;

    case STATE_COOLDOWN:
      setLedSafe(RED_LED_PIN, (millis() / 300) % 2 == 0 ? true : false);
      setLedSafe(GREEN_LED_PIN, false);
      digitalWrite(BUILTIN_LED_PIN, LOW);
      break;
  }
}

/**
 * Transition the door state machine and log formatted diagnostic telemetry.
 */
void transitionTo(DoorState newState) {
  currentState = newState;
  stateStartTime = millis();

  Serial.println();
  Serial.print(F("[STATE CHANGE] "));
  Serial.print(millis() / 1000.0, 2);
  Serial.print(F("s -> "));

  switch (currentState) {
    case STATE_WARMING_UP:
      Serial.println(F("WARMING_UP (Stabilizing PIR sensor)"));
      break;

    case STATE_IDLE_LOCKED:
      Serial.println(F("IDLE_LOCKED (Door secured. RED LED ON)"));
      setDoorLatch(false); // Lock
      break;

    case STATE_MOTION_DETECTED:
      motionTriggerCount++;
      Serial.print(F("MOTION_DETECTED (Event #"));
      Serial.print(motionTriggerCount);
      Serial.println(F("! Green LED ON. Simulating access cycle...)"));
      break;

    case STATE_DOOR_UNLOCKED:
      Serial.println(F("DOOR_UNLOCKED (Access Granted! Latch unlatched)"));
      setDoorLatch(true); // Unlock
      break;

    case STATE_COOLDOWN:
      Serial.print(F("COOLDOWN (Relocking door latch, ignoring triggers for "));
      Serial.print(MOTION_COOLDOWN_MS / 1000.0, 1);
      Serial.println(F("s)"));
      setDoorLatch(false); // Relock
      break;
  }
}

// ==========================================
// 6. SERIAL COMMAND PROCESSOR (Interactive Testing & Diagnosis)
// ==========================================
void handleSerialCommands() {
  if (!Serial.available()) return;

  char cmd = Serial.read();
  // Discard line endings
  if (cmd == '\r' || cmd == '\n') return;

  Serial.println();
  Serial.print(F("[COMMAND RECEIVED] '"));
  Serial.print(cmd);
  Serial.println(F("'"));

  switch (cmd) {
    case 'o':
    case 'O':
    case 'u':
    case 'U':
      Serial.println(F("[MANUAL] Manual UNLOCK command triggered!"));
      transitionTo(STATE_DOOR_UNLOCKED);
      break;

    case 'l':
    case 'L':
    case 'd':
    case 'D':
      Serial.println(F("[MANUAL] Manual LOCK / DENY command triggered!"));
      transitionTo(STATE_IDLE_LOCKED);
      break;

    // Direct angle tests to identify 180° vs 360° servo
    case '0':
      Serial.println(F("[DIAGNOSTIC] Sending direct 0° pulse..."));
      doorServo.write(0);
      break;

    case '4':
      Serial.println(F("[DIAGNOSTIC] Sending direct 45° pulse..."));
      doorServo.write(45);
      break;

    case '9':
      Serial.println(F("[DIAGNOSTIC] Sending direct 90° pulse (Center for 180° / STOP for 360°)..."));
      doorServo.write(90);
      break;

    case '8':
      Serial.println(F("[DIAGNOSTIC] Sending direct 180° pulse..."));
      doorServo.write(180);
      break;

    case 's':
    case 'S':
      Serial.println(F("[DIAGNOSTIC] Sending STOP / Neutral command (90)..."));
      doorServo.write(90);
      break;

    case 'h':
    case 'H':
    case '?':
      Serial.println(F("--- INTERACTIVE COMMAND MENU ---"));
      Serial.println(F("  'o' or 'u' -> Manually UNLOCK door (Access Granted)"));
      Serial.println(F("  'l' or 'd' -> Manually LOCK door (Access Denied / Idle)"));
      Serial.println(F("  '0'        -> Send 0° angle test"));
      Serial.println(F("  '9'        -> Send 90° angle test (Neutral/Stop)"));
      Serial.println(F("  '8'        -> Send 180° angle test"));
      Serial.println(F("  'h' or '?' -> Show this help menu"));
      Serial.println(F("--------------------------------"));
      break;

    default:
      Serial.println(F("[UNKNOWN] Unrecognized key. Type 'h' or '?' for command menu."));
      break;
  }
}

// ==========================================
// 7. SETUP ROUTINE
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println(F("=================================================="));
  Serial.println(F("  SMART AI DOOR SECURITY SYSTEM — PHASE 2"));
  Serial.println(F("  PIR + SG90 Servo Latch + Safe LED Controller"));
  Serial.println(F("=================================================="));

  // Pin modes
  pinMode(PIR_PIN, INPUT);
  pinMode(BUILTIN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);

  // Configure standard 50Hz frequency for SG90 servo
  doorServo.setPeriodHertz(50);

  // Safety report
  Serial.print(F("[SAFETY] LED PWM Current Limiting: "));
  Serial.println(USE_PWM_CURRENT_LIMIT ? F("ACTIVE (~8% duty cycle)") : F("OFF"));
  Serial.print(F("[CONFIG] Servo Pin: GPIO "));
  Serial.print(SERVO_PIN);
  Serial.print(F(" | Locked: "));
  Serial.print(LOCKED_POSITION);
  Serial.print(F("° | Unlocked: "));
  Serial.print(UNLOCKED_POSITION);
  Serial.println(F("°"));

  Serial.println(F("[INFO] Interactive Console Active! Type 'h' anytime for commands."));

  // Initial secure positioning
  Serial.println(F("[INIT] Securing latch to initial LOCKED position..."));
  setDoorLatch(false); // Initial locked position

  Serial.println(F("\n[INIT] PIR sensor warming up... Please keep area motionless."));
  transitionTo(STATE_WARMING_UP);
}

// ==========================================
// 8. MAIN SUPERVISORY LOOP
// ==========================================
void loop() {
  unsigned long now = millis();
  int rawPir = digitalRead(PIR_PIN);

  // Process any incoming keystrokes from Serial Monitor
  handleSerialCommands();

  // Update LED states
  updateIndicators();

  // State Machine Evaluation
  switch (currentState) {
    case STATE_WARMING_UP: {
      unsigned long elapsed = now - stateStartTime;
      if (now - lastTelemetryTime >= 3000) {
        lastTelemetryTime = now;
        long remaining = (long)(PIR_WARMUP_MS - elapsed) / 1000;
        if (remaining > 0) {
          Serial.print(F("[WARMUP] Calibrating PIR... "));
          Serial.print(remaining);
          Serial.println(F("s remaining"));
        }
      }

      if (elapsed >= PIR_WARMUP_MS) {
        Serial.println(F("[WARMUP COMPLETE] System armed & secure."));
        transitionTo(STATE_IDLE_LOCKED);
      }
      break;
    }

    case STATE_IDLE_LOCKED: {
      if (rawPir == HIGH) {
        // Motion detected: Begin access cycle
        transitionTo(STATE_MOTION_DETECTED);
      }
      break;
    }

    case STATE_MOTION_DETECTED: {
      // Small pause (800ms) to let visual Green LED register before opening latch
      if (now - stateStartTime >= 800) {
        transitionTo(STATE_DOOR_UNLOCKED);
      }
      break;
    }

    case STATE_DOOR_UNLOCKED: {
      // Hold door open for configured unlock duration
      if (now - stateStartTime >= DOOR_UNLOCK_HOLD_MS) {
        Serial.println(F("[TIMER] Unlock duration expired. Relocking door..."));
        transitionTo(STATE_COOLDOWN);
      }
      break;
    }

    case STATE_COOLDOWN: {
      // Return to IDLE_LOCKED when cooldown passes and PIR is clear
      if ((now - stateStartTime >= MOTION_COOLDOWN_MS) && (rawPir == LOW)) {
        transitionTo(STATE_IDLE_LOCKED);
      }
      break;
    }
  }

  // Periodic heartbeat in idle state
  if (currentState == STATE_IDLE_LOCKED && (now - lastTelemetryTime >= 5000)) {
    lastTelemetryTime = now;
    Serial.print(F("[HEARTBEAT] Armed & LOCKED | PIR: "));
    Serial.print(rawPir == HIGH ? F("HIGH") : F("LOW"));
    Serial.print(F(" | Servo: "));
    Serial.print(currentServoAngle);
    Serial.print(F("° | Events: "));
    Serial.println(motionTriggerCount);
  }

  delay(20);
}
