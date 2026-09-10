"""Configuration settings for OpenCV Intrusion & Breach Detection System.
"""
from pathlib import Path

# Camera Settings
# Set to 0 (or 1) for default local webcam.
# For ESP32-CAM, replace with your stream URL, e.g.:
# CAMERA_SOURCE = "http://192.168.1.100:81/stream"
# CAMERA_SOURCE = "http://192.168.1.100/cam-hi.jpg"
CAMERA_SOURCE = 0

FRAME_WIDTH = 640
FRAME_HEIGHT = 480
FPS_TARGET = 30

# Detection Settings
# Options: "MOTION", "PERSON", "BOTH"
DETECTION_MODE = "BOTH"

# Minimum contour area in pixels to qualify as a motion intrusion
MIN_MOTION_AREA = 1800

# Person detection confidence threshold for HOG detector
PERSON_DETECTOR_STRIDE = (8, 8)
PERSON_DETECTOR_PADDING = (4, 4)
PERSON_DETECTOR_SCALE = 1.05

# Alarm Settings
ALARM_SOUND_ENABLED = True
ALARM_BEEP_FREQ = 2000      # Hz
ALARM_BEEP_DURATION_MS = 250 # ms per pulse
ALARM_PERSISTENCE_SECS = 2.0 # how long alarm stays active after last breach detection
SNAPSHOT_COOLDOWN_SECS = 3.0 # cooldown between saving snapshot images

# Restricted Breach Zone
# Default zone relative proportions [x1, y1, x2, y2] (0.0 to 1.0)
# Example: [0.2, 0.2, 0.8, 0.8] covers the center 60% of the screen
DEFAULT_ZONE = [0.2, 0.2, 0.8, 0.8]

# Output Directory
BASE_DIR = Path(__file__).resolve().parent
INCIDENT_DIR = BASE_DIR / "incidents"
INCIDENT_DIR.mkdir(exist_ok=True)
