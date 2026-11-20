import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
  Camera,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  FlipHorizontal,
  LogIn,
  LogOut,
  Building2,
  User,
  Phone,
  FileText,
} from 'lucide-react';

export default function GPSMapCameraModal({
  isOpen,
  onClose,
  onSuccess,
  mode = 'ATTENDANCE', // 'ATTENDANCE' | 'DESTINATION'
  initialType = 'CHECK_IN', // 'CHECK_IN' | 'CHECK_OUT'
  nextStopNumber = 1,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Attendance vs Destination mode
  const isDestinationMode = mode === 'DESTINATION';
  const [checkType, setCheckType] = useState(initialType);

  // Destination specific inputs
  const [destinationName, setDestinationName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [workDone, setWorkDone] = useState('');

  // Common inputs
  const [purpose, setPurpose] = useState('CLIENT_VISIT');
  const [notes, setNotes] = useState('');

  // Camera state
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // GPS state
  const [locationLoading, setLocationLoading] = useState(true);
  const [geoData, setGeoData] = useState({
    latitude: 25.351463,
    longitude: 74.632922,
    accuracy: 12,
    address: 'Inder Pratash Tower, Bhopal Ganj, Bhilwara, Rajasthan 311001, India',
    city: 'Bhilwara',
    state: 'Rajasthan',
    country: 'India',
  });

  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

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

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

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
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'WorkSphere-Field-System/1.0' } }
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
        console.warn('Geolocation warning:', err.message);
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

      if (isDestinationMode) {
        setPurpose('CLIENT_MEETING');
        setDestinationName('');
        setContactPerson('');
        setContactPhone('');
        setWorkDone('');
      } else {
        setPurpose(initialType === 'CHECK_OUT' ? 'SHIFT_END' : 'CLIENT_VISIT');
        setNotes('');
      }

      fetchLocation();
      startCamera('user');
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, initialType, mode]);

  const captureAndStamp = () => {
    if (!videoRef.current || !canvasRef.current) return;

    if (isDestinationMode) {
      if (!destinationName.trim()) {
        setSubmitError('Please enter the destination or site name before taking photo.');
        return;
      }
      if (!workDone.trim()) {
        setSubmitError('Please briefly state the work done or reason for visit.');
        return;
      }
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. Draw camera video frame
    ctx.drawImage(video, 0, 0, width, height);

    // 2. Draw watermark card (matching real reference photo)
    const overlayHeight = Math.max(165, Math.round(height * 0.29));
    const overlayY = height - overlayHeight - 20;
    const overlayX = 20;
    const overlayWidth = width - 40;
    const radius = 14;

    ctx.save();
    // Solid dark card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.beginPath();
    ctx.roundRect(overlayX, overlayY, overlayWidth, overlayHeight, radius);
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();

    // 3. Mini map on left
    const mapSize = overlayHeight - 24;
    const mapX = overlayX + 12;
    const mapY = overlayY + 12;

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(mapX, mapY, mapSize, mapSize, 8);
    ctx.fill();

    // Roads representation
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mapX + 8, mapY + mapSize * 0.35);
    ctx.lineTo(mapX + mapSize - 8, mapY + mapSize * 0.65);
    ctx.moveTo(mapX + mapSize * 0.55, mapY + 8);
    ctx.lineTo(mapX + mapSize * 0.45, mapY + mapSize - 8);
    ctx.stroke();

    // Red location pin
    const pinX = mapX + mapSize / 2;
    const pinY = mapY + mapSize / 2 - 4;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(pinX, pinY - 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pinX - 6, pinY - 4);
    ctx.lineTo(pinX + 6, pinY - 4);
    ctx.lineTo(pinX, pinY + 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pinX, pinY - 8, 3, 0, Math.PI * 2);
    ctx.fill();

    // Map label
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(mapX, mapY + mapSize - 18, mapSize, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('Google', mapX + 8, mapY + mapSize - 5);

    // 4. Information Columns on Right
    const textX = mapX + mapSize + 16;
    let textY = overlayY + 28;

    // Heading: Destination Name or City
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';

    let heading = isDestinationMode
      ? `${destinationName.slice(0, 32)} (Stop #${nextStopNumber})`
      : `${geoData.city || 'Field Site'}, ${geoData.state || 'Rajasthan'}`;

    ctx.fillText(heading, textX, textY);

    // Top status badge
    let badgeText = '';
    let badgeBg = '#2563eb';

    if (isDestinationMode) {
      badgeText = `SITE VISIT #${nextStopNumber}`;
      badgeBg = '#0284c7';
    } else {
      badgeText = checkType === 'CHECK_IN' ? 'CHECK-IN' : 'CHECK-OUT';
      badgeBg = checkType === 'CHECK_IN' ? '#16a34a' : '#dc2626';
    }

    const badgeX = overlayX + overlayWidth - 140;
    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    ctx.roundRect(badgeX, overlayY + 12, 126, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(badgeText, badgeX + 10, overlayY + 27);

    textY += 20;

    // Address
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px sans-serif';
    const maxAddrWidth = overlayWidth - (textX - overlayX) - 20;
    let displayAddress = geoData.address || `${geoData.city}, ${geoData.state}`;
    if (ctx.measureText(displayAddress).width > maxAddrWidth) {
      while (ctx.measureText(displayAddress + '...').width > maxAddrWidth && displayAddress.length > 20) {
        displayAddress = displayAddress.slice(0, -3);
      }
      displayAddress += '...';
    }
    ctx.fillText(displayAddress, textX, textY);
    textY += 18;

    // Coordinates
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(
      `Lat ${geoData.latitude.toFixed(6)}°  Long ${geoData.longitude.toFixed(6)}°`,
      textX,
      textY
    );
    textY += 18;

    // Timestamp (Indian Standard Time)
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
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(`${dateFormatted} ${timeFormatted} GMT +05:30`, textX, textY);
    textY += 16;

    // Remarks / Purpose note
    ctx.fillStyle = '#fde047';
    ctx.font = '11px sans-serif';
    const noteText = isDestinationMode
      ? `Work: ${workDone.slice(0, 50)}`
      : `Purpose: ${purpose.replace(/_/g, ' ')}${notes ? ' - ' + notes.slice(0, 30) : ''}`;
    ctx.fillText(noteText, textX, textY);

    ctx.restore();

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
      if (isDestinationMode) {
        // Submit Destination Visit
        const payload = {
          destinationName,
          contactPerson,
          contactPhone,
          purpose,
          workDone,
          photo: capturedPhoto,
          latitude: geoData.latitude,
          longitude: geoData.longitude,
          accuracy: geoData.accuracy,
          address: geoData.address,
          city: geoData.city,
          state: geoData.state,
        };

        const res = await api.post('/site-visits', payload);
        if (res.data?.success) {
          if (onSuccess) onSuccess(res.data.siteVisit);
          onClose();
        } else {
          setSubmitError(res.data?.message || 'Failed to save site visit');
        }
      } else {
        // Submit Attendance Check-In / Check-Out
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
      }
    } catch (err) {
      console.error('Submission failed:', err);
      setSubmitError(err.response?.data?.message || 'Network error saving record');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {isDestinationMode
                ? `Add Site / Client Destination Visit (Stop #${nextStopNumber})`
                : 'Daily Attendance Photo Verification'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isDestinationMode
                ? 'Record your arrival at a client site or project destination'
                : 'Mark your arrival or departure for the workday'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Mode Switch or Attendance Selector */}
          {!isDestinationMode ? (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setCheckType('CHECK_IN');
                  setPurpose('CLIENT_VISIT');
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  checkType === 'CHECK_IN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Mark Check-In (Arrival)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCheckType('CHECK_OUT');
                  setPurpose('SHIFT_END');
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  checkType === 'CHECK_OUT'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span>Mark Check-Out (Departure)</span>
              </button>
            </div>
          ) : (
            /* Destination Specific Fields */
            <div className="space-y-3 p-3.5 bg-sky-50/60 rounded-xl border border-sky-100 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Destination / Client Site Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. Apex Hospital Site, Sharma Trading Co., Branch 2..."
                    value={destinationName}
                    onChange={(e) => setDestinationName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Contact Person (Optional)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="e.g. Mr. Rajesh Verma"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Contact Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="e.g. +91 98290 12345"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Visit Purpose *</label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                  >
                    <option value="CLIENT_MEETING">Client Meeting / Discussion</option>
                    <option value="SITE_INSPECTION">Site Inspection / Survey</option>
                    <option value="DELIVERY">Delivery of Material / Documents</option>
                    <option value="PAYMENT_COLLECTION">Payment Collection / Follow-up</option>
                    <option value="MAINTENANCE">Technical Support / Repair</option>
                    <option value="SITE_SURVEY">Pre-Project Site Survey</option>
                    <option value="OTHER">Other Site Work</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Work Summary / What was done? *
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="e.g. Completed inspection, signed approval form..."
                      value={workDone}
                      onChange={(e) => setWorkDone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Camera Viewport or Captured Stamped Preview */}
          <div className="relative aspect-video w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
            {capturedPhoto ? (
              <img
                src={capturedPhoto}
                alt="Stamped Verification"
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center">
                    <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                    <p className="text-xs text-slate-200 max-w-sm mb-3">{cameraError}</p>
                    <button
                      onClick={() => startCamera(facingMode)}
                      className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Retry Camera
                    </button>
                  </div>
                )}

                {/* Status indicator on camera */}
                <div className="absolute top-3 left-3 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 text-white text-[11px] font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {locationLoading ? (
                    <span className="text-slate-300">Getting location...</span>
                  ) : (
                    <span>
                      {geoData.city || 'GPS'} • {geoData.latitude.toFixed(4)}°, {geoData.longitude.toFixed(4)}°
                    </span>
                  )}
                </div>

                {/* Flip camera */}
                <button
                  type="button"
                  onClick={toggleCamera}
                  title="Switch Camera"
                  className="absolute top-3 right-3 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
              </>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Attendance specific purpose & notes */}
          {!isDestinationMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {checkType === 'CHECK_IN' ? 'Check-In Purpose' : 'Check-Out Reason'}
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-600"
                >
                  {checkType === 'CHECK_IN' ? (
                    <>
                      <option value="CLIENT_VISIT">Client Site Visit</option>
                      <option value="SITE_INSPECTION">Site Inspection</option>
                      <option value="SHIFT_START">Regular Work Start</option>
                      <option value="OFFICE_COMMUTE">Commute Arrival</option>
                      <option value="OTHER">Other Work</option>
                    </>
                  ) : (
                    <>
                      <option value="SHIFT_END">End of Day Work</option>
                      <option value="CLIENT_VISIT">Client Visit Completed</option>
                      <option value="OFFICE_COMMUTE">Leaving Office / Field</option>
                      <option value="OTHER">Other Departure</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Arrived at client office..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          )}

          {/* Current location card */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">
                  {geoData.city || 'Detected Location'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {geoData.latitude.toFixed(6)}°, {geoData.longitude.toFixed(6)}°
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">{geoData.address}</p>
            </div>
            <button
              onClick={fetchLocation}
              title="Refresh Location"
              disabled={locationLoading}
              className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${locationLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {capturedPhoto ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retake
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`inline-flex items-center gap-1.5 px-5 py-2 ${
                    isDestinationMode
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : checkType === 'CHECK_IN'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  } text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer`}
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isDestinationMode
                          ? `Save Stop #${nextStopNumber} Visit`
                          : checkType === 'CHECK_IN'
                          ? 'Confirm Check-In'
                          : 'Confirm Check-Out'}
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
                className={`inline-flex items-center gap-2 px-5 py-2 ${
                  isDestinationMode
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : checkType === 'CHECK_IN'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                } text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer`}
              >
                <Camera className="w-4 h-4" />
                <span>
                  {isDestinationMode
                    ? `Capture Stop #${nextStopNumber} Photo`
                    : `Capture ${checkType === 'CHECK_IN' ? 'Check-In' : 'Check-Out'} Photo`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
