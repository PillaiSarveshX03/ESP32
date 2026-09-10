/*
 * ==============================================================================
 * SMART AI DOOR SECURITY SYSTEM — PHASE 1 FIRMWARE
 * ==============================================================================
 * Objective: PIR Motion Detection -> ESP32 -> LED Visual Indication
 * Target Board: ESP32 DevKit V1 (30-pin or 36-pin)
 * Author: Antigravity AI & Student
 *
 * SAFETY NOTICE (Zero Resistors Available):
 * Connecting an LED directly between an ESP32 3.3V GPIO and GND with NO resistor
 * risks pulling 50-80mA, exceeding the ESP32's 12mA recommended limit and burning
 * out the output driver or LED.
 * This firmware implements a SAFE SOFTWARE PWM CURRENT LIMITER (analogWrite / LEDC)
 * providing an ~8% duty cycle that keeps LEDs visible while dramatically capping
 * average current. When you eventually add 220-330 ohm resistors, set
 * USE_PWM_CURRENT_LIMIT to false.
 * ==============================================================================
 */

// ==========================================
// 1. PIN CONFIGURATION (Change here only)
// ==========================================
#define PIR_PIN          27   // Input: PIR Motion Sensor (Digital OUT)
#define RED_LED_PIN      25   // Output: Red LED (System Locked / Idle / Denied)
#define GREEN_LED_PIN    26   // Output: Green LED (Motion Detected / Access Granted)
#define BUILTIN_LED_PIN   2   // Output: Onboard Blue LED (Hardware diagnostic fallback)

// ==========================================
// 2. ELECTRICAL SAFETY & TUNING SETTINGS
// ==========================================
// Set to TRUE if you have NO external resistors.
// Set to FALSE only when you wire 220 Ohm - 330 Ohm resistors in series with your LEDs.
const bool USE_PWM_CURRENT_LIMIT = true;

// Safe brightness duty cycle (0 to 255).
// 20/255 = ~7.8% duty cycle — visible in indoor lighting while protecting the GPIO.
const uint8_t SAFE_LED_DUTY_CYCLE = 22;

// Timing Settings (in milliseconds)
const unsigned long PIR_WARMUP_MS         = 15000; // HC-SR501 stabilization period (15s)
const unsigned long MOTION_ACTIVE_HOLD_MS = 4000;  // How long Green LED stays on after motion
const unsigned long COOLDOWN_MS           = 6000;  // Ignore further PIR triggers after an event

// ==========================================
// 3. SYSTEM STATE ENUMERATION
// ==========================================
enum SystemState {
  STATE_WARMING_UP,     // Sensor initializing after power-on
  STATE_IDLE_LOCKED,    // Normal resting state: Door secured, Red LED ON
  STATE_MOTION_DETECTED,// Motion sensed: Green LED ON, timer started
  STATE_COOLDOWN        // Event finished: temporarily ignoring PIR bounces
};

// State tracking variables
SystemState currentState = STATE_WARMING_UP;
unsigned long stateStartTime = 0;
unsigned long lastTelemetryTime = 0;
int lastRawPirReading = LOW;
unsigned long motionTriggerCount = 0;

// ==========================================
// 4. HARDWARE HELPER FUNCTIONS
// ==========================================

/**
 * Safe LED controller supporting both direct digital drive and PWM current-limiting.
 * @param pin ESP32 GPIO pin number
 * @param turnOn True to illuminate, False to extinguish
 */
void setLedSafe(uint8_t pin, bool turnOn) {
  if (!turnOn) {
    // Completely OFF
    pinMode(pin, OUTPUT);
    digitalWrite(pin, LOW);
    return;
  }

  if (USE_PWM_CURRENT_LIMIT) {
    // Pulse Width Modulation to cap average current draw
    analogWrite(pin, SAFE_LED_DUTY_CYCLE);
  } else {
    // Full continuous 3.3V drive (requires external resistor)
    pinMode(pin, OUTPUT);
    digitalWrite(pin, HIGH);
  }
}

/**
 * Update physical indicators based on current state.
 */
void updateIndicators() {
  switch (currentState) {
    case STATE_WARMING_UP:
      // Rapid heartbeat pulse on built-in LED during warm-up
      digitalWrite(BUILTIN_LED_PIN, (millis() / 250) % 2 == 0 ? HIGH : LOW);
      setLedSafe(RED_LED_PIN, false);
      setLedSafe(GREEN_LED_PIN, false);
      break;

    case STATE_IDLE_LOCKED:
      // Secure state: RED LED illuminated, GREEN LED extinguished
      setLedSafe(RED_LED_PIN, true);
      setLedSafe(GREEN_LED_PIN, false);
      digitalWrite(BUILTIN_LED_PIN, LOW);
      break;

    case STATE_MOTION_DETECTED:
      // Active motion alert: GREEN LED illuminated, RED LED extinguished
      setLedSafe(RED_LED_PIN, false);
      setLedSafe(GREEN_LED_PIN, true);
      digitalWrite(BUILTIN_LED_PIN, HIGH);
      break;

    case STATE_COOLDOWN:
      // Transitioning: Both LEDs OFF or alternate blink to signify cooldown
      setLedSafe(RED_LED_PIN, (millis() / 300) % 2 == 0 ? true : false);
      setLedSafe(GREEN_LED_PIN, false);
      digitalWrite(BUILTIN_LED_PIN, LOW);
      break;
  }
}

