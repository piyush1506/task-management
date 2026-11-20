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
  LogIn,
  LogOut,
  Building2,
  Navigation,
  User,
  Phone,
  FileText,
  Plus,
  Route,
  CheckCircle2,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Pin icons
const createIcon = (type, number) => {
  let bg = '#2563eb';
  let text = `${number || ''}`;

  if (type === 'CHECK_IN') {
    bg = '#16a34a';
    text = 'IN';
  } else if (type === 'CHECK_OUT') {
    bg = '#dc2626';
    text = 'OUT';
  } else {
    bg = '#0284c7';
    text = `#${number || 1}`;
  }

  return L.divIcon({
    className: 'custom-pin',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:${bg};color:#ffffff;font-size:11px;font-weight:bold;border:2.5px solid #ffffff;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.3);">
        ${text}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

export default function EmployeeFieldCheckInPage() {
  const [activeTab, setActiveTab] = useState('ROUTE'); // 'ROUTE' | 'HISTORY'

  // Data states
  const [statusData, setStatusData] = useState({
    currentStatus: 'NOT_CHECKED_IN',
    todaySummary: { firstCheckIn: null, lastCheckOut: null, totalWorkMinutes: 0 },
  });
  const [dailyRoute, setDailyRoute] = useState({ itinerary: [], stopsCount: 0 });
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal controls
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('ATTENDANCE'); // 'ATTENDANCE' | 'DESTINATION'
  const [attendanceType, setAttendanceType] = useState('CHECK_IN');

  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStatus, resRoute, resHistory] = await Promise.all([
        api.get('/field-checkins/status'),
        api.get('/site-visits/daily-route'),
        api.get('/field-checkins/my?limit=50'),
      ]);

      if (resStatus.data?.success) setStatusData(resStatus.data);
      if (resRoute.data?.success) setDailyRoute(resRoute.data);
      if (resHistory.data?.success) setCheckIns(resHistory.data.checkIns || []);
    } catch (err) {
      console.error('Failed to load field data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleModalSuccess = () => {
    fetchData();
  };

  const openAttendanceModal = (type) => {
    setModalMode('ATTENDANCE');
    setAttendanceType(type);
    setModalOpen(true);
  };

  const openDestinationModal = () => {
    setModalMode('DESTINATION');
    setModalOpen(true);
  };

  // Map route points
  const routePoints = dailyRoute.itinerary
    .filter((pt) => pt.latitude && pt.longitude)
    .map((pt) => [pt.latitude, pt.longitude]);

  const mapCenter =
    routePoints.length > 0 ? routePoints[routePoints.length - 1] : [25.351463, 74.632922];

  const isCheckedIn = statusData.currentStatus === 'CHECKED_IN';
  const isCheckedOut = statusData.currentStatus === 'CHECKED_OUT';

  const totalMin = statusData.todaySummary?.totalWorkMinutes || 0;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  // Filtered history
  const filteredHistory = checkIns.filter((c) => {
    const matchesType = filterType === 'ALL' || c.type === filterType;
    const matchesSearch =
      !searchTerm ||
      c.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs tracking-wider uppercase mb-1">
              <Navigation className="w-4 h-4" />
              <span>Field Staff Portal</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Daily Attendance & Site Destinations
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Punch your daily check-in/out and log client visits and project site stops with photos
              and verified GPS coordinates.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => openAttendanceModal('CHECK_IN')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Mark Check-In</span>
            </button>

            <button
              onClick={openDestinationModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Destination Visit</span>
            </button>

            <button
              onClick={() => openAttendanceModal('CHECK_OUT')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Mark Check-Out</span>
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium block text-[11px]">Today's Status</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  isCheckedIn ? 'bg-emerald-500' : isCheckedOut ? 'bg-rose-500' : 'bg-slate-400'
                }`}
              ></span>
              <span className="font-bold text-slate-900">
                {isCheckedIn ? 'Checked In' : isCheckedOut ? 'Checked Out' : 'Not Checked In'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium block text-[11px]">Sites Visited Today</span>
            <p className="font-bold text-slate-900 mt-1">
              {dailyRoute.stopsCount} Destination{dailyRoute.stopsCount === 1 ? '' : 's'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium block text-[11px]">Check-In Time</span>
            <p className="font-bold text-slate-900 mt-1">
              {statusData.todaySummary?.firstCheckIn
                ? new Date(statusData.todaySummary.firstCheckIn.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })
                : '--:--'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 font-medium block text-[11px]">Hours Logged Today</span>
            <p className="font-bold text-slate-900 mt-1">
              {statusData.todaySummary?.firstCheckIn ? `${hours}h ${mins}m` : '0h 0m'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ROUTE')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'ROUTE'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Route className="w-4 h-4" />
            <span>Today's Travel Route & Destinations ({dailyRoute.itinerary.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Attendance Check-In History</span>
          </button>
        </div>

        <button
          onClick={fetchData}
          className="text-slate-500 hover:text-slate-800 p-1.5 transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* TAB 1: Today's Travel Route & Destination Stops */}
      {activeTab === 'ROUTE' && (
        <div className="space-y-6">
          {/* Daily Travel Map */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                  Today's Field Route Map
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Connected route between check-in, site visits, and check-out
              </span>
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

                {/* Polyline connecting stops */}
                {routePoints.length > 1 && (
                  <Polyline positions={routePoints} color="#2563eb" weight={4} dashArray="6, 8" />
                )}

                {dailyRoute.itinerary.map((item, idx) => (
                  <Marker
                    key={item.id || idx}
                    position={[item.latitude, item.longitude]}
                    icon={createIcon(item.type, item.stopNumber || idx + 1)}
                  >
                    <Popup>
                      <div className="p-1 space-y-1 text-xs max-w-xs">
                        {item.photo && (
                          <img
                            src={item.photo}
                            alt="Site visit"
                            className="w-full h-24 object-cover rounded mb-1 cursor-pointer"
                            onClick={() => setSelectedPhoto(item.photo)}
                          />
                        )}
                        <p className="font-bold text-slate-900">{item.title}</p>
                        <p className="text-slate-600 text-[11px]">{item.address}</p>
                        {item.workDone && (
                          <p className="text-slate-700 bg-slate-50 p-1 rounded text-[11px]">
                            <strong>Work:</strong> {item.workDone}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                          <span>
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Open Maps
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* Stops Timeline & Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Today's Stop Itinerary</h3>
                <p className="text-xs text-slate-500">
                  Chronological record of duty check-in, site visits, and departure.
                </p>
              </div>

              <button
                onClick={openDestinationModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Next Stop</span>
              </button>
            </div>

            {dailyRoute.itinerary.length === 0 ? (
              <div className="py-12 text-center">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-semibold">No stops logged today yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                  Start by marking your check-in or logging your first client site destination.
                </p>
                <button
                  onClick={openDestinationModal}
                  className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Log First Destination
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {dailyRoute.itinerary.map((item, idx) => {
                  const isAttendance = item.kind === 'ATTENDANCE';
                  const isCheckIn = item.type === 'CHECK_IN';

                  return (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-start gap-4"
                    >
                      {/* Photo Thumbnail */}
                      {item.photo ? (
                        <div
                          className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shrink-0 cursor-pointer group relative"
                          onClick={() => setSelectedPhoto(item.photo)}
                        >
                          <img
                            src={item.photo}
                            alt="Stop"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                            <Eye className="w-4 h-4" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 space-y-1 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isAttendance
                                  ? isCheckIn
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {isAttendance ? item.type : `STOP #${item.stopNumber}`}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {item.destinationName || item.title}
                            </h4>
                          </div>

                          <span className="text-[11px] font-medium text-slate-500">
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        </div>

                        <p className="text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.address || item.subtitle}</span>
                        </p>

                        {item.contactPerson && (
                          <p className="text-slate-500 text-[11px]">
                            Contact: <strong>{item.contactPerson}</strong>{' '}
                            {item.contactPhone && `(${item.contactPhone})`}
                          </p>
                        )}

                        {item.workDone && (
                          <div className="mt-1 p-2 bg-white rounded border border-slate-200 text-slate-800 text-[11px]">
                            <strong>Work Completed:</strong> {item.workDone}
                          </div>
                        )}

                        {item.notes && (
                          <p className="text-slate-500 text-[11px] italic">"{item.notes}"</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                        <a
                          href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 border border-slate-300 hover:bg-white text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Maps</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Check-In / Check-Out Attendance History */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-bold text-slate-900 text-sm">Attendance Logs</h3>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search address or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600"
              />

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">All Records</option>
                <option value="CHECK_IN">Check-Ins</option>
                <option value="CHECK_OUT">Check-Outs</option>
              </select>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No attendance records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase">
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Photo</th>
                    <th className="py-2.5 px-4">Date & Time</th>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4">Coordinates</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.type === 'CHECK_IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        {row.photo && (
                          <img
                            src={row.photo}
                            alt="Selfie"
                            className="w-12 h-12 object-cover rounded border border-slate-200 cursor-pointer"
                            onClick={() => setSelectedPhoto(row.photo)}
                          />
                        )}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {new Date(row.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(row.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 max-w-xs">
                        <p className="truncate font-medium text-slate-800">{row.city}</p>
                        <p className="truncate text-slate-500 text-[11px]">{row.address}</p>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                        {row.latitude?.toFixed(4)}°, {row.longitude?.toFixed(4)}°
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedPhoto(row.photo)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-[11px] mr-2"
                        >
                          View Photo
                        </button>
                        <a
                          href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline text-[11px]"
                        >
                          Maps
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Camera / Verification Modal */}
      <GPSMapCameraModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
        mode={modalMode}
        initialType={attendanceType}
        nextStopNumber={dailyRoute.stopsCount + 1}
      />

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="font-bold text-slate-800 text-xs">Verified Field Photo</span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-black flex items-center justify-center overflow-auto flex-1">
              <img
                src={selectedPhoto}
                alt="Full resolution"
                className="max-h-[72vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
