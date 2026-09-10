"""Main entrypoint for the OpenCV Intrusion & Security Breach Detection System.
"""
import sys
import time
import argparse
from datetime import datetime
import cv2
import numpy as np

import config
from detector import BreachDetector
from alarm import AlarmManager


class ZoneSelector:
    """Handles interactive mouse drawing to define or modify the restricted zone."""
    def __init__(self):
        self.drawing = False
        self.ix = -1
        self.iy = -1
        self.current_rect = None
        self.active_mode = False

    def mouse_callback(self, event, x, y, flags, param):
        if not self.active_mode:
            return

        if event == cv2.EVENT_LBUTTONDOWN:
            self.drawing = True
            self.ix, self.iy = x, y

        elif event == cv2.EVENT_MOUSEMOVE:
            if self.drawing:
                x1, x2 = min(self.ix, x), max(self.ix, x)
                y1, y2 = min(self.iy, y), max(self.iy, y)
                self.current_rect = (x1, y1, max(1, x2 - x1), max(1, y2 - y1))

        elif event == cv2.EVENT_LBUTTONUP:
            self.drawing = False
            x1, x2 = min(self.ix, x), max(self.ix, x)
            y1, y2 = min(self.iy, y), max(self.iy, y)
            if (x2 - x1) > 20 and (y2 - y1) > 20:
                self.current_rect = (x1, y1, x2 - x1, y2 - y1)


