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
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Leaflet Pin Icon
const pinIcon = L.divIcon({
  className: 'custom-pin',
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:#10b981;border:3px solid #ffffff;border-radius:50%;box-shadow:0 4px 12px rgba(16,185,129,0.5);">
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

export default function EmployeeFieldCheckInPage() {
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [filterPurpose, setFilterPurpose] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCheckIns = async () => {
    setLoading(true);
    try {
      const res = await api.get('/field-checkins/my');
      if (res.data?.success) {
        setCheckIns(res.data.checkIns || []);
      }
    } catch (err) {
      console.error('Failed to load check-ins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckIns();
  }, []);

  const handleSuccess = (newCheckIn) => {
    setCheckIns((prev) => [newCheckIn, ...prev]);
  };

  // Filtered check-ins
  const filteredCheckIns = checkIns.filter((item) => {
    const matchesPurpose = filterPurpose === 'ALL' || item.purpose === filterPurpose;
    const matchesSearch =
      (item.address && item.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.city && item.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesPurpose && matchesSearch;
  });

  // Calculate metrics
  const today = new Date().toDateString();
  const todayCheckIns = checkIns.filter((c) => new Date(c.timestamp).toDateString() === today);
  const lastCheckIn = checkIns[0] || null;

  // Default center coordinates for map (use last check-in or default India location)
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
      OTHER: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    const label = (purpose || 'OTHER').replace('_', ' ');
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
          styles[purpose] || styles.OTHER
        }`}
      >
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Compass className="w-4 h-4" />
            <span>Field Duty & Geolocation</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Out-of-Office Live GPS Check-In
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Take a live selfie with certified GPS coordinates, timestamp, and location watermark
            for field assignments.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2.5 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-semibold text-sm shadow-md shadow-emerald-500/20 transition-all shrink-0 cursor-pointer"
        >
          <Camera className="w-5 h-5" />
          <span>New GPS Check-In</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Today's Field Check-Ins</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{todayCheckIns.length}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              {todayCheckIns.length > 0 ? '✓ Verified Active Today' : 'No check-in today yet'}
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Check-Ins</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{checkIns.length}</p>
            <p className="text-[11px] text-slate-400 mt-1">Lifetime verified entries</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Camera className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Last Recorded City</p>
            <p className="text-base font-bold text-slate-900 mt-1 truncate max-w-[160px]">
              {lastCheckIn?.city || 'No Location Yet'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 truncate max-w-[160px]">
              {lastCheckIn?.state || 'Awaiting first record'}
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Last Check-In Time</p>
            <p className="text-xs font-bold text-slate-900 mt-1">
              {lastCheckIn
                ? new Date(lastCheckIn.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })
                : '--:--'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {lastCheckIn ? new Date(lastCheckIn.timestamp).toLocaleDateString() : 'Never'}
            </p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Live Map Overview */}
      {checkIns.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900 text-sm">
                My Field Activity Map ({checkIns.length} Pins)
              </h2>
            </div>
            <span className="text-xs text-slate-500">Interactive OpenStreetMap satellite/street</span>
          </div>
          <div className="h-80 w-full relative z-0">
            <MapContainer
              center={mapCenter}
              zoom={13}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {checkIns.map((ci) => (
                <Marker
                  key={ci._id}
                  position={[ci.latitude, ci.longitude]}
                  icon={pinIcon}
                >
                  <Popup>
                    <div className="p-1 space-y-1.5 text-xs max-w-xs">
                      {ci.photo && (
                        <img
                          src={ci.photo}
                          alt="Check-in selfie"
                          className="w-full h-28 object-cover rounded-md mb-1 cursor-pointer"
                          onClick={() => setSelectedPhoto(ci.photo)}
                        />
                      )}
                      <p className="font-bold text-slate-900">{ci.city || 'Field Location'}</p>
                      <p className="text-slate-600 line-clamp-2">{ci.address}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-emerald-600 font-semibold text-[10px]">
                          {new Date(ci.timestamp).toLocaleString()}
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
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {/* History Table & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table header & controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Check-In History & Stamped Photos</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Certified records stamped with live coordinates, mini-map, and timestamp.
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
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 w-48"
              />
            </div>

            {/* Purpose Filter */}
            <select
              value={filterPurpose}
              onChange={(e) => setFilterPurpose(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Purposes</option>
              <option value="CLIENT_VISIT">Client Visit</option>
              <option value="SITE_INSPECTION">Site Inspection</option>
              <option value="DELIVERY">Delivery</option>
              <option value="MARKETING">Marketing</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OTHER">Other</option>
            </select>

            <button
              onClick={fetchCheckIns}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Refresh"
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
            <h3 className="font-bold text-slate-800 text-sm">No Check-Ins Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {searchTerm || filterPurpose !== 'ALL'
                ? 'No records match your active search or purpose filter.'
                : 'You have not submitted any out-of-office field check-ins yet.'}
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Take First GPS Check-In
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
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
                {filteredCheckIns.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
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
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5" title={item.address}>
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
                      <p className="text-slate-600 truncate text-[11px]" title={item.notes || 'No note'}>
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
                ))}
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
      />

      {/* Full Photo Inspection Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[92vh]">
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
                download="workforce-field-checkin.jpg"
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

