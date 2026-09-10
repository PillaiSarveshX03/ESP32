const API_BASE_URL = 'http://localhost:5000/api';

export async function fetchSystemStatus() {
  const res = await fetch(`${API_BASE_URL}/device/status`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

export async function sendDoorCommand(command, reason = 'Owner Action', angle = undefined) {
  const payload = { command, reason };
  if (angle !== undefined) payload.angle = Number(angle);
  const res = await fetch(`${API_BASE_URL}/device/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to send command');
  return res.json();
}

export async function setServoAngle(angle, reason = 'Custom Angle Slider') {
  const res = await fetch(`${API_BASE_URL}/device/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'SET_ANGLE', angle: Number(angle), reason })
  });
  if (!res.ok) throw new Error('Failed to set servo angle');
  return res.json();
}

export async function triggerSimulatedEvent(eventType = 'MOTION_DETECTED') {
  const res = await fetch(`${API_BASE_URL}/device/event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-token': 'smart-door-esp32-secret-token-2026'
    },
    body: JSON.stringify({
      deviceId: 'door-001',
      event: eventType,
      timestamp: new Date().toISOString()
    })
  });
  return res.json();
}
