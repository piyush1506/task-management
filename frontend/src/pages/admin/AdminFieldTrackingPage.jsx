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
  Layers,
  Building,
  UserCheck,
  LogIn,
  LogOut,
  Timer,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Pin for Admin Map based on Punch Type & Department
const createAdminPin = (type, department) => {
  const isCi = type === 'CHECK_IN';
  const ringColor = isCi ? '#10b981' : '#f43f5e';

  return L.divIcon({
    className: 'admin-marker',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:${ringColor};border:3px solid #ffffff;border-radius:50%;box-shadow:0 4px 14px rgba(0,0,0,0.35);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
  });
};

export default function AdminFieldTrackingPage() {
  const [checkIns, setCheckIns] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedPurpose, setSelectedPurpose] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCheckIns, resEmployees] = await Promise.all([
        api.get('/field-checkins?limit=150'),
        api.get('/employees?limit=100'),
      ]);

      if (resCheckIns.data?.success) {
        setCheckIns(resCheckIns.data.checkIns || []);
      }
      if (resEmployees.data?.success) {
        setEmployees(resEmployees.data.employees || []);
      }
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter logic
  const filteredCheckIns = checkIns.filter((ci) => {
    const empId = ci.employee?._id || ci.employee;
    const matchesEmp = selectedEmployee === 'ALL' || empId === selectedEmployee;
    const matchesType = selectedType === 'ALL' || ci.type === selectedType;
    const matchesPurpose = selectedPurpose === 'ALL' || ci.purpose === selectedPurpose;

    const matchesDate =
      !selectedDate ||
      new Date(ci.timestamp).toISOString().split('T')[0] === selectedDate;

    const empName = ci.employee?.name?.toLowerCase() || '';
    const empEmail = ci.employee?.email?.toLowerCase() || '';
    const address = ci.address?.toLowerCase() || '';
    const city = ci.city?.toLowerCase() || '';
    const q = searchTerm.toLowerCase();

    const matchesSearch =
      !searchTerm ||
      empName.includes(q) ||
      empEmail.includes(q) ||
      address.includes(q) ||
      city.includes(q);

    return matchesEmp && matchesType && matchesPurpose && matchesDate && matchesSearch;
  });

  // Unique employees active in field
  const uniqueFieldEmps = new Set(
    checkIns.map((ci) => ci.employee?._id || ci.employee).filter(Boolean)
  );

  // Today stats
  const todayStr = new Date().toDateString();
  const todayRecords = checkIns.filter(
    (ci) => new Date(ci.timestamp).toDateString() === todayStr
  );
  const todayCheckIns = todayRecords.filter((ci) => ci.type === 'CHECK_IN');
  const todayCheckOuts = todayRecords.filter((ci) => ci.type === 'CHECK_OUT');

  // Default map center
  const mapCenter =
    filteredCheckIns.length > 0
      ? [filteredCheckIns[0].latitude, filteredCheckIns[0].longitude]
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Compass className="w-4 h-4" />
            <span>Field Attendance Surveillance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Live Field Staff Check-In & Check-Out Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time out-of-office employee punch locations, GPS Map Camera selfies, arrival/departure
            times, and field audit compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Today Check-Ins */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Today's Check-Ins</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{todayCheckIns.length}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              Active field arrivals today
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <LogIn className="w-6 h-6" />
          </div>
        </div>

        {/* Total Today Check-Outs */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Today's Check-Outs</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{todayCheckOuts.length}</p>
            <p className="text-[11px] text-slate-400 mt-1">Departures / completions</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
            <LogOut className="w-6 h-6" />
          </div>
        </div>

        {/* Unique Staff Tracked */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Staff In Field</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{uniqueFieldEmps.size}</p>
            <p className="text-[11px] text-slate-400 mt-1">Active remote employees</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Watermark Compliance */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Records Logged</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{checkIns.length}</p>
            <p className="text-[11px] text-slate-400 mt-1">100% Geotagged & verified</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Camera className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Global Interactive Field Map */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-900 text-sm">
              Live Field Staff Map ({filteredCheckIns.length} Locations Marked)
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
            {filteredCheckIns.map((ci) => {
              const empName = ci.employee?.name || 'Staff Member';
              const empDept = ci.employee?.department || 'Field Ops';
              const isCi = ci.type === 'CHECK_IN';
              return (
                <Marker
                  key={ci._id}
                  position={[ci.latitude, ci.longitude]}
                  icon={createAdminPin(ci.type, ci.employee?.department)}
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
                        <span className="font-bold text-slate-900">{empName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCi
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {isCi ? '● CHECK-IN' : '● CHECK-OUT'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">{empDept}</p>
                      <p className="text-slate-600 line-clamp-2">{ci.address}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-500 text-[10px]">
                          {new Date(ci.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
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

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900 text-base">
              Field Attendance Audit Log
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive list of all field check-ins and check-outs with certified watermarks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff, city, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 w-44 sm:w-52"
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Punches</option>
              <option value="CHECK_IN">🟢 Check-In</option>
              <option value="CHECK_OUT">🔴 Check-Out</option>
            </select>

            {/* Employee Filter */}
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 max-w-[130px]"
            >
              <option value="ALL">All Staff</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name}
                </option>
              ))}
            </select>

            {/* Purpose Filter */}
            <select
              value={selectedPurpose}
              onChange={(e) => setSelectedPurpose(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500"
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

            {/* Date Picker */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500"
            />

            {(searchTerm ||
              selectedEmployee !== 'ALL' ||
              selectedType !== 'ALL' ||
              selectedPurpose !== 'ALL' ||
              selectedDate) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedEmployee('ALL');
                  setSelectedType('ALL');
                  setSelectedPurpose('ALL');
                  setSelectedDate('');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Audit Table */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-500">Loading audit records...</p>
          </div>
        ) : filteredCheckIns.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Compass className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Attendance Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No staff records match the current filter or search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Watermark Photo</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Location & Address</th>
                  <th className="py-3 px-4">GPS Coordinates</th>
                  <th className="py-3 px-4">Timestamp (GMT +05:30)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCheckIns.map((item) => {
                  const isCi = item.type === 'CHECK_IN';
                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Type */}
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

                      {/* Employee */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {item.employee?.name?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {item.employee?.name || 'Unknown Staff'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.employee?.department || 'Operations'} • {item.employee?.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Stamped Photo Thumbnail */}
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

                      {/* Purpose */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getPurposeBadge(item.purpose)}
                        {item.notes && (
                          <p
                            className="text-[11px] text-slate-500 mt-1 max-w-[140px] truncate"
                            title={item.notes}
                          >
                            "{item.notes}"
                          </p>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{item.city || 'Site Location'}</span>
                        </div>
                        <p
                          className="text-[11px] text-slate-500 line-clamp-2 mt-0.5"
                          title={item.address}
                        >
                          {item.address}
                        </p>
                      </td>

                      {/* Coordinates */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-700">
                        <div>Lat {item.latitude.toFixed(6)}°</div>
                        <div>Long {item.longitude.toFixed(6)}°</div>
                        <span className="text-[10px] text-emerald-600 font-sans font-semibold">
                          Accuracy ±{item.accuracy || 10}m
                        </span>
                      </td>

                      {/* Timestamp */}
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
                            second: '2-digit',
                            hour12: true,
                          })}{' '}
                          GMT+05:30
                        </div>
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
                            title="Open Google Maps"
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

      {/* Full Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[92vh]">
            <div className="p-4 flex items-center justify-between border-b border-slate-800 text-white">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm tracking-wide">
                  GPS Map Camera Certified Audit Photo
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
              <span>Geotagged & Timestamp Watermarked</span>
              <a
                href={selectedPhoto}
                download="field-audit-photo.jpg"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
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
