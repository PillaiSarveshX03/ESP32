"""Headless test script to verify detector logic, alarm triggering, and snapshot logging.
"""
import time
import numpy as np
import cv2

import config
from detector import BreachDetector, boxes_intersect, point_in_box
from alarm import AlarmManager


def test_geometry():
    print("[TEST] Testing geometry intersection...")
    # Zone: (100, 100, 200, 200)
    zone = (100, 100, 200, 200)

    # Box 1: inside zone
    box_inside = (150, 150, 50, 50)
    assert boxes_intersect(box_inside, zone), "Failed: box_inside should intersect zone"

    # Box 2: outside zone
    box_outside = (400, 400, 50, 50)
    assert not boxes_intersect(box_outside, zone), "Failed: box_outside should not intersect zone"

    # Point inside/outside
    assert point_in_box(150, 150, zone), "Point (150, 150) should be inside zone"
    assert not point_in_box(50, 50, zone), "Point (50, 50) should be outside zone"
    print("[PASS] Geometry checks passed.")


def test_detector_synthetic():
    print("[TEST] Testing BreachDetector with synthetic frames...")
    detector = BreachDetector()
    zone = (100, 100, 300, 300)

    # Blank frame (no motion)
    black_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    for _ in range(5):
        detector.process_frame(black_frame, zone, mode="MOTION")

    # Introduce synthetic moving bright box inside zone
    frame_with_motion = black_frame.copy()
    cv2.rectangle(frame_with_motion, (150, 150), (250, 250), (255, 255, 255), -1)

    breached, motion_boxes, _, _ = detector.process_frame(frame_with_motion, zone, mode="MOTION")
    print(f"       Breach detected: {breached}, motion boxes: {len(motion_boxes)}")
    assert len(motion_boxes) > 0, "Synthetic motion should be detected"
    assert breached, "Intrusion in zone should report a breach"
    print("[PASS] Motion and breach detection passed.")


def test_alarm_and_snapshot():
    print("[TEST] Testing AlarmManager and snapshot capture...")
    alarm = AlarmManager()
    alarm.is_muted = True  # Keep muted during automated testing
    assert alarm.is_armed, "Alarm should default to armed"

    test_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(test_frame, "TEST INCIDENT", (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)

    # Trigger breach
    alarm.trigger_breach(test_frame, breach_info="Automated Test Breach")
    assert alarm.is_alarming, "Alarm should be alarming after breach"

    # Verify incident snapshot was created
    time.sleep(0.5)
    snapshots = list(config.INCIDENT_DIR.glob("breach_*.jpg"))
    assert len(snapshots) > 0, "Incident snapshot file should exist in incidents/"
    print(f"       Verified snapshot created: {snapshots[-1].name}")

    # Shutdown
    alarm.shutdown()
    print("[PASS] Alarm and snapshot logging passed.")


if __name__ == "__main__":
    test_geometry()
    test_detector_synthetic()
    test_alarm_and_snapshot()
    print("\nALL TESTS PASSED SUCCESSFULLY!")
