import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Compass,
  MapPin,
  Camera,
  Users,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Eye,
  X,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  Building2,
  Route,
  Navigation,
  User,
  Phone,
  FileText,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Pin icons for Admin map
const createMarkerIcon = (type, stopNumber) => {
  let bg = '#2563eb';
  let text = `${stopNumber || ''}`;

  if (type === 'CHECK_IN') {
    bg = '#16a34a';
    text = 'IN';
  } else if (type === 'CHECK_OUT') {
    bg = '#dc2626';
    text = 'OUT';
  } else {
    bg = '#0284c7';
    text = `#${stopNumber || 1}`;
  }

  return L.divIcon({
    className: 'admin-pin',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:${bg};color:#ffffff;font-size:11px;font-weight:bold;border:2.5px solid #ffffff;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,0.35);">
        ${text}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
};

export default function AdminFieldTrackingPage() {
  const [activeTab, setActiveTab] = useState('DESTINATIONS'); // 'DESTINATIONS' | 'ATTENDANCE'

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Destination & Route Data
  const [routeData, setRouteData] = useState({ itinerary: [], stopsCount: 0 });
  const [allSiteVisits, setAllSiteVisits] = useState([]);

  // Attendance Records
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Initial load
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [resEmployees, resAllVisits, resAttendance] = await Promise.all([
        api.get('/employees?limit=100'),
        api.get('/site-visits?limit=100'),
        api.get('/field-checkins?limit=100'),
      ]);

      const emps = resEmployees.data?.employees || [];
      setEmployees(emps);
      setAllSiteVisits(resAllVisits.data?.visits || []);
      setAttendanceRecords(resAttendance.data?.checkIns || []);

      if (emps.length > 0 && !selectedEmployee) {
        setSelectedEmployee(emps[0]._id);
      }
    } catch (err) {
      console.error('Failed to load initial field data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch daily route when selected employee or date changes
  const fetchEmployeeRoute = async () => {
    if (!selectedEmployee) return;
    try {
      const res = await api.get(
        `/site-visits/daily-route?employee=${selectedEmployee}&date=${selectedDate}`
      );
      if (res.data?.success) {
        setRouteData(res.data);
      }
    } catch (err) {
      console.error('Failed to load route for employee:', err);
    }
  };

  useEffect(() => {
    fetchEmployeeRoute();
  }, [selectedEmployee, selectedDate]);

  // Map coordinates
  const routePoints = routeData.itinerary
    .filter((pt) => pt.latitude && pt.longitude)
    .map((pt) => [pt.latitude, pt.longitude]);

  const mapCenter =
    routePoints.length > 0 ? routePoints[0] : [25.351463, 74.632922];

  const currentEmpObj = employees.find((e) => e._id === selectedEmployee) || null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Compass className="w-4 h-4" />
            <span>Field Operations Management</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Field Staff Routes & Site Destination Visits
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            View daily employee travel routes, multiple client site stops, and attendance records.
          </p>
        </div>

        <button
          onClick={() => {
            loadInitialData();
            fetchEmployeeRoute();
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('DESTINATIONS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'DESTINATIONS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Route className="w-4 h-4" />
          <span>Daily Travel Routes & Site Visits</span>
        </button>

        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ATTENDANCE'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Attendance Check-In Logs ({attendanceRecords.length})</span>
        </button>
      </div>

      {/* TAB 1: DESTINATION VISITS & ROUTE ITINERARY */}
      {activeTab === 'DESTINATIONS' && (
        <div className="space-y-6">
          {/* Employee & Date Selection Filter Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Select Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-blue-600 min-w-[200px]"
                >
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.department || 'Field Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Quick summary for selected employee */}
            {currentEmpObj && (
              <div className="text-right">
                <span className="text-[11px] text-slate-500">Route Activity for:</span>
                <p className="font-bold text-slate-900 text-sm">{currentEmpObj.name}</p>
                <span className="text-[11px] text-blue-600 font-medium">
                  {routeData.stopsCount} Destination Stop{routeData.stopsCount === 1 ? '' : 's'} Logged
                </span>
              </div>
            )}
          </div>

          {/* Connected Route Map */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                  Employee Daily Route Path
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Check-In
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span> Site Stop
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> Check-Out
                </span>
              </div>
            </div>

            <div className="h-96 w-full relative z-0">
              <MapContainer
                center={mapCenter}
                zoom={12}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Polyline connecting daily stops */}
                {routePoints.length > 1 && (
                  <Polyline positions={routePoints} color="#2563eb" weight={4} dashArray="6, 8" />
                )}

                {routeData.itinerary.map((item, idx) => (
                  <Marker
                    key={item.id || idx}
                    position={[item.latitude, item.longitude]}
                    icon={createMarkerIcon(item.type, item.stopNumber || idx + 1)}
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
                          <p className="text-slate-800 bg-slate-50 p-1.5 rounded text-[11px] border border-slate-200">
                            <strong>Work Done:</strong> {item.workDone}
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
                            Google Maps
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          {/* Stops List & Audit Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Stop-by-Stop Destination Report
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Chronological log of all site visits recorded by {currentEmpObj?.name || 'employee'} on {selectedDate}.
            </p>

            {routeData.itinerary.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                No route stops or site visits logged for this employee on {selectedDate}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase">
                      <th className="py-2.5 px-3">Stop #</th>
                      <th className="py-2.5 px-3">Destination / Site</th>
                      <th className="py-2.5 px-3">Site Photo</th>
                      <th className="py-2.5 px-3">Contact Person</th>
                      <th className="py-2.5 px-3">Work Completed</th>
                      <th className="py-2.5 px-3">Arrival Time</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routeData.itinerary.map((item, idx) => {
                      const isAtt = item.kind === 'ATTENDANCE';
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isAtt
                                  ? item.type === 'CHECK_IN'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {isAtt ? item.type : `STOP #${item.stopNumber}`}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900">
                              {item.destinationName || item.title}
                            </p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{item.address}</p>
                          </td>

                          <td className="py-3 px-3">
                            {item.photo ? (
                              <img
                                src={item.photo}
                                alt="Site verification"
                                className="w-12 h-12 object-cover rounded border border-slate-200 cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setSelectedPhoto(item.photo)}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                                <Camera className="w-4 h-4" />
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap text-slate-700">
                            {item.contactPerson ? (
                              <div>
                                <p className="font-semibold">{item.contactPerson}</p>
                                {item.contactPhone && (
                                  <p className="text-[11px] text-slate-500">{item.contactPhone}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">--</span>
                            )}
                          </td>

                          <td className="py-3 px-3 max-w-xs text-slate-700">
                            {item.workDone ? (
                              <p className="line-clamp-2">{item.workDone}</p>
                            ) : item.notes ? (
                              <p className="text-slate-500 italic">"{item.notes}"</p>
                            ) : (
                              <span className="text-slate-400 italic">--</span>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap text-slate-700">
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </td>

                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedPhoto(item.photo)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-[11px]"
                              >
                                Photo
                              </button>
                              <a
                                href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline text-[11px] inline-flex items-center gap-0.5"
                              >
                                Maps <ExternalLink className="w-3 h-3" />
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
        </div>
      )}

      {/* TAB 2: GENERAL ATTENDANCE RECORDS */}
      {activeTab === 'ATTENDANCE' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
              Employee Check-In & Check-Out Attendance Logs
            </h3>
            <span className="text-xs text-slate-500">
              Showing {attendanceRecords.length} recent punches
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-600 font-semibold text-[11px] uppercase">
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4">Photo</th>
                  <th className="py-2.5 px-4">Date & Time</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceRecords.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 whitespace-nowrap">
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
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <p className="font-bold text-slate-900">{row.employee?.name || 'Staff'}</p>
                      <p className="text-[11px] text-slate-500">{row.employee?.department}</p>
                    </td>
                    <td className="py-2.5 px-4">
                      {row.photo && (
                        <img
                          src={row.photo}
                          alt="Selfie"
                          className="w-11 h-11 object-cover rounded border border-slate-200 cursor-pointer"
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
        </div>
      )}

      {/* Full Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="font-bold text-slate-800 text-xs">Site Visit Photo Verification</span>
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
