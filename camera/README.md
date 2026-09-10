# OpenCV Security Breach & Intrusion Detection System

A real-time computer vision security perimeter monitoring system built with OpenCV and Python. It monitors a configurable restricted security zone via your webcam or ESP32-CAM stream, detects intrusions/breaches, sounds an audio alarm, flashes visual alert HUDs, and captures timestamped incident photos.

---

## Features

- **Live Camera Stream**: Works out of the box with your webcam (`0`) and easily switches to an ESP32-CAM HTTP / RTSP stream.
- **Dual Breach Detection**:
  - **Motion Detection**: Background-subtraction (`MOG2`) contour analysis to catch moving objects.
  - **Person Detection**: HOG (Histogram of Oriented Gradients) person detector to identify human bodies/intruders.
- **Configurable Restricted Zone**:
  - Default central security perimeter box.
  - **Interactive Zone Drawing**: Press `Z` and click & drag with your mouse directly on the video feed to customize your security perimeter.
- **Audio & Visual Alarms**:
  - **Sound Alarm**: Dual-tone emergency siren using Windows native sound (`winsound.Beep`) running on an asynchronous thread (no frame lag).
  - **Visual HUD Alert**: Flashing red perimeter borders, illuminated breach alerts, and intruder bounding boxes.
  - **Incident Logging**: Automatically captures evidence frames to `incidents/breach_YYYYMMDD_HHMMSS.jpg`.
- **Interactive Hotkeys**:
  - `[SPACE]` : Arm / Disarm system
  - `[Z]`     : Edit restricted zone with mouse (click & drag)
  - `[M]`     : Mute / Unmute audio siren
  - `[D]`     : Cycle detection mode (`MOTION` -> `PERSON` -> `BOTH`)
  - `[S]`     : Manually take an incident snapshot
  - `[R]`     : Reset security zone to default
  - `[Q]` / `[ESC]` : Exit

---

## Quick Start

### 1. Run with Default Webcam:
```bash
py main.py
```

### 2. Choose Detection Mode:
```bash
py main.py --mode MOTION
py main.py --mode PERSON
py main.py --mode BOTH
```

### 3. Connect to ESP32-CAM:
To stream from an ESP32-CAM over WiFi:
1. Ensure your ESP32-CAM is running the CameraWebServer example (or standard MJPEG streaming sketch).
2. Pass the stream URL directly via CLI:
   ```bash
   py main.py --camera "http://192.168.1.100:81/stream"
   ```
   Or set `CAMERA_SOURCE = "http://192.168.1.100:81/stream"` inside `config.py`.

---

## Configuration (`config.py`)

You can customize detection sensitivity and alarm timing directly in `config.py`:
- `MIN_MOTION_AREA`: Minimum contour area to ignore small noise/dust (default: `1800` px).
- `ALARM_BEEP_FREQ`: Audio siren pitch (default: `2000` Hz).
- `ALARM_PERSISTENCE_SECS`: How long the alarm continues after a breach event (default: `2.0` s).
- `SNAPSHOT_COOLDOWN_SECS`: Minimum interval between saved snapshots (default: `3.0` s).
- `DEFAULT_ZONE`: Normalized relative coordinates `[x1, y1, x2, y2]` of the zone.
