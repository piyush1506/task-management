import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import GPSMapCameraModal from '../../components/field/GPSMapCameraModal';
import {
  Camera,
  MapPin,
  Clock,
  Compass,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Building,
  RefreshCw,
  Search,
  Filter,
  Eye,
  X,
  Layers,
  LogIn,
  LogOut,
  Timer,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Pin icons for Leaflet (Check-In: Green, Check-Out: Rose)
const createMarkerIcon = (type) => {
  const isCheckIn = type === 'CHECK_IN';
  const color = isCheckIn ? '#10b981' : '#f43f5e';
  return L.divIcon({
    className: 'custom-pin',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:${color};border:3px solid #ffffff;border-radius:50%;box-shadow:0 4px 12px ${
        isCheckIn ? 'rgba(16,185,129,0.5)' : 'rgba(244,63,94,0.5)'
      };">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
};

export default function EmployeeFieldCheckInPage() {
  const [checkIns, setCheckIns] = useState([]);
  const [statusData, setStatusData] = useState({
    currentStatus: 'NOT_CHECKED_IN',
    todaySummary: {
      firstCheckIn: null,
      lastCheckOut: null,
      totalWorkMinutes: 0,
      recordsCount: 0,
    },
    lastRecord: null,
  });
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('CHECK_IN');

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const [filterPurpose, setFilterPurpose] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resHistory, resStatus] = await Promise.all([
        api.get('/field-checkins/my'),
        api.get('/field-checkins/status'),
      ]);

      if (resHistory.data?.success) {
        setCheckIns(resHistory.data.checkIns || []);
      }
      if (resStatus.data?.success) {
        setStatusData(resStatus.data);
      }
    } catch (err) {
      console.error('Failed to load check-ins or status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSuccess = (newRecord) => {
    setCheckIns((prev) => [newRecord, ...prev]);
    // Refresh live status summary
    api.get('/field-checkins/status').then((res) => {
      if (res.data?.success) setStatusData(res.data);
    });
  };

  const openPunchModal = (type) => {
    setModalType(type);
    setModalOpen(true);
  };

  // Filtered records
  const filteredCheckIns = checkIns.filter((item) => {
    const matchesType = filterType === 'ALL' || item.type === filterType;
    const matchesPurpose = filterPurpose === 'ALL' || item.purpose === filterPurpose;
    const matchesSearch =
      (item.address && item.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.city && item.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesPurpose && matchesSearch;
  });

  // Calculate live hours
  const totalMinutes = statusData.todaySummary?.totalWorkMinutes || 0;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeFormatted = `${hours}h ${mins}m`;

  const lastCheckIn = checkIns[0] || null;
  const mapCenter = lastCheckIn
    ? [lastCheckIn.latitude, lastCheckIn.longitude]
    : [25.351463, 74.632922];

  const getPurposeBadge = (purpose) => {
    const styles = {
      CLIENT_VISIT: 'bg-blue-100 text-blue-700 border-blue-200',
      SITE_INSPECTION: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      DELIVERY: 'bg-amber-100 text-amber-700 border-amber-200',
      MARKETING: 'bg-purple-100 text-purple-700 border-purple-200',
      MAINTENANCE: 'bg-rose-100 text-rose-700 border-rose-200',
      SHIFT_START: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
      SHIFT_END: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      OFFICE_COMMUTE: 'bg-sky-100 text-sky-700 border-sky-200',
      OTHER: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    const label = (purpose || 'OTHER').replace(/_/g, ' ');
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
          styles[purpose] || styles.OTHER
        }`}
      >
        {label}
      </span>
    );
  };

  const isCurrentlyCheckedIn = statusData.currentStatus === 'CHECKED_IN';
  const isCurrentlyCheckedOut = statusData.currentStatus === 'CHECKED_OUT';

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Check-in/Check-out Control */}
      <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase">
              <Compass className="w-4 h-4" />
              <span>Field Duty & Geolocation Attendance</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              GPS Map Camera Check-In & Check-Out
            </h1>
            <p className="text-xs text-slate-500 max-w-xl">
              Take verified live selfies with authenticated coordinates, mini-map, address, and
              timestamp whenever reporting for or departing from client visits and field work.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => openPunchModal('CHECK_IN')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Punch Check-In</span>
            </button>

            <button
              onClick={() => openPunchModal('CHECK_OUT')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-2xl font-bold text-xs shadow-md shadow-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Punch Check-Out</span>
            </button>
          </div>
        </div>

        {/* Live Attendance Status Strip */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Current Live Status */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 ${
                isCurrentlyCheckedIn
                  ? 'bg-emerald-500 shadow-md shadow-emerald-500/25'
                  : isCurrentlyCheckedOut
                  ? 'bg-rose-500 shadow-md shadow-rose-500/25'
                  : 'bg-slate-400'
              }`}
            >
              {isCurrentlyCheckedIn ? (
                <LogIn className="w-5 h-5" />
              ) : isCurrentlyCheckedOut ? (
                <LogOut className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Duty Status
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isCurrentlyCheckedIn
                      ? 'bg-emerald-500 animate-pulse'
                      : isCurrentlyCheckedOut
                      ? 'bg-rose-500'
                      : 'bg-slate-400'
                  }`}
                ></span>
                <span className="text-sm font-bold text-slate-900">
                  {isCurrentlyCheckedIn
                    ? 'Currently Checked In'
                    : isCurrentlyCheckedOut
                    ? 'Checked Out'
                    : 'Not Checked In Today'}
                </span>
              </div>
            </div>
          </div>

          {/* First Check-In Time */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Today's Check-In
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {statusData.todaySummary?.firstCheckIn
                  ? new Date(
                      statusData.todaySummary.firstCheckIn.timestamp
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : '--:--'}
              </p>
            </div>
          </div>

          {/* Last Check-Out Time */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Today's Check-Out
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {statusData.todaySummary?.lastCheckOut
                  ? new Date(
                      statusData.todaySummary.lastCheckOut.timestamp
                    ).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : '--:--'}
              </p>
            </div>
          </div>

          {/* Estimated Duty Hours */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Working Time Today
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {statusData.todaySummary?.firstCheckIn ? timeFormatted : '0h 0m'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Map Overview */}
      {checkIns.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900 text-sm">
                My Attendance & Field Geolocation Map ({checkIns.length} Pins)
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Check-In
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Check-Out
              </span>
            </div>
          </div>
          <div className="h-80 w-full relative z-0">
            <MapContainer
              center={mapCenter}
              zoom={13}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {checkIns.map((ci) => {
                const isCi = ci.type === 'CHECK_IN';
                return (
                  <Marker
                    key={ci._id}
                    position={[ci.latitude, ci.longitude]}
                    icon={createMarkerIcon(ci.type)}
                  >
                    <Popup>
                      <div className="p-1 space-y-1.5 text-xs max-w-xs">
                        {ci.photo && (
                          <img
                            src={ci.photo}
                            alt="Selfie"
                            className="w-full h-28 object-cover rounded-md mb-1 cursor-pointer"
                            onClick={() => setSelectedPhoto(ci.photo)}
                          />
                        )}
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCi
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {isCi ? '● CHECK-IN' : '● CHECK-OUT'}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            {new Date(ci.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900">{ci.city || 'Field Site'}</p>
                        <p className="text-slate-600 line-clamp-2">{ci.address}</p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-400 text-[10px]">
                            {new Date(ci.timestamp).toLocaleDateString()}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${ci.latitude},${ci.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1 text-[10px]"
                          >
                            Google Maps <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      )}

      {/* History Table & Filter Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table header & controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900 text-base">
              Punch History & Geotagged Records
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified selfie logs with GPS coordinates, mini-map overlay, and timestamps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search address or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 w-44 sm:w-48"
              />
            </div>

            {/* Type Filter (Check-In vs Check-Out) */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Punches</option>
              <option value="CHECK_IN">🟢 Check-Ins Only</option>
              <option value="CHECK_OUT">🔴 Check-Outs Only</option>
            </select>

            {/* Purpose Filter */}
            <select
              value={filterPurpose}
              onChange={(e) => setFilterPurpose(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Purposes</option>
              <option value="CLIENT_VISIT">Client Visit</option>
              <option value="SITE_INSPECTION">Site Inspection</option>
              <option value="SHIFT_START">Shift Start</option>
              <option value="SHIFT_END">Shift End</option>
              <option value="DELIVERY">Delivery</option>
              <option value="MARKETING">Marketing</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OTHER">Other</option>
            </select>

            <button
              onClick={fetchData}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-500">Loading verified field records...</p>
          </div>
        ) : filteredCheckIns.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Attendance Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {searchTerm || filterType !== 'ALL' || filterPurpose !== 'ALL'
                ? 'No records match your active search or filter selection.'
                : 'You have not submitted any GPS check-in or check-out selfies yet.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => openPunchModal('CHECK_IN')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Punch First Check-In
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Stamped Photo</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Location & Address</th>
                  <th className="py-3 px-4">GPS Coordinates</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCheckIns.map((item) => {
                  const isCi = item.type === 'CHECK_IN';
                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            isCi
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCi ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          ></span>
                          <span>{isCi ? 'CHECK-IN' : 'CHECK-OUT'}</span>
                        </span>
                      </td>

                      {/* Thumbnail */}
                      <td className="py-3 px-4">
                        {item.photo ? (
                          <div
                            className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 cursor-pointer group shadow-2xs"
                            onClick={() => setSelectedPhoto(item.photo)}
                          >
                            <img
                              src={item.photo}
                              alt="GPS Map Camera"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Eye className="w-4 h-4" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                            <Camera className="w-5 h-5" />
                          </div>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {new Date(item.timestamp).toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {new Date(item.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}{' '}
                          GMT+05:30
                        </div>
                      </td>

                      {/* Purpose */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getPurposeBadge(item.purpose)}
                      </td>

                      {/* Address */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{item.city || 'Local Site'}</span>
                        </div>
                        <p
                          className="text-[11px] text-slate-500 line-clamp-2 mt-0.5"
                          title={item.address}
                        >
                          {item.address}
                        </p>
                      </td>

                      {/* Coordinates */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-[11px] text-slate-700">
                          Lat {item.latitude.toFixed(6)}°
                        </div>
                        <div className="font-mono text-[11px] text-slate-700">
                          Long {item.longitude.toFixed(6)}°
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Accuracy: ±{item.accuracy || 10}m
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4 max-w-[180px]">
                        <p
                          className="text-slate-600 truncate text-[11px]"
                          title={item.notes || 'No note'}
                        >
                          {item.notes || <span className="text-slate-400 italic">None</span>}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedPhoto(item.photo)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="View Stamped Photo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Photo</span>
                          </button>
                          <a
                            href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center"
                            title="Open in Google Maps"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GPS Camera Modal */}
      <GPSMapCameraModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        initialType={modalType}
      />

      {/* Full Photo Inspection Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[92vh]">
            <div className="p-4 flex items-center justify-between border-b border-slate-800 text-white">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm tracking-wide">
                  GPS Map Camera Certified Photo
                </h3>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-3 flex items-center justify-center bg-black">
              <img
                src={selectedPhoto}
                alt="Stamped Full Resolution"
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Official Geotagged Watermark Applied</span>
              <a
                href={selectedPhoto}
                download="workforce-attendance-photo.jpg"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
              >
                Download Stamped Photo
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
