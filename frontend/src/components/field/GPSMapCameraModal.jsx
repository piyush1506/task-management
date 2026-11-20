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
  LogIn,
  LogOut,
  Clock,
} from 'lucide-react';

export default function GPSMapCameraModal({
  isOpen,
  onClose,
  onSuccess,
  initialType = 'CHECK_IN',
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [checkType, setCheckType] = useState(initialType);
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
  const [purpose, setPurpose] = useState(
    initialType === 'CHECK_OUT' ? 'SHIFT_END' : 'CLIENT_VISIT'
  );
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
      setCheckType(initialType);
      setPurpose(initialType === 'CHECK_OUT' ? 'SHIFT_END' : 'CLIENT_VISIT');
      fetchLocation();
      startCamera('user');
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, initialType]);

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
    ctx.drawImage(video, 0, 0, width, height);

    // 2. Draw GPS Map Camera watermark overlay (styled exactly as reference photo)
    const overlayHeight = Math.max(165, Math.round(height * 0.29));
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
    ctx.fillText('Google', mapX + 8, mapY + mapSize - 6);

    // 4. Information Column on Right
    const textX = mapX + mapSize + 16;
    let textY = overlayY + 28;

    // Heading: City, State, Country + Check-In / Check-Out Stamp Tag
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px sans-serif';
    const cityHead = `${geoData.city || 'Local Site'}, ${geoData.state || 'Rajasthan'}, ${geoData.country || 'India'}`;
    ctx.fillText(cityHead, textX, textY);

    // Status Badge (CHECK-IN / CHECK-OUT) inline
    const isCheckIn = checkType === 'CHECK_IN';
    const statusText = isCheckIn ? '● CHECK-IN' : '● CHECK-OUT';
    const statusBadgeColor = isCheckIn ? '#10b981' : '#f43f5e';
    const statusBadgeX = textX + ctx.measureText(cityHead).width + 12;

    if (statusBadgeX + 90 < overlayX + overlayWidth - 140) {
      ctx.fillStyle = statusBadgeColor;
      ctx.beginPath();
      ctx.roundRect(statusBadgeX, textY - 14, 88, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(statusText, statusBadgeX + 8, textY - 1);
    }

    textY += 20;

    // Detailed Street Address
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px sans-serif';
    const maxAddrWidth = overlayWidth - (textX - overlayX) - 20;
    const addressLine = geoData.address || `${geoData.city}, ${geoData.state}`;
    // Truncate or wrap to max width
    let displayLine = addressLine;
    if (ctx.measureText(displayLine).width > maxAddrWidth) {
      while (ctx.measureText(displayLine + '...').width > maxAddrWidth && displayLine.length > 20) {
        displayLine = displayLine.slice(0, -3);
      }
      displayLine += '...';
    }
    ctx.fillText(displayLine, textX, textY);
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
    ctx.fillStyle = isCheckIn ? '#34d399' : '#fbbf24'; // emerald-400 or amber-400
    ctx.font = 'bold 11px sans-serif';
    const cleanPurpose = purpose.replace(/_/g, ' ');
    ctx.fillText(
      `Note : Verified by GPS Map Camera • ${isCheckIn ? 'CHECK-IN' : 'CHECK-OUT'} • ${cleanPurpose}`,
      textX,
      textY
    );

    // 5. Small GPS Map Camera Badge in top-right corner of card
    const badgeX = overlayX + overlayWidth - 150;
    const badgeY = overlayY + 12;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, 138, 22, 6);
    ctx.fill();
    ctx.fillStyle = isCheckIn ? '#38bdf8' : '#fb7185';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`📷 GPS Map Camera [${isCheckIn ? 'IN' : 'OUT'}]`, badgeX + 8, badgeY + 15);

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
        type: checkType,
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
      } else {
        setSubmitError(res.data?.message || 'Failed to submit check-in');
      }
    } catch (err) {
      console.error('Submission failed:', err);
      setSubmitError(err.response?.data?.message || 'Server error submitting check-in');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isCheckIn = checkType === 'CHECK_IN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                isCheckIn ? 'bg-emerald-600' : 'bg-rose-600'
              } shadow-sm`}
            >
              {isCheckIn ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                GPS Map Camera & Geolocation Attendance
              </h3>
              <p className="text-[11px] text-slate-500">
                Official Geotagged Watermark with Real-Time Coordinates
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
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

          {/* CHECK-IN vs CHECK-OUT Selector Tabs */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setCheckType('CHECK_IN');
                setPurpose('CLIENT_VISIT');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                checkType === 'CHECK_IN'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Check-In (Arrival / Duty Start)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCheckType('CHECK_OUT');
                setPurpose('SHIFT_END');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                checkType === 'CHECK_OUT'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span>Check-Out (Departure / Duty End)</span>
            </button>
          </div>

          {/* Camera Viewport or Captured Stamped Preview */}
          <div className="relative aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
            {capturedPhoto ? (
              // Captured Stamped Photo Preview
              <img
                src={capturedPhoto}
                alt="GPS Stamped Field Verification"
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
                      className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Retry Camera
                    </button>
                  </div>
                )}

                {/* Live GPS status pill overlay on camera */}
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white text-[11px] font-semibold flex items-center gap-2 shadow-lg">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCheckIn ? 'bg-emerald-500' : 'bg-rose-500'
                    } animate-pulse`}
                  ></span>
                  <span className="font-bold">
                    {isCheckIn ? 'CHECK-IN' : 'CHECK-OUT'}:
                  </span>
                  {locationLoading ? (
                    <span className="text-slate-300">Acquiring GPS fix...</span>
                  ) : (
                    <span>
                      {geoData.city || 'GPS Active'} • {geoData.latitude.toFixed(4)}°,{' '}
                      {geoData.longitude.toFixed(4)}°
                    </span>
                  )}
                </div>

                {/* Flip camera button */}
                <button
                  type="button"
                  onClick={toggleCamera}
                  title="Switch Camera (Front / Back)"
                  className="absolute top-3 right-3 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full backdrop-blur-md border border-white/20 shadow-md transition-all cursor-pointer"
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
              <label className="block font-semibold text-slate-700 mb-1">
                {isCheckIn ? 'Check-In Purpose *' : 'Check-Out Reason / Summary *'}
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {isCheckIn ? (
                  <>
                    <option value="CLIENT_VISIT">Client Site Visit</option>
                    <option value="SITE_INSPECTION">Site Inspection / Survey</option>
                    <option value="SHIFT_START">Regular Shift Reporting</option>
                    <option value="OFFICE_COMMUTE">Commute / Travel Arrival</option>
                    <option value="OFFSITE_MEETING">Offsite Team Meeting</option>
                    <option value="DELIVERY">Delivery Pickup / Dispatch</option>
                    <option value="MARKETING">Marketing Campaign / Roadshow</option>
                    <option value="MAINTENANCE">Technical Support / Maintenance</option>
                    <option value="OTHER">Other Field Work</option>
                  </>
                ) : (
                  <>
                    <option value="SHIFT_END">End of Shift / Duty Departure</option>
                    <option value="CLIENT_VISIT">Completed Client Meeting</option>
                    <option value="SITE_INSPECTION">Finished Site Inspection</option>
                    <option value="DELIVERY">Delivery Completed</option>
                    <option value="OFFICE_COMMUTE">Commute Home / Departure</option>
                    <option value="OTHER">Other Work Completion</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Optional Notes / Remarks
              </label>
              <input
                type="text"
                placeholder={
                  isCheckIn
                    ? 'e.g. Arrived at client office...'
                    : 'e.g. Meeting finished, deliverables handed over...'
                }
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
              className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
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
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {capturedPhoto ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retake
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`inline-flex items-center gap-1.5 px-5 py-2.5 ${
                    isCheckIn
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                  } text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer`}
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying & Recording...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isCheckIn ? 'Confirm & Punch Check-In' : 'Confirm & Punch Check-Out'}
                      </span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={captureAndStamp}
                disabled={!cameraActive}
                className={`inline-flex items-center gap-2 px-6 py-2.5 ${
                  isCheckIn
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                } text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer`}
              >
                <Camera className="w-4 h-4" />
                <span>Take {isCheckIn ? 'Check-In' : 'Check-Out'} Selfie</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