/**
 * Transition the state machine and log formatted telemetry.
 */
void transitionTo(SystemState newState) {
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
      Serial.println(F("IDLE_LOCKED (Door secure, monitoring for motion. RED LED ON)"));
      break;
    case STATE_MOTION_DETECTED:
      motionTriggerCount++;
      Serial.print(F("MOTION_DETECTED (Event #"));
      Serial.print(motionTriggerCount);
      Serial.println(F("! GREEN LED ON)"));
      break;
    case STATE_COOLDOWN:
      Serial.print(F("COOLDOWN (Ignoring repeat PIR triggers for "));
      Serial.print(COOLDOWN_MS / 1000.0, 1);
      Serial.println(F("s)"));
      break;
  }
}

// ==========================================
// 5. SETUP ROUTINE
// ==========================================
void setup() {
  // Initialize Serial Monitor
  Serial.begin(115200);
  delay(1000); // Allow USB serial to stabilize

  Serial.println(F("=================================================="));
  Serial.println(F("  SMART AI DOOR SECURITY SYSTEM — PHASE 1"));
  Serial.println(F("  PIR Motion Detection & Safe LED Controller"));
  Serial.println(F("=================================================="));
  
  // Configure GPIO Modes
  pinMode(PIR_PIN, INPUT);
  pinMode(BUILTIN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);

  // Electrical safety report
  Serial.print(F("[SAFETY] PWM Current Limiting: "));
  if (USE_PWM_CURRENT_LIMIT) {
    Serial.print(F("ACTIVE (Duty: "));
    Serial.print(SAFE_LED_DUTY_CYCLE);
    Serial.println(F("/255) — Protecting GPIOs without resistors."));
  } else {
    Serial.println(F("OFF — Assuming external resistors are installed."));
  }

  Serial.print(F("[CONFIG] PIR Sensor Pin: GPIO "));
  Serial.println(PIR_PIN);
  Serial.print(F("[CONFIG] Red LED Pin: GPIO "));
  Serial.println(RED_LED_PIN);
  Serial.print(F("[CONFIG] Green LED Pin: GPIO "));
  Serial.println(GREEN_LED_PIN);
  
  Serial.println(F("\n[INIT] PIR sensor warming up... Please keep area motionless."));
  transitionTo(STATE_WARMING_UP);
}

// ==========================================
// 6. MAIN SUPERVISORY LOOP
// ==========================================
void loop() {
  unsigned long now = millis();
  int rawPir = digitalRead(PIR_PIN);

  // Update physical LED indicators
  updateIndicators();

  // ----------------------------------------------------
  // State Machine Logic
  // ----------------------------------------------------
  switch (currentState) {
    case STATE_WARMING_UP: {
      unsigned long elapsed = now - stateStartTime;
      // Print warm-up countdown every 3 seconds
      if (now - lastTelemetryTime >= 3000) {
        lastTelemetryTime = now;
        long remaining = (long)(PIR_WARMUP_MS - elapsed) / 1000;
        if (remaining > 0) {
          Serial.print(F("[WARMUP] Stabilizing... "));
          Serial.print(remaining);
          Serial.println(F(" seconds remaining"));
        }
      }

      if (elapsed >= PIR_WARMUP_MS) {
        Serial.println(F("[WARMUP COMPLETE] PIR sensor is now armed and active."));
        transitionTo(STATE_IDLE_LOCKED);
      }
      break;
    }

    case STATE_IDLE_LOCKED: {
      // Monitor PIR input
      if (rawPir == HIGH) {
        // Motion detected!
        transitionTo(STATE_MOTION_DETECTED);
      }
      break;
    }

    case STATE_MOTION_DETECTED: {
      // Hold Green LED ON for specified duration
      if (now - stateStartTime >= MOTION_ACTIVE_HOLD_MS) {
        // Active display duration elapsed -> enter cooldown
        transitionTo(STATE_COOLDOWN);
      }
      break;
    }

    case STATE_COOLDOWN: {
      // Ignore PIR triggers until cooldown period passes AND sensor returns to LOW
      if ((now - stateStartTime >= COOLDOWN_MS) && (rawPir == LOW)) {
        transitionTo(STATE_IDLE_LOCKED);
      }
      break;
    }
  }

  // ----------------------------------------------------
  // Heartbeat Telemetry (Every 5 seconds in IDLE mode)
  // ----------------------------------------------------
  if (currentState == STATE_IDLE_LOCKED && (now - lastTelemetryTime >= 5000)) {
    lastTelemetryTime = now;
    Serial.print(F("[HEARTBEAT] System armed | PIR: "));
    Serial.print(rawPir == HIGH ? F("HIGH (Motion)") : F("LOW (Clear)"));
    Serial.print(F(" | State: IDLE_LOCKED | Total Events: "));
    Serial.println(motionTriggerCount);
  }

  lastRawPirReading = rawPir;
  delay(20); // Small cycle delay for loop pacing
}
