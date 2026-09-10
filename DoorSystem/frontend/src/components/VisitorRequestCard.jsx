import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Check, X, Clock, Video, VideoOff, Camera, RefreshCw, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { sendDoorCommand } from '../services/api';

export default function VisitorRequestCard({ visitor, onResolved }) {
  const [useWebcam, setUseWebcam] = useState(true);
  const [webcamReady, setWebcamReady] = useState(false);
  const [webcamError, setWebcamError] = useState(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Safe fallback photo if webcam is unavailable or toggled off
  const defaultPhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80";

  // Initialize and manage webcam stream
  useEffect(() => {
    let isMounted = true;

    async function startWebcam() {
      if (!useWebcam) {
        stopWebcam();
        return;
      }

      setWebcamError(null);
      setWebcamReady(false);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Webcam API is not supported in this browser environment.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (isMounted) {
              videoRef.current.play().catch((e) => console.warn('Video play prevented:', e));
              setWebcamReady(true);
            }
          };
        }
      } catch (err) {
        console.warn('Webcam access error:', err);
        if (isMounted) {
          setWebcamError(err.name === 'NotAllowedError' ? 'Camera permission denied' : 'Camera unavailable');
          setWebcamReady(false);
        }
      }
    }

    function stopWebcam() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setWebcamReady(false);
    }

    startWebcam();

    return () => {
      isMounted = false;
      stopWebcam();
    };
  }, [useWebcam]);

  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !webcamReady) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedSnapshot(dataUrl);
    } catch (err) {
      console.error('Failed to capture snapshot:', err);
    }
  };

  const handleRetake = () => {
    setCapturedSnapshot(null);
  };

  const handleAllow = async () => {
    try {
      await sendDoorCommand('UNLOCK', `Owner approved visitor: ${visitor?.name || 'Visitor'}`);
      if (onResolved) onResolved('APPROVED');
    } catch (err) {
      console.error('Failed to allow visitor:', err);
    }
  };

  const handleDeny = async () => {
    try {
      await sendDoorCommand('LOCK', `Owner denied visitor: ${visitor?.name || 'Visitor'}`);
      if (onResolved) onResolved('DENIED');
    } catch (err) {
      console.error('Failed to deny visitor:', err);
    }
  };

  if (!visitor) return null;

  return (
    <div className={`visitor-alert-card ${isExpanded ? 'expanded' : ''}`}>
      {/* Prominent Visitor Photo / Live Webcam Frame */}
      <div className="visitor-photo-frame">
        {capturedSnapshot ? (
          <img src={capturedSnapshot} alt="Captured Visitor Snapshot" className="webcam-media" />
        ) : useWebcam && !webcamError ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="webcam-media webcam-video"
            />
            {!webcamReady && (
              <div className="webcam-loading-overlay">
                <RefreshCw size={28} className="animate-spin text-cyber" />
                <span>Connecting to HD Camera...</span>
              </div>
            )}
          </>
        ) : (
          <img
            src={visitor.photoUrl || defaultPhoto}
            alt="Visitor at Door"
            className="webcam-media"
            onError={(e) => {
              e.target.src = defaultPhoto;
            }}
          />
        )}

        {/* Live Status Badge */}
        <div className="live-badge">
          <span className="live-dot" />
          {useWebcam && !webcamError && !capturedSnapshot ? 'LIVE HD WEBCAM' : capturedSnapshot ? 'SNAPSHOT' : 'VISITOR PHOTO'}
        </div>

        {/* Quick Camera Overlay Controls */}
        <div className="webcam-overlay-controls">
          <button
            className="webcam-ctrl-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Standard View' : 'Expand Video Size'}
            type="button"
          >
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          {useWebcam && !webcamError && !capturedSnapshot && (
            <button
              className="webcam-ctrl-btn"
              onClick={handleCaptureSnapshot}
              title="Capture Snapshot"
              type="button"
            >
              <Camera size={15} />
            </button>
          )}

          {capturedSnapshot && (
            <button
              className="webcam-ctrl-btn"
              onClick={handleRetake}
              title="Return to Live Video"
              type="button"
            >
              <RefreshCw size={15} />
            </button>
          )}

          <button
            className="webcam-ctrl-btn"
            onClick={() => {
              setCapturedSnapshot(null);
              setUseWebcam(!useWebcam);
            }}
            title={useWebcam ? 'Switch to Mock Photo' : 'Activate Live Webcam'}
            type="button"
          >
            {useWebcam && !webcamError ? <VideoOff size={15} /> : <Video size={15} />}
          </button>
        </div>

        {/* Camera Error Pill */}
        {useWebcam && webcamError && (
          <div className="webcam-error-pill">
            <AlertCircle size={13} />
            <span>{webcamError}</span>
          </div>
        )}
      </div>

      {/* Visitor Identification & Purpose */}
      <div className="visitor-details">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-motion)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
            <Clock size={14} />
            Detected Just Now • Front Entrance
          </div>
          <h2 className="visitor-name">
            {visitor.name || 'Unknown Approaching Visitor'}
          </h2>
        </div>

        {/* Visitor Stated Message */}
        <div className="visitor-quote">
          "{visitor.message || 'Visitor is identifying purpose at door: "I am Rahul. I have a package delivery for the office."'}"
        </div>

        {/* AI Advisory Intelligence Layer */}
        <div className="ai-summary-box">
          <Sparkles size={18} style={{ color: '#06b6d4', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', color: '#38bdf8', marginBottom: '2px' }}>AI Advisory Analysis (Gemini)</strong>
            <span>
              {visitor.aiSummary || 'Likely delivery courier based on verbal statement. Request appears legitimate, but identity has not been verified.'}
            </span>
          </div>
        </div>

        {/* Decision Controls */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-allow" onClick={handleAllow} style={{ flex: 1, minWidth: '160px' }}>
            <Check size={18} />
            ALLOW ENTRY
          </button>
          <button className="btn btn-deny" onClick={handleDeny} style={{ flex: 1, minWidth: '160px' }}>
            <X size={18} />
            DENY ACCESS
          </button>
        </div>
      </div>
    </div>
  );
}
