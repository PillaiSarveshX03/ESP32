"""Breach and Intrusion Detection module using OpenCV.
Provides motion detection via MOG2 background subtraction and human detection via HOG.
"""
import cv2
import numpy as np
import config


def boxes_intersect(box_a, box_b):
    """Check if two rectangles (x, y, w, h) overlap."""
    ax1, ay1, aw, ah = box_a
    ax2, ay2 = ax1 + aw, ay1 + ah

    bx1, by1, bw, bh = box_b
    bx2, by2 = bx1 + bw, by1 + bh

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    return (inter_x1 < inter_x2) and (inter_y1 < inter_y2)


def point_in_box(px, py, box):
    """Check if point (px, py) is inside (x, y, w, h)."""
    bx, by, bw, bh = box
    return bx <= px <= (bx + bw) and by <= py <= (by + bh)


class BreachDetector:
    def __init__(self):
        # Adaptive Background Subtractor for motion detection
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(
            history=500,
            varThreshold=25,
            detectShadows=False
        )

        # Morphological kernels for cleaning motion masks
        self.kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        self.kernel_dilate = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))

        # HOG descriptor for human / person detection
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

    def detect_motion(self, frame, zone_rect=None):
        """Detect moving objects in the frame and check if they breach the zone.
        Returns: list of tuples (x, y, w, h, is_breach)
        """
        # Blur to eliminate high frequency sensor noise
        blurred = cv2.GaussianBlur(frame, (5, 5), 0)
        fg_mask = self.bg_subtractor.apply(blurred)

        # Remove speckle noise and bridge gaps
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, self.kernel_open)
        fg_mask = cv2.dilate(fg_mask, self.kernel_dilate, iterations=2)

        contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        motion_boxes = []

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < config.MIN_MOTION_AREA:
                continue

            x, y, w, h = cv2.boundingRect(cnt)
            box = (x, y, w, h)
            is_breach = False

            if zone_rect is not None:
                # Intrusion occurs if moving object bounding box intersects restricted zone
                is_breach = boxes_intersect(box, zone_rect)

            motion_boxes.append((x, y, w, h, is_breach))

        return motion_boxes, fg_mask

    def detect_people(self, frame, zone_rect=None):
        """Detect people using HOG and check if they breach the zone.
        Returns: list of tuples (x, y, w, h, is_breach)
        """
        # Resize for faster HOG processing if frame is large
        h, w = frame.shape[:2]
        scale_factor = 1.0
        if w > 480:
            scale_factor = 480.0 / w
            small_frame = cv2.resize(frame, (480, int(h * scale_factor)))
        else:
            small_frame = frame

        # Run HOG detector
        rects, weights = self.hog.detectMultiScale(
            small_frame,
            winStride=config.PERSON_DETECTOR_STRIDE,
            padding=config.PERSON_DETECTOR_PADDING,
            scale=config.PERSON_DETECTOR_SCALE
        )

        person_boxes = []
        for i, (rx, ry, rw, rh) in enumerate(rects):
            # Scale back coordinates to original frame size
            if scale_factor != 1.0:
                rx = int(rx / scale_factor)
                ry = int(ry / scale_factor)
                rw = int(rw / scale_factor)
                rh = int(rh / scale_factor)

            box = (rx, ry, rw, rh)
            # Center-foot coordinate of the person (more accurate for tripwire/ground perimeter)
            foot_x = rx + rw // 2
            foot_y = ry + int(rh * 0.9)

            is_breach = False
            if zone_rect is not None:
                # Breach if foot is in zone or bounding box significantly overlaps
                is_breach = point_in_box(foot_x, foot_y, zone_rect) or boxes_intersect(box, zone_rect)

            person_boxes.append((rx, ry, rw, rh, is_breach))

        return person_boxes

    def process_frame(self, frame, zone_rect, mode="BOTH"):
        """Run requested detection mode(s) on current frame.
        Returns:
            breach_detected: bool
            motion_results: list of (x, y, w, h, is_breach)
            person_results: list of (x, y, w, h, is_breach)
            fg_mask: foreground mask
        """
        breach_detected = False
        motion_results = []
        person_results = []
        fg_mask = None

        if mode in ("MOTION", "BOTH"):
            motion_results, fg_mask = self.detect_motion(frame, zone_rect)
            if any(b[-1] for b in motion_results):
                breach_detected = True

        if mode in ("PERSON", "BOTH"):
            person_results = self.detect_people(frame, zone_rect)
            if any(b[-1] for b in person_results):
                breach_detected = True

        return breach_detected, motion_results, person_results, fg_mask
