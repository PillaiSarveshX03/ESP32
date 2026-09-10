"""Alarm manager module.
Handles non-blocking audio alerts, snapshot recording, and alarm states.
"""
import sys
import time
import cv2
import threading
from datetime import datetime
from pathlib import Path
import config

try:
    import winsound
    HAS_WINSOUND = True
except ImportError:
    HAS_WINSOUND = False


class AlarmManager:
    def __init__(self):
        self.is_armed = True
        self.is_muted = not config.ALARM_SOUND_ENABLED
        self.last_breach_time = 0.0
        self.last_snapshot_time = 0.0
        self.is_alarming = False
        
        # Audio worker state
        self._stop_audio_event = threading.Event()
        self._sound_trigger_event = threading.Event()
        self._audio_thread = threading.Thread(target=self._audio_worker, daemon=True)
        self._audio_thread.start()

    def trigger_breach(self, frame=None, breach_info="Intrusion Detected"):
        """Call this whenever a breach/intrusion is detected."""
        if not self.is_armed:
            return

        now = time.time()
        self.last_breach_time = now
        self.is_alarming = True
        self._sound_trigger_event.set()

        # Save snapshot if cooldown elapsed
        if frame is not None and (now - self.last_snapshot_time) >= config.SNAPSHOT_COOLDOWN_SECS:
            self._save_incident_snapshot(frame, breach_info)
            self.last_snapshot_time = now

    def update(self):
        """Update active alarm state based on persistence duration."""
        if self.is_alarming:
            if time.time() - self.last_breach_time > config.ALARM_PERSISTENCE_SECS:
                self.is_alarming = False
                self._sound_trigger_event.clear()

    def _audio_worker(self):
        """Background thread playing siren/beep pulses without blocking the main loop."""
        while not self._stop_audio_event.is_set():
            if self._sound_trigger_event.is_set() and not self.is_muted and self.is_armed:
                try:
                    if HAS_WINSOUND:
                        # High-low siren pulse pattern
                        winsound.Beep(config.ALARM_BEEP_FREQ, config.ALARM_BEEP_DURATION_MS)
                        winsound.Beep(int(config.ALARM_BEEP_FREQ * 0.75), config.ALARM_BEEP_DURATION_MS)
                    else:
                        print("\a", end="", flush=True)
                        time.sleep(0.3)
                except Exception:
                    time.sleep(0.1)
            else:
                time.sleep(0.05)

    def _save_incident_snapshot(self, frame, breach_info):
        """Save evidence snapshot with timestamp."""
        try:
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"breach_{timestamp_str}.jpg"
            filepath = config.INCIDENT_DIR / filename
            
            # Create a copy with incident stamp
            snapshot = frame.copy()
            stamp_text = f"BREACH ALERT: {breach_info} | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            cv2.putText(
                snapshot, stamp_text, (15, snapshot.shape[0] - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2, cv2.LINE_AA
            )
            cv2.imwrite(str(filepath), snapshot)
            print(f"[ALARM] Snapshot saved: {filepath.name}")
        except Exception as e:
            print(f"[ALARM] Failed to save snapshot: {e}")

    def toggle_arm(self):
        self.is_armed = not self.is_armed
        if not self.is_armed:
            self.is_alarming = False
            self._sound_trigger_event.clear()
        return self.is_armed

    def toggle_mute(self):
        self.is_muted = not self.is_muted
        if self.is_muted:
            self._sound_trigger_event.clear()
        return self.is_muted

    def shutdown(self):
        self._stop_audio_event.set()
        self._sound_trigger_event.clear()
