import React, { useState } from 'react';
import { 
  MapPin, 
  RefreshCw, 
  Trash2, 
  Search, 
  Star, 
  AlertTriangle,
  X,
  ExternalLink,
  Navigation,
  Globe,
  Compass,
  Layers,
  Map as MapIcon
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
  accuracy: string;
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

export const LiveLocationPage: React.FC<LiveLocationPageProps> = ({ device }) => {
  const [locations, setLocations] = useState<LocationItem[]>([
    {
      id: 'loc_1',
      address: 'Netaji Subhash Marg, Lal Qila, Old Delhi, Delhi 110006',
      lat: 28.6562,
      lng: 77.2410,
      provider: 'Network',
      accuracy: '12m',
      timestamp: '31/08/2026 11:21 pm',
      isStarred: true
    },
    {
      id: 'loc_2',
      address: 'Connaught Place, Inner Circle, New Delhi 110001',
      lat: 28.6304,
      lng: 77.2177,
      provider: 'Network',
      accuracy: '18m',
      timestamp: '31/08/2026 08:14 pm',
      isStarred: false
    },
    {
      id: 'loc_3',
      address: 'Plot No. A2, Maharaja Agrasen Marg, Sector 62, Noida 201309',
      lat: 28.5648,
      lng: 77.3218,
      provider: 'Fused',
      accuracy: '5m',
      timestamp: '31/08/2026 06:02 pm',
      isStarred: false
    },
    {
      id: 'loc_4',
      address: 'Gateway of India, Apollo Bandar, Colaba, Mumbai 400001',
      lat: 18.922064,
      lng: 72.834641,
      provider: 'GPS',
      accuracy: '3m',
      timestamp: '31/08/2026 05:40 pm',
      isStarred: true
    },
    {
      id: 'loc_5',
      address: 'Cyber City, DLF Tower 8, Phase 2, Gurugram 122002',
      lat: 28.4950,
      lng: 77.0895,
      provider: 'Network',
      accuracy: '15m',
      timestamp: '31/08/2026 04:55 pm',
      isStarred: false
    },
    {
      id: 'loc_6',
      address: 'Bandra Kurla Complex, G Block, Mumbai 400051',
      lat: 19.0657,
      lng: 72.8687,
      provider: 'GPS',
      accuracy: '4m',
      timestamp: '30/08/2026 09:10 pm',
      isStarred: false
    }
  ]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [activeMapItem, setActiveMapItem] = useState<LocationItem>(locations[0]);
  const [showMapModal, setShowMapModal] = useState(false);

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    danger: true,
    onConfirm: () => {},
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLocations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLocations.map(l => l.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleStar = (id: string) => {
    setLocations(locations.map(l => l.id === id ? { ...l, isStarred: !l.isStarred } : l));
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://maps.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  {/* Delete Selected Action Confirmation Modal */}
  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Delete ${selectedIds.length} Selected Location Record(s)`,
      description: `Are you sure you want to permanently delete the selected ${selectedIds.length} location telemetry point(s) recorded for ${device.alias}? This action cannot be undone.`,
      confirmText: 'Yes, Delete Selected',
      danger: true,
      onConfirm: () => {
        setLocations(locations.filter(l => !selectedIds.includes(l.id)));
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  {/* Delete All Action Confirmation Modal */}
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

      {/* Focus Map Preview Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Map Focus: {activeMapItem.address}</h3>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Embedded Interactive Map Card */}
            <div className="h-64 rounded-xl bg-slate-100 border border-slate-200 relative overflow-hidden flex flex-col justify-between p-4 shadow-inner">
              <div className="absolute inset-0 bg-linear-to-br from-indigo-950/10 via-slate-900/20 to-sky-950/10 z-0 pointer-events-none" />
              
              <div className="relative z-10 flex items-center justify-between">
                <span className="px-3 py-1 bg-white/90 backdrop-blur-xs rounded-full text-xs font-bold text-slate-900 shadow-xs border border-slate-200">
                  📍 {activeMapItem.lat.toFixed(4)}, {activeMapItem.lng.toFixed(4)}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-xs">
                  {activeMapItem.provider} Signal
                </span>
              </div>

              <div className="relative z-10 text-center py-6">
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
                  <MapPin className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-800 mt-2 bg-white/90 backdrop-blur-xs px-3 py-1 rounded-lg inline-block border border-slate-200">
                  {activeMapItem.address}
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">Accuracy: ±{activeMapItem.accuracy}</span>
                <button
                  onClick={() => openGoogleMaps(activeMapItem.lat, activeMapItem.lng)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open External Maps</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowMapModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close Map Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Location History</h1>
          <p className="text-xs text-slate-500">Real-time GPS coordinates, reverse geocoded addresses, and map view tracking for {device.alias}</p>
        </div>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
          Total Recorded: 142 Points
        </span>
      </div>

      {/* Top Action Toolbar (OneMonitar Style Alignment) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Action Buttons: Sync (Cyan), Delete Data, Delete All Data, Provider Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => console.log('Syncing real-time GPS location...')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync</span>
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
              <span>Delete Data {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</span>
            </button>

            <button 
              onClick={requestDeleteAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Delete All Data</span>
            </button>

            {/* Provider Filter Dropdown */}
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
          </div>

          {/* Search Box */}
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

        {/* Entries Selector */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <span>Showing {filteredLocations.length} location records</span>
        </div>

        {/* Location History Data Table (OneMonitar Style Alignment) */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredLocations.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="p-3">Address</th>
                <th className="p-3">Longitude & Latitude</th>
                <th className="p-3 text-center">Map View</th>
                <th className="p-3">Provider</th>
                <th className="p-3 text-right">Location Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredLocations.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelectRow(item.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="p-3 font-medium text-slate-900 max-w-xs truncate" title={item.address}>
                    {item.address}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => {
                        setActiveMapItem(item);
                        setShowMapModal(true);
                      }}
                      className="text-sky-600 hover:text-sky-800 font-mono text-xs font-semibold flex items-center gap-1 hover:underline"
                    >
                      <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span>{item.lat.toFixed(4)}, {item.lng.toFixed(4)}</span>
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => openGoogleMaps(item.lat, item.lng)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-rose-600 transition-colors inline-flex items-center justify-center"
                      title="Open in Google Maps"
                    >
                      <MapIcon className="w-4 h-4 text-rose-600" />
                    </button>
                  </td>
                  <td className="p-3">
                    {item.provider === 'GPS' && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500 text-white shadow-2xs">
                        GPS
                      </span>
                    )}
                    {item.provider === 'Network' && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-white shadow-2xs">
                        Network
                      </span>
                    )}
                    {item.provider === 'Fused' && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-600 text-white shadow-2xs">
                        Fused
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right text-[11px] text-slate-400 whitespace-nowrap">{item.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <span>Showing 1 to {filteredLocations.length} of 142 location points</span>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="px-3 py-1 rounded bg-indigo-600 text-white text-xs font-semibold">
              1
            </button>
            <button className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium">
              2
            </button>
            <button className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium">
              3
            </button>
            <button className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium">
              Next
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
