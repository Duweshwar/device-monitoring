import React, { useState, useEffect, useRef, useMemo } from 'react';
import { apiService } from '../services/apiService';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  RefreshCw, 
  Trash2, 
  Search, 
  AlertTriangle,
  X,
  ExternalLink,
  Navigation,
  Compass,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface LiveLocationPageProps {
  device: DeviceInfo;
}

interface LocationItem {
  id: string;
  address: string;
  lat: number;
  lng: number;
  provider: 'GPS' | 'Network' | 'Fused';
  accuracy: number;
  timestamp: string;
  isStarred: boolean;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string;
  danger: boolean;
  onConfirm: () => void;
}

// Custom Animated Pulse Pin for Current/Latest Location
const createCurrentLocationIcon = () => {
  return L.divIcon({
    className: 'custom-leaflet-marker-wrapper',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-10 h-10 bg-indigo-500/40 rounded-full animate-ping"></div>
        <div class="w-9 h-9 bg-indigo-600 border-2 border-white rounded-full shadow-2xl flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

// Prominent Highlighted Pin for FOCUSED Location Item selected by User
const createFocusedLocationIcon = (isLatest: boolean) => {
  const badgeColor = isLatest ? 'bg-indigo-600' : 'bg-sky-500';
  return L.divIcon({
    className: 'custom-leaflet-focused-marker-wrapper',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 bg-sky-400/50 rounded-full animate-ping"></div>
        <div class="w-10 h-10 ${badgeColor} border-3 border-white rounded-full shadow-2xl flex items-center justify-center text-white scale-110 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

// Start Point Pin (Green Star) for History Trail Start
const createStartLocationIcon = () => {
  return L.divIcon({
    className: 'custom-leaflet-marker-wrapper',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="w-7 h-7 bg-emerald-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

// Component to dynamically fly camera and re-center map view on focused coordinate
const MapRecenter = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2, animate: true });
  }, [center, zoom, map]);
  return null;
};

export const LiveLocationPage: React.FC<LiveLocationPageProps> = ({ device }) => {
  const defaultLocations: LocationItem[] = [
    {
      id: 'loc_1',
      address: 'Netaji Subhash Marg, Lal Qila, Old Delhi, Delhi 110006',
      lat: 28.6562,
      lng: 77.2410,
      provider: 'GPS',
      accuracy: 12,
      timestamp: new Date().toLocaleString(),
      isStarred: true
    }
  ];

  const [locations, setLocations] = useState<LocationItem[]>(defaultLocations);
  const [activeTile, setActiveTile] = useState<'streets' | 'satellite'>('streets');
  const [maxMapPoints, setMaxMapPoints] = useState<number>(100);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Tile Layer options
  const tileUrls = {
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
  };

  // Poll real-time GPS location logs from NestJS PostgreSQL backend
  useEffect(() => {
    let isMounted = true;
    const fetchLiveLocations = async () => {
      try {
        const live = await apiService.getLocations(device.id, []);
        if (isMounted && Array.isArray(live) && live.length > 0) {
          const formatted: LocationItem[] = live.map((l: any, i: number) => ({
            id: l.id || `live_loc_${i}`,
            address: l.address || `Lat: ${l.latitude}, Lng: ${l.longitude}`,
            lat: Number(l.latitude || 28.6562),
            lng: Number(l.longitude || 77.2410),
            provider: (l.provider || 'GPS') as any,
            accuracy: Number(l.accuracy || 15),
            timestamp: new Date(l.timestamp || Date.now()).toLocaleString(),
            isStarred: false
          }));
          setLocations(formatted);
        }
      } catch (err) {
        console.warn('Failed to fetch live locations:', err);
      }
    };

    fetchLiveLocations();
    const interval = setInterval(fetchLiveLocations, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [device.id]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMapItem, setActiveMapItem] = useState<LocationItem>(locations[0] || defaultLocations[0]);
  const [showPolyline, setShowPolyline] = useState(true);
  const [showAccuracyCircle, setShowAccuracyCircle] = useState(true);

  // Reset pagination page to 1 whenever filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterProvider, pageSize]);

  // Update active map item when locations update
  useEffect(() => {
    if (locations.length > 0 && (!activeMapItem || activeMapItem.id === 'loc_1')) {
      setActiveMapItem(locations[0]);
    }
  }, [locations]);

  const handleFocusLocation = (item: LocationItem) => {
    setActiveMapItem(item);
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    danger: true,
    onConfirm: () => {},
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedLocations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedLocations.map(l => l.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://maps.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Delete ${selectedIds.length} Selected Location Record(s)`,
      description: `Are you sure you want to permanently delete the selected ${selectedIds.length} location telemetry point(s) recorded for ${device.alias}?`,
      confirmText: 'Yes, Delete Selected',
      danger: true,
      onConfirm: () => {
        setLocations(locations.filter(l => !selectedIds.includes(l.id)));
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const requestDeleteAll = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete All Location History Data',
      description: `WARNING: Are you sure you want to permanently clear ALL GPS & Location history records for ${device.alias}?`,
      confirmText: 'Yes, Delete All Location Data',
      danger: true,
      onConfirm: () => {
        setLocations([]);
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const filteredLocations = locations.filter(l => {
    const matchesSearch = l.address.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          `${l.lat},${l.lng}`.includes(searchTerm);
    if (filterProvider !== 'all') {
      return matchesSearch && l.provider === filterProvider;
    }
    return matchesSearch;
  });

  // Calculate pagination limits for table
  const totalPages = Math.max(1, Math.ceil(filteredLocations.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredLocations.length);
  const paginatedLocations = filteredLocations.slice(startIndex, endIndex);

  // 🚀 DYNAMIC SLIDING MAP WINDOW ALGORITHM
  const mapPlottedLocations = useMemo(() => {
    if (locations.length <= maxMapPoints) return locations;

    const focusedIndex = activeMapItem 
      ? locations.findIndex(l => l.id === activeMapItem.id) 
      : 0;

    const validIndex = focusedIndex >= 0 ? focusedIndex : 0;
    const halfWindow = Math.floor(maxMapPoints / 2);

    let start = validIndex - halfWindow;
    let end = validIndex + halfWindow;

    if (start < 0) {
      start = 0;
      end = Math.min(maxMapPoints, locations.length);
    } else if (end > locations.length) {
      end = locations.length;
      start = Math.max(0, locations.length - maxMapPoints);
    }

    return locations.slice(start, end);
  }, [locations, activeMapItem, maxMapPoints]);

  const currentCenter: [number, number] = activeMapItem 
    ? [activeMapItem.lat, activeMapItem.lng] 
    : [28.6562, 77.2410];

  const polylinePositions: [number, number][] = mapPlottedLocations.map(l => [l.lat, l.lng]);
  const latestLocation = locations[0];
  const startLocation = locations.length > 1 ? locations[locations.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Confirmation Modal Dialog Overlay */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  confirmModal.danger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 leading-tight">
                  {confirmModal.title}
                </h3>
              </div>
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmModal.description}
            </p>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition-all ${
                  confirmModal.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Title & Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-indigo-600 animate-spin-slow" />
            Live GPS Location Tracking
          </h1>
          <p className="text-xs text-slate-500">Real-time GPS coordinate telemetry, route playback, and interactive map view for {device.alias}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Live Tracking Active
          </span>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
            {locations.length} Telemetry Points
          </span>
        </div>
      </div>

      {/* 🗺️ INTERACTIVE LEAFLET MAP CANVAS CONTAINER */}
      <div ref={mapContainerRef} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative">
        
        {/* Map Header Toolbar (Layer Switcher & Controls) */}
        <div className="bg-slate-900/90 backdrop-blur-md px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 relative z-20">
          
          {/* Active Target Card Pill */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white max-w-xs truncate">{activeMapItem?.address || 'Current Position'}</h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeMapItem?.provider}
                </span>
                {activeMapItem?.id === latestLocation?.id && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Lat: {activeMapItem?.lat.toFixed(5)}, Lng: {activeMapItem?.lng.toFixed(5)} • Accuracy: ±{activeMapItem?.accuracy || 10}m
              </p>
            </div>
          </div>

          {/* Map Controls & Compact Plot Window Dropdown */}
          <div className="flex items-center gap-2">
            
            {/* Compact Map Plot Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs">
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-slate-400 font-medium">Plot:</span>
              <select
                value={maxMapPoints}
                onChange={(e) => setMaxMapPoints(Number(e.target.value))}
                className="bg-transparent font-bold text-indigo-300 focus:outline-none cursor-pointer"
              >
                <option value={50} className="bg-slate-900 text-white">50 pts</option>
                <option value={100} className="bg-slate-900 text-white">100 pts</option>
                <option value={200} className="bg-slate-900 text-white">200 pts</option>
                <option value={9999} className="bg-slate-900 text-white">All pts</option>
              </select>
            </div>

            {/* Toggle Polyline */}
            <button
              onClick={() => setShowPolyline(!showPolyline)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                showPolyline 
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              🛣️ Route {showPolyline ? 'ON' : 'OFF'}
            </button>

            {/* Toggle Accuracy Circle */}
            <button
              onClick={() => setShowAccuracyCircle(!showAccuracyCircle)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                showAccuracyCircle 
                  ? 'bg-sky-600/30 border-sky-500 text-sky-200' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
            >
              🎯 Radius {showAccuracyCircle ? 'ON' : 'OFF'}
            </button>

            {/* Tile Layer Switcher */}
            <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setActiveTile('streets')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  activeTile === 'streets' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Streets
              </button>
              <button
                onClick={() => setActiveTile('satellite')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  activeTile === 'satellite' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Satellite
              </button>
            </div>

            {/* External Google Maps Button */}
            <button
              onClick={() => openGoogleMaps(activeMapItem.lat, activeMapItem.lng)}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Google Maps</span>
            </button>
          </div>

        </div>

        {/* Leaflet Map Canvas Window */}
        <div className="h-[440px] w-full relative z-10">
          <MapContainer
            center={currentCenter}
            zoom={16}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            {/* Tile Layer */}
            <TileLayer
              url={tileUrls[activeTile].url}
              attribution={tileUrls[activeTile].attribution}
            />

            {/* Auto Recenter component */}
            <MapRecenter center={currentCenter} zoom={16} />

            {/* Clean Route Polyline Trail */}
            {showPolyline && polylinePositions.length > 1 && (
              <Polyline
                positions={polylinePositions}
                pathOptions={{
                  color: '#4f46e5',
                  weight: 5,
                  opacity: 0.85,
                  dashArray: '6, 8'
                }}
              />
            )}

            {/* GPS Accuracy Radius Circle for Focused Location Item */}
            {showAccuracyCircle && activeMapItem && (
              <Circle
                center={[activeMapItem.lat, activeMapItem.lng]}
                radius={activeMapItem.accuracy || 15}
                pathOptions={{
                  color: '#38bdf8',
                  fillColor: '#38bdf8',
                  fillOpacity: 0.2,
                  weight: 1.5
                }}
              />
            )}

            {/* 1. Sleek Circle Markers for Intermediate Route Waypoints within Plotted Window */}
            {mapPlottedLocations.slice(1, mapPlottedLocations.length - 1).map((item) => {
              const isFocused = activeMapItem?.id === item.id;
              if (isFocused) return null;

              return (
                <CircleMarker
                  key={item.id}
                  center={[item.lat, item.lng]}
                  radius={5}
                  pathOptions={{
                    color: '#3730a3',
                    fillColor: '#6366f1',
                    fillOpacity: 0.85,
                    weight: 2
                  }}
                  eventHandlers={{
                    click: () => handleFocusLocation(item)
                  }}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-1 max-w-xs space-y-1">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <span className="font-bold text-xs text-slate-900">📍 Waypoint</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                          {item.provider}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-snug">{item.address}</p>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Lat: {item.lat.toFixed(5)}, Lng: {item.lng.toFixed(5)} • ±{item.accuracy}m
                      </div>
                      <div className="text-[10px] text-slate-400 pt-1">Time: {item.timestamp}</div>
                      <button
                        onClick={() => openGoogleMaps(item.lat, item.lng)}
                        className="w-full mt-1 py-1 px-2 rounded bg-indigo-600 text-white text-[11px] font-semibold flex items-center justify-center gap-1 shadow-xs hover:bg-indigo-700"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open in Google Maps</span>
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* 2. Start Point Marker (Green Star Pin) if history exists */}
            {startLocation && activeMapItem?.id !== startLocation.id && (
              <Marker
                key="start_location_pin"
                position={[startLocation.lat, startLocation.lng]}
                icon={createStartLocationIcon()}
                eventHandlers={{
                  click: () => handleFocusLocation(startLocation)
                }}
              >
                <Popup>
                  <div className="p-1 max-w-xs space-y-1">
                    <div className="font-bold text-xs text-emerald-700">🏁 Route Start Point</div>
                    <p className="text-xs text-slate-700">{startLocation.address}</p>
                    <div className="text-[10px] text-slate-400">Captured: {startLocation.timestamp}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 3. PROMINENT LATEST CURRENT LOCATION MARKER (Vibrant Indigo Pin) */}
            {latestLocation && activeMapItem?.id !== latestLocation.id && (
              <Marker
                key="latest_current_location_pin"
                position={[latestLocation.lat, latestLocation.lng]}
                icon={createCurrentLocationIcon()}
                eventHandlers={{
                  click: () => handleFocusLocation(latestLocation)
                }}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 max-w-xs space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <span className="font-bold text-xs text-indigo-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Live Device Position
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                        {latestLocation.provider}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 font-semibold leading-snug">
                      {latestLocation.address}
                    </p>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Lat: {latestLocation.lat.toFixed(5)}, Lng: {latestLocation.lng.toFixed(5)} • ±{latestLocation.accuracy}m
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1">
                      Last Updated: {latestLocation.timestamp}
                    </div>
                    <button
                      onClick={() => openGoogleMaps(latestLocation.lat, latestLocation.lng)}
                      className="w-full mt-1 py-1 px-2 rounded bg-indigo-600 text-white text-[11px] font-semibold flex items-center justify-center gap-1 shadow-xs hover:bg-indigo-700"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Navigate in Google Maps</span>
                    </button>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 4. ⭐ PROMINENT FOCUSED LOCATION MARKER (Vibrant Indigo/Cyan Pin with Pulse) */}
            {activeMapItem && (
              <Marker
                key={`focused_active_marker_${activeMapItem.id}`}
                position={[activeMapItem.lat, activeMapItem.lng]}
                icon={createFocusedLocationIcon(activeMapItem.id === latestLocation?.id)}
                zIndexOffset={1000}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 max-w-xs space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <span className="font-bold text-xs text-sky-700 flex items-center gap-1">
                        🎯 Focused Coordinate
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                        {activeMapItem.provider}
                      </span>
                    </div>
                    <p className="text-xs text-slate-900 font-bold leading-snug">
                      {activeMapItem.address}
                    </p>
                    <div className="text-[10px] text-slate-600 font-mono font-semibold">
                      Lat: {activeMapItem.lat.toFixed(5)}, Lng: {activeMapItem.lng.toFixed(5)} • ±{activeMapItem.accuracy}m
                    </div>
                    <div className="text-[10px] text-slate-400 pt-0.5">
                      Captured: {activeMapItem.timestamp}
                    </div>
                    <button
                      onClick={() => openGoogleMaps(activeMapItem.lat, activeMapItem.lng)}
                      className="w-full mt-1 py-1 px-2 rounded bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1 shadow-xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open in Google Maps</span>
                    </button>
                  </div>
                </Popup>
              </Marker>
            )}

          </MapContainer>
        </div>

      </div>

      {/* Top Action Toolbar & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => console.log('Syncing real-time GPS location...')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Now</span>
            </button>

            <button 
              onClick={requestDeleteSelected}
              disabled={selectedIds.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs ${
                selectedIds.length > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-rose-100 text-rose-300 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</span>
            </button>

            <button 
              onClick={requestDeleteAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Clear All History</span>
            </button>

            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Show all providers</option>
              <option value="GPS">GPS Only</option>
              <option value="Network">Network Only</option>
              <option value="Fused">Fused Only</option>
            </select>

            {/* 📊 Compact Entries Per Page Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <span className="font-semibold text-slate-500">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent font-bold text-indigo-700 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search address or coordinates..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

        </div>

        {/* Location History Data Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === paginatedLocations.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="p-3">Address</th>
                <th className="p-3">Coordinates (Lat, Lng)</th>
                <th className="p-3 text-center">Map Focus</th>
                <th className="p-3">Signal Provider</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedLocations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs font-medium">
                    No location records match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedLocations.map((item, idx) => {
                  const absoluteIndex = startIndex + idx;
                  const isSelectedOnMap = activeMapItem?.id === item.id;
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelectedOnMap ? 'bg-indigo-50/70 font-bold border-l-4 border-l-indigo-600' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelectRow(item.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-3 font-medium text-slate-900 max-w-xs truncate" title={item.address}>
                        {absoluteIndex === 0 && (
                          <span className="mr-1.5 px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold">
                            LATEST
                          </span>
                        )}
                        {item.address}
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-700">
                        {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleFocusLocation(item)}
                          className={`p-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                            isSelectedOnMap 
                              ? 'bg-indigo-600 text-white shadow-xs' 
                              : 'bg-slate-100 hover:bg-slate-200 text-indigo-600'
                          }`}
                          title="Focus & Highlight on Map"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{isSelectedOnMap ? 'Focused' : 'Focus'}</span>
                        </button>
                      </td>
                      <td className="p-3">
                        {item.provider === 'GPS' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500 text-white shadow-2xs">
                            GPS (±{item.accuracy}m)
                          </span>
                        )}
                        {item.provider === 'Network' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-white shadow-2xs">
                            Network (±{item.accuracy}m)
                          </span>
                        )}
                        {item.provider === 'Fused' && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-600 text-white shadow-2xs">
                            Fused (±{item.accuracy}m)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right text-[11px] text-slate-400 whitespace-nowrap">{item.timestamp}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Working Pagination Controls & Entries Per Page Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500">
          
          <div className="flex items-center gap-3">
            <span>
              Showing {filteredLocations.length > 0 ? startIndex + 1 : 0} to {endIndex} of {filteredLocations.length} location records
            </span>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-slate-500 font-medium">per page</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  currentPage === page 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                {page}
              </button>
            ))}

            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
