#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "Airtel_praf_7435";
const char* password = "air69935";

const int pirPin = 13;
WebServer server(80);

bool motionDetected = false;

// HTML Dashboard
const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ESP32 PIR Motion Monitor</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      text-align: center;
      margin-top: 60px;
      background-color: #f0f2f5;
    }
    .card {
      background: white;
      padding: 35px 25px;
      border-radius: 16px;
      display: inline-block;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      width: 85%;
      max-width: 350px;
    }
    h2 { color: #333; margin-bottom: 25px; }
    .badge {
      display: block;
      padding: 20px 10px;
      font-size: 22px;
      font-weight: bold;
      border-radius: 12px;
      color: white;
      transition: background-color 0.3s ease;
    }
    .motion {
      background-color: #e74c3c;
      box-shadow: 0 0 20px rgba(231, 76, 60, 0.5);
    }
    .no-motion {
      background-color: #2ecc71;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>Motion Monitor</h2>
    <div id="statusBadge" class="badge no-motion">NO MOTION</div>
  </div>

  <script>
    function checkMotion() {
      fetch('/status')
        .then(res => res.text())
        .then(state => {
          const badge = document.getElementById('statusBadge');
          if (state === "1") {
            badge.innerText = "MOTION DETECTED!";
            badge.className = "badge motion";
          } else {
            badge.innerText = "NO MOTION";
            badge.className = "badge no-motion";
          }
        })
        .catch(err => console.error(err));
    }

    // Poll the ESP32 every 300ms for fast updates
    setInterval(checkMotion, 300);
  </script>
</body>
</html>
)rawliteral";

void handleRoot() {
  server.send(200, "text/html", index_html);
}

void handleStatus() {
  // Return "1" if motion, "0" if no motion
  server.send(200, "text/plain", motionDetected ? "1" : "0");
}

void setup() {
  Serial.begin(115200);
  pinMode(pirPin, INPUT);

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.print("Open this URL: http://");
  Serial.println(WiFi.localIP());

  // Web routes
  server.on("/", handleRoot);
  server.on("/status", handleStatus);
  server.begin();
}

void loop() {
  server.handleClient();

  // Read the sensor
  motionDetected = (digitalRead(pirPin) == HIGH);
}