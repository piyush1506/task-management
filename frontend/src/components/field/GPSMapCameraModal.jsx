import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
  Camera,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Compass,
  Building,
  RotateCcw,
  Send,
  FlipHorizontal,
  Navigation,
} from 'lucide-react';

export default function GPSMapCameraModal({ isOpen, onClose, onSuccess }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for selfie, 'environment' for back
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Live GPS state
  const [locationLoading, setLocationLoading] = useState(true);
  const [geoData, setGeoData] = useState({
    latitude: 25.351463, // default demo coordinates
    longitude: 74.632922,
    accuracy: 12,
    address: 'Inder Pratash Tower, Bhopal Ganj, Bhilwara, Rajasthan 311001, India',
    city: 'Bhilwara',
    state: 'Rajasthan',
    country: 'India',
  });

  // Captured state
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Form inputs
  const [purpose, setPurpose] = useState('CLIENT_VISIT');
  const [notes, setNotes] = useState('');

  // Start Camera
  const startCamera = async (facing = facingMode) => {
    setCameraError('');
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera access error:', err.message);
      setCameraError(
        'Unable to access camera. Please allow camera permissions in your browser or connect a webcam.'
      );
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  // Switch between front and back camera
  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Live Geolocation acquisition & reverse geocoding
  const fetchLocation = () => {
    setLocationLoading(true);
    if (!navigator.geolocation) {
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy || 10);

        try {
          // Reverse geocoding via OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'WorkSphere-GPS-Camera/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const city = addr.city || addr.town || addr.village || addr.county || 'Local Area';
            const state = addr.state || 'State';
            const country = addr.country || 'India';
            const displayAddress = data.display_name || `${city}, ${state}, ${country}`;

            setGeoData({
              latitude: lat,
              longitude: lng,
              accuracy: acc,
              address: displayAddress,
              city,
              state,
              country,
            });
          } else {
            setGeoData((prev) => ({
              ...prev,
              latitude: lat,
              longitude: lng,
              accuracy: acc,
            }));
          }
        } catch (e) {
          setGeoData((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            accuracy: acc,
          }));
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      setSubmitError('');
      fetchLocation();
      startCamera('user');
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  // Capture photo and stamp GPS watermark onto canvas
  const captureAndStamp = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. Draw raw video frame
    // If selfie camera, un-mirror on the final photo for natural orientation
    ctx.drawImage(video, 0, 0, width, height);

    // 2. Draw GPS Map Camera watermark overlay (styled exactly as reference photo)
    const overlayHeight = Math.max(160, Math.round(height * 0.28));
    const overlayY = height - overlayHeight - 20;
    const overlayX = 20;
    const overlayWidth = width - 40;
    const radius = 16;

    // Background translucent dark card
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'; // slate-900 / 88%
    ctx.beginPath();
    ctx.roundRect(overlayX, overlayY, overlayWidth, overlayHeight, radius);
    ctx.fill();

    // Subtle border
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    // 3. Mini Map Graphic on the Left
    const mapSize = overlayHeight - 24;
    const mapX = overlayX + 12;
    const mapY = overlayY + 12;

    // Draw stylized map background (satellite / street representation)
    ctx.fillStyle = '#223843';
    ctx.beginPath();
    ctx.roundRect(mapX, mapY, mapSize, mapSize, 10);
    ctx.fill();

    // Stylized road lines on mini-map
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(mapX + 10, mapY + mapSize * 0.3);
    ctx.lineTo(mapX + mapSize - 10, mapY + mapSize * 0.7);
    ctx.moveTo(mapX + mapSize * 0.6, mapY + 10);
    ctx.lineTo(mapX + mapSize * 0.4, mapY + mapSize - 10);
    ctx.stroke();

    // Red location pin in center of mini-map
    const pinX = mapX + mapSize / 2;
    const pinY = mapY + mapSize / 2 - 4;
    ctx.fillStyle = '#ef4444'; // Red-500
    ctx.beginPath();
    ctx.arc(pinX, pinY - 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pinX - 6, pinY - 4);
    ctx.lineTo(pinX + 6, pinY - 4);
    ctx.lineTo(pinX, pinY + 8);
    ctx.closePath();
    ctx.fill();
    // Inner white dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pinX, pinY - 8, 3, 0, Math.PI * 2);
    ctx.fill();

    // "Google" or "WorkSphere Map" badge on mini map bottom
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(mapX, mapY + mapSize - 20, mapSize, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('GPS Map', mapX + 8, mapY + mapSize - 6);

    // 4. Geolocation Text Content on the Right
    const textX = mapX + mapSize + 18;
    let textY = overlayY + 28;
    const availableWidth = overlayWidth - mapSize - 40;

    // Heading: City, State, Country
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    const locationHeading = `${geoData.city || 'Local Area'}, ${geoData.state || 'Rajasthan'}, ${geoData.country || 'India'} 🇮🇳`;
    ctx.fillText(locationHeading, textX, textY);
    textY += 20;

    // Address (clamped to fit)
    ctx.fillStyle = '#cbd5e1'; // slate-300
    ctx.font = '12px sans-serif';
    const addressLine = geoData.address.length > 70 ? geoData.address.substring(0, 68) + '...' : geoData.address;
    ctx.fillText(addressLine, textX, textY);
    textY += 18;

    // Latitude & Longitude Line
    ctx.fillStyle = '#38bdf8'; // sky-400
    ctx.font = 'bold 12px monospace';
    const coordLine = `Lat ${geoData.latitude.toFixed(6)}°  Long ${geoData.longitude.toFixed(6)}°  (±${geoData.accuracy}m)`;
    ctx.fillText(coordLine, textX, textY);
    textY += 18;

    // Timestamp
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const timeFormatted = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = '11px sans-serif';
    ctx.fillText(`${dateFormatted} ${timeFormatted} GMT +05:30`, textX, textY);
    textY += 16;

    // Note / Field Purpose
    ctx.fillStyle = '#f59e0b'; // amber-500
    ctx.font = 'bold 11px sans-serif';
    const cleanPurpose = purpose.replace('_', ' ');
    ctx.fillText(`Note : Verified by GPS Map Camera • ${cleanPurpose}`, textX, textY);

    // 5. Small GPS Map Camera Badge in top-right corner of card
    const badgeX = overlayX + overlayWidth - 140;
    const badgeY = overlayY + 12;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, 128, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('📷 GPS Map Camera', badgeX + 10, badgeY + 15);

    ctx.restore();

    // Export image as high quality JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setSubmitError('');
    startCamera(facingMode);
  };

  const handleSubmit = async () => {
    if (!capturedPhoto) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        photo: capturedPhoto,
        latitude: geoData.latitude,
        longitude: geoData.longitude,
        accuracy: geoData.accuracy,
        address: geoData.address,
        city: geoData.city,
        state: geoData.state,
        country: geoData.country,
        purpose,
        notes,
      };

      const res = await api.post('/field-checkins', payload);
      if (res.data?.success) {
        if (onSuccess) onSuccess(res.data.checkIn);
        onClose();
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message || 'Failed to submit field check-in');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">GPS Map Camera Check-in</h3>
              <p className="text-[11px] text-slate-500">Live Selfie & Real-Time Geolocation Stamping</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Camera Viewport or Captured Stamped Preview */}
          <div className="relative aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
            {capturedPhoto ? (
              // Captured Stamped Photo Preview
              <img
                src={capturedPhoto}
                alt="GPS Stamped Field Check-in"
                className="w-full h-full object-cover"
              />
            ) : (
              // Live Video Stream
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
                    <p className="text-xs text-slate-200 max-w-sm mb-3">{cameraError}</p>
                    <button
                      onClick={() => startCamera(facingMode)}
                      className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                    >
                      Retry Camera
                    </button>
                  </div>
                )}

                {/* Live GPS status pill overlay on camera */}
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white text-[11px] font-semibold flex items-center gap-2 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {locationLoading ? (
                    <span className="text-slate-300">Acquiring GPS fix...</span>
                  ) : (
                    <span>
                      {geoData.city || 'GPS Active'} • {geoData.latitude.toFixed(4)}°, {geoData.longitude.toFixed(4)}°
                    </span>
                  )}
                </div>

                {/* Flip camera button */}
                <button
                  type="button"
                  onClick={toggleCamera}
                  title="Switch Camera (Front / Back)"
                  className="absolute top-3 right-3 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full backdrop-blur-md border border-white/20 shadow-md transition-all"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Hidden Canvas used for image processing & watermark generation */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Form details (Purpose & Notes) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Field Purpose *</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="CLIENT_VISIT">Client Site Visit</option>
                <option value="SITE_INSPECTION">Site Inspection / Survey</option>
                <option value="OFFICE_COMMUTE">Commute / Field Travel</option>
                <option value="OFFSITE_MEETING">Offsite Team Meeting</option>
                <option value="DELIVERY_DISPATCH">Equipment / Material Delivery</option>
                <option value="OTHER">Other Out of Office Work</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Optional Field Note</label>
              <input
                type="text"
                placeholder="e.g. Meeting with client manager..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Geolocation info summary card */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-start gap-3">
            <MapPin className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  {geoData.city || 'Detected Location'}, {geoData.state || ''}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {geoData.latitude.toFixed(6)}°, {geoData.longitude.toFixed(6)}°
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{geoData.address}</p>
            </div>
            <button
              onClick={fetchLocation}
              title="Refresh GPS Coordinates"
              disabled={locationLoading}
              className="text-slate-400 hover:text-blue-600 p-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${locationLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {capturedPhoto ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retake
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying & Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Confirm & Check In
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={captureAndStamp}
                disabled={!cameraActive}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                <Camera className="w-4 h-4" /> Snap & Stamp Photo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

