#include <WiFi.h>
#include <WebServer.h>
#include <ESP32Servo.h>

const char* ssid = "Airtel_praf_7435";
const char* password = "air69935";

Servo myServo;
const int servoPin = 18;

WebServer server(80);

// HTML & Button Web Page
const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ESP32 Servo Button Control</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f4f4f9; }
    .card { background: white; padding: 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    h2 { color: #333; margin-bottom: 20px; }
    .btn {
      display: block;
      width: 220px;
      padding: 15px;
      margin: 15px auto;
      font-size: 18px;
      font-weight: bold;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-0 { background-color: #ff5722; }
    .btn-0:active { background-color: #e64a19; }
    .btn-180 { background-color: #007bff; }
    .btn-180:active { background-color: #0056b3; }
    .status { font-size: 16px; color: #666; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Servo Motor Control</h2>
    <button class="btn btn-0" onclick="moveServo(0)">Move to 0&deg;</button>
    <button class="btn btn-180" onclick="moveServo(180)">Move to 180&deg;</button>
    <p class="status" id="statusText">Current Position: 0&deg;</p>
  </div>

  <script>
    function moveServo(pos) {
      document.getElementById('statusText').innerText = 'Moving to: ' + pos + '°';
      fetch('/set?angle=' + pos);
    }
  </script>
</body>
</html>
)rawliteral";

void handleRoot() {
  server.send(200, "text/html", index_html);
}

void handleSet() {
  if (server.hasArg("angle")) {
    int angle = server.arg("angle").toInt();
    myServo.write(angle);
    server.send(200, "text/plain", "OK");
  } else {
    server.send(400, "text/plain", "Missing angle parameter");
  }
}

void setup() {
  Serial.begin(115200);

  // Configure ESP32Servo
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  myServo.setPeriodHertz(50);
  myServo.attach(servoPin, 500, 2400);
  myServo.write(0); // Start at 0 degrees

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
  Serial.print("ESP32 Web Server IP: http://");
  Serial.println(WiFi.localIP());

  // Set HTTP routes
  server.on("/", handleRoot);
  server.on("/set", handleSet);

  server.begin();
}

void loop() {
  server.handleClient();
}