def draw_hud(display, zone_rect, alarm_mgr, mode, fps, is_drawing_zone):
    """Render a clean, high-contrast security camera HUD overlay."""
    h, w = display.shape[:2]
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Flashing alert border if alarm is sounding
    if alarm_mgr.is_alarming and alarm_mgr.is_armed:
        # Flash every 250ms
        flash_state = int(time.time() * 4) % 2 == 0
        border_color = (0, 0, 255) if flash_state else (0, 140, 255)
        cv2.rectangle(display, (0, 0), (w - 1, h - 1), border_color, 8)

        # Prominent Breach Banner
        banner_text = "!!! SECURITY BREACH DETECTED !!!"
        (tw, th), _ = cv2.getTextSize(banner_text, cv2.FONT_HERSHEY_DUPLEX, 0.8, 2)
        bx1 = (w - tw) // 2 - 20
        by1 = 45
        bx2 = bx1 + tw + 40
        by2 = by1 + th + 20
        cv2.rectangle(display, (bx1, by1), (bx2, by2), (0, 0, 180), -1)
        cv2.rectangle(display, (bx1, by1), (bx2, by2), (255, 255, 255), 2)
        cv2.putText(
            display, banner_text, (bx1 + 20, by2 - 10),
            cv2.FONT_HERSHEY_DUPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA
        )

    # Top Status Bar (Translucent dark overlay)
    bar_overlay = display.copy()
    cv2.rectangle(bar_overlay, (0, 0), (w, 36), (15, 15, 15), -1)
    cv2.addWeighted(bar_overlay, 0.75, display, 0.25, 0, display)

    # Status indicators
    arm_text = "ARMED" if alarm_mgr.is_armed else "DISARMED"
    arm_color = (0, 255, 0) if alarm_mgr.is_armed else (120, 120, 120)
    mute_text = "MUTED" if alarm_mgr.is_muted else "AUDIO ON"
    mute_color = (0, 165, 255) if alarm_mgr.is_muted else (0, 255, 180)

    status_str = f"STATUS: {arm_text}  |  MODE: {mode}  |  {mute_text}  |  FPS: {fps:.1f}"
    cv2.putText(display, status_str, (12, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (230, 230, 230), 1, cv2.LINE_AA)
    # Highlight armed indicator dot
    cv2.circle(display, (w - 200, 18), 6, arm_color, -1)
    cv2.putText(display, now_str, (w - 180, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1, cv2.LINE_AA)

    # Draw Restricted Zone
    if zone_rect is not None:
        zx, zy, zw, zh = zone_rect
        zone_color = (0, 0, 255) if (alarm_mgr.is_alarming and alarm_mgr.is_armed) else (0, 215, 255)
        
        # Draw translucent tinted zone
        zone_sub = display[zy:zy+zh, zx:zx+zw]
        if zone_sub.size > 0:
            tint = np.full_like(zone_sub, (0, 0, 120) if alarm_mgr.is_alarming else (20, 50, 60))
            cv2.addWeighted(zone_sub, 0.82, tint, 0.18, 0, zone_sub)

        # Draw dashed-style corners or perimeter box
        cv2.rectangle(display, (zx, zy), (zx + zw, zy + zh), zone_color, 2)
        zone_title = "RESTRICTED ZONE [BREACH]" if alarm_mgr.is_alarming else "RESTRICTED SECURITY ZONE"
        cv2.putText(display, zone_title, (zx + 6, max(20, zy - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.48, zone_color, 1, cv2.LINE_AA)

    # Bottom helper bar
    help_overlay = display.copy()
    cv2.rectangle(help_overlay, (0, h - 30), (w, h), (15, 15, 15), -1)
    cv2.addWeighted(help_overlay, 0.75, display, 0.25, 0, display)

    if is_drawing_zone:
        help_text = "ZONE EDIT: Click & drag mouse to set new zone. Press [Z] to finish."
        help_color = (0, 255, 255)
    else:
        help_text = "[SPACE] Arm/Disarm | [Z] Edit Zone | [M] Mute | [D] Mode | [S] Snap | [Q] Quit"
        help_color = (190, 190, 190)

    cv2.putText(display, help_text, (12, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.45, help_color, 1, cv2.LINE_AA)


def main():
    parser = argparse.ArgumentParser(description="OpenCV Intrusion & Security Breach Detection")
    parser.add_argument(
        "--camera",
        type=str,
        default=str(config.CAMERA_SOURCE),
        help="Camera source: index (e.g. 0) or IP/ESP32-CAM URL"
    )
    parser.add_argument(
        "--mode",
        choices=["MOTION", "PERSON", "BOTH"],
        default=config.DETECTION_MODE,
        help="Detection mode"
    )
    args = parser.parse_args()

    # Parse camera source (int if single digit, else string URL)
    cam_source = int(args.camera) if args.camera.isdigit() else args.camera
    mode = args.mode

    print("==================================================")
    print("      OPENCV INTRUSION & BREACH DETECTION         ")
    print("==================================================")
    print(f" Camera Source  : {cam_source}")
    print(f" Detection Mode : {mode}")
    print(f" Snapshot Folder: {config.INCIDENT_DIR}")
    print(" Controls:")
    print("   [SPACE]  : Arm / Disarm system")
    print("   [Z]      : Edit restricted zone with mouse")
    print("   [M]      : Mute / Unmute audio alarm")
    print("   [D]      : Cycle detection mode (Motion/Person/Both)")
    print("   [S]      : Capture manual snapshot")
    print("   [R]      : Reset restricted zone to default")
    print("   [Q/ESC]  : Quit application")
    print("==================================================")

    # Initialize video capture
    # If on Windows and using local webcam index, prefer DirectShow backend for faster start
    if isinstance(cam_source, int) and sys.platform.startswith("win"):
        cap = cv2.VideoCapture(cam_source, cv2.CAP_DSHOW)
    else:
        cap = cv2.VideoCapture(cam_source)

    if not cap.isOpened():
        print(f"[ERROR] Could not open camera source: {cam_source}")
        if isinstance(cam_source, int):
            print("Troubleshooting: Check if another application is using the webcam, or try index 1.")
        else:
            print("Troubleshooting: Ensure your ESP32-CAM is connected to WiFi and stream URL is accessible.")
        return

    # Try setting resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, config.FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.FRAME_HEIGHT)

    # Read first frame to determine dimensions
    ret, frame = cap.read()
    if not ret or frame is None:
        print("[ERROR] Failed to read initial frame from camera.")
        cap.release()
        return

    frame_h, frame_w = frame.shape[:2]

    # Initialize restricted zone from default ratios
    dz = config.DEFAULT_ZONE
    zone_rect = (
        int(dz[0] * frame_w),
        int(dz[1] * frame_h),
        int((dz[2] - dz[0]) * frame_w),
        int((dz[3] - dz[1]) * frame_h),
    )

    detector = BreachDetector()
    alarm_mgr = AlarmManager()
    zone_selector = ZoneSelector()

    window_name = "Security Breach & Intrusion Monitor"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.setMouseCallback(window_name, zone_selector.mouse_callback)

    fps = 0.0
    prev_time = time.time()

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                # If network stream drops, wait briefly and retry
                time.sleep(0.03)
                continue

            current_time = time.time()
            fps = 0.9 * fps + 0.1 * (1.0 / max(0.001, current_time - prev_time))
            prev_time = current_time

            # Update zone if user drew a new one
            if zone_selector.current_rect is not None:
                zone_rect = zone_selector.current_rect

            # Run detection if armed
            display = frame.copy()
            breach_detected = False
            motion_results = []
            person_results = []

            if alarm_mgr.is_armed and not zone_selector.active_mode:
                breach_detected, motion_results, person_results, _ = detector.process_frame(
                    frame, zone_rect, mode=mode
                )

                if breach_detected:
                    breach_reason = []
                    if any(m[-1] for m in motion_results):
                        breach_reason.append("Motion")
                    if any(p[-1] for p in person_results):
                        breach_reason.append("Person")
                    reason_str = " + ".join(breach_reason) if breach_reason else "Intrusion"

                    alarm_mgr.trigger_breach(display, breach_info=reason_str)

            # Draw motion bounding boxes
            for (mx, my, mw, mh, is_breach) in motion_results:
                color = (0, 0, 255) if is_breach else (0, 255, 0)
                cv2.rectangle(display, (mx, my), (mx + mw, my + mh), color, 2)
                label = "BREACH: Motion" if is_breach else "Motion"
                cv2.putText(
                    display, label, (mx, max(15, my - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA
                )

            # Draw person bounding boxes
            for (px, py, pw, ph, is_breach) in person_results:
                color = (0, 0, 255) if is_breach else (255, 200, 0)
                cv2.rectangle(display, (px, py), (px + pw, py + ph), color, 2)
                label = "BREACH: Person" if is_breach else "Person"
                cv2.putText(
                    display, label, (px, max(15, py - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, color, 2, cv2.LINE_AA
                )

            # Update alarm timers (handles auto-reset after persistence timeout)
            alarm_mgr.update()

            # Render HUD
            draw_hud(
                display,
                zone_rect,
                alarm_mgr,
                mode,
                fps,
                is_drawing_zone=zone_selector.active_mode
            )

            cv2.imshow(window_name, display)

            # Handle Keypresses
            key = cv2.waitKey(1) & 0xFF

            if key in (ord('q'), ord('Q'), 27):  # Q or ESC to quit
                break
            elif key == ord(' '):  # SPACE: Arm / Disarm
                is_armed = alarm_mgr.toggle_arm()
                print(f"[STATUS] System {'ARMED' if is_armed else 'DISARMED'}")
            elif key in (ord('m'), ord('M')):  # M: Mute
                is_muted = alarm_mgr.toggle_mute()
                print(f"[AUDIO] Alarm sound {'MUTED' if is_muted else 'ENABLED'}")
            elif key in (ord('d'), ord('D')):  # D: Toggle Mode
                modes = ["MOTION", "PERSON", "BOTH"]
                mode = modes[(modes.index(mode) + 1) % len(modes)]
                print(f"[MODE] Switched detection mode to: {mode}")
            elif key in (ord('s'), ord('S')):  # S: Manual snapshot
                snap_time = datetime.now().strftime("%Y%m%d_%H%M%S")
                snap_path = config.INCIDENT_DIR / f"manual_{snap_time}.jpg"
                cv2.imwrite(str(snap_path), display)
                print(f"[SNAP] Saved manual snapshot: {snap_path.name}")
            elif key in (ord('z'), ord('Z')):  # Z: Interactive Zone Draw
                zone_selector.active_mode = not zone_selector.active_mode
                if zone_selector.active_mode:
                    print("[ZONE] Click and drag on video to draw new restricted zone.")
                else:
                    print(f"[ZONE] Zone configured: {zone_rect}")
            elif key in (ord('r'), ord('R')):  # R: Reset zone
                zone_rect = (
                    int(dz[0] * frame_w),
                    int(dz[1] * frame_h),
                    int((dz[2] - dz[0]) * frame_w),
                    int((dz[3] - dz[1]) * frame_h),
                )
                zone_selector.current_rect = zone_rect
                print("[ZONE] Reset to default zone.")

    finally:
        alarm_mgr.shutdown()
        cap.release()
        cv2.destroyAllWindows()
        print("[SHUTDOWN] Video capture released and windows closed.")


if __name__ == "__main__":
    main()
