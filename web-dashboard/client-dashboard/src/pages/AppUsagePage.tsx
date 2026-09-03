import React, { useState, useEffect } from 'react';
import { DeviceInfo } from '../types/dashboard.types';
import { 
  Clock, 
  RefreshCw, 
  Trash2, 
  Search, 
  AppWindow, 
  Flame, 
  TrendingUp,
  CheckSquare, 
  Square,
  AlertCircle,
  Calendar,
  Filter,
  RotateCcw
} from 'lucide-react';

interface AppUsageItem {
  id: string;
  label: string;
  packageName: string;
  date?: string;
  hour?: number;
  timeSpentMs: number;
  lastUsed: string;
  timestamp: string;
  rawTimestamp?: number;
}

interface AppUsagePageProps {
  device: DeviceInfo;
}

export function AppUsagePage({ device }: AppUsagePageProps) {
  const [items, setItems] = useState<AppUsageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Date & Time Range States
  const [fromTime, setFromTime] = useState<string>('');
  const [toTime, setToTime] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string>('ALL');

  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState<boolean>(false);

  const fetchAppUsage = async () => {
    if (!device || device.id === 'no_device') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';
      let url = `/api/v1/telemetry/app-usage/${device.id}?`;
      if (fromTime) url += `from=${encodeURIComponent(fromTime)}&`;
      if (toTime) url += `to=${encodeURIComponent(toTime)}&`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (e) {
      console.warn('Failed to fetch app usage:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppUsage();
  }, [device, fromTime, toTime]);

  // Quick Preset Helper
  const applyPreset = (preset: string) => {
    setActivePreset(preset);
    const now = new Date();
    const todayYMD = now.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      setFromTime(`${todayYMD}T00:00`);
      setToTime(`${todayYMD}T23:59`);
    } else if (preset === 'YESTERDAY') {
      const yest = new Date(now.getTime() - 86400000);
      const yestYMD = yest.toISOString().split('T')[0];
      setFromTime(`${yestYMD}T00:00`);
      setToTime(`${yestYMD}T23:59`);
    } else if (preset === 'SCHOOL') {
      setFromTime(`${todayYMD}T09:00`);
      setToTime(`${todayYMD}T15:00`);
    } else if (preset === 'BEDTIME') {
      setFromTime(`${todayYMD}T20:00`);
      const tomorrow = new Date(now.getTime() + 86400000);
      const tomYMD = tomorrow.toISOString().split('T')[0];
      setToTime(`${tomYMD}T06:00`);
    } else {
      setFromTime('');
      setToTime('');
    }
    setCurrentPage(1);
  };

  // Format Milliseconds into "7h 23m" or "45m" (Rounded to nearest minute, no seconds)
  const formatTimeSpent = (ms: number) => {
    if (!ms || ms <= 0) return '0m';
    const totalMinutes = Math.round(ms / (1000 * 60));
    if (totalMinutes <= 0) return '1m';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  // Filter & Search
  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    return item.label.toLowerCase().includes(q) || item.packageName.toLowerCase().includes(q);
  });

  // Pagination calculation
  const totalEntries = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (validCurrentPage - 1) * entriesPerPage;
  const endIndex = Math.min(startIndex + entriesPerPage, totalEntries);
  const currentEntries = filteredItems.slice(startIndex, endIndex);

  // Checkbox Selection
  const toggleSelectAll = () => {
    if (selectedIds.length === currentEntries.length && currentEntries.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentEntries.map((item) => item.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Action: Delete Selected Entries
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';
      await fetch('/api/v1/telemetry/app-usage/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceId: device.id, ids: selectedIds })
      });
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
      setSelectedIds([]);
    } catch (e) {
      console.warn('Failed to delete selected app usage:', e);
    } finally {
      setDeleting(false);
    }
  };

  // Action: Delete All Entries
  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('childcare_auth_token') || 'jwt_demo_token';
      await fetch('/api/v1/telemetry/app-usage/delete-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceId: device.id })
      });
      setItems([]);
      setSelectedIds([]);
      setShowConfirmDeleteAll(false);
    } catch (e) {
      console.warn('Failed to delete all app usage:', e);
    } finally {
      setDeleting(false);
    }
  };

  // Calculate Metrics for Stats Bar
  const totalScreenTimeMs = items.reduce((acc, curr) => acc + (curr.timeSpentMs || 0), 0);
  
  // Calculate unique active days to determine Daily Average Screen Time
  const uniqueDaysCount = Math.max(1, new Set(items.map(item => item.date || item.lastUsed.split(',')[0])).size);
  const dailyAverageMs = Math.round(totalScreenTimeMs / uniqueDaysCount);

  const mostUsed = items.length > 0
    ? [...items].sort((a, b) => (b.timeSpentMs || 0) - (a.timeSpentMs || 0))[0]
    : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-inner border border-indigo-100">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">App Usage & Screen Time Monitoring</h1>
            <p className="text-xs text-slate-500 font-medium">
              Track active application foreground durations, last used times, and screen time for <span className="font-bold text-indigo-600">{device.alias}</span>
            </p>
          </div>
        </div>

        {/* Competitor Action Bar Top */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap justify-end">
          <button
            onClick={fetchAppUsage}
            disabled={loading}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-full transition-all flex items-center gap-2 text-xs font-bold shadow-xs hover:shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0 || deleting}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all flex items-center gap-2 text-xs font-bold shadow-md shadow-rose-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete ({selectedIds.length})</span>
          </button>

          <button
            onClick={() => setShowConfirmDeleteAll(true)}
            disabled={items.length === 0 || deleting}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full transition-all flex items-center gap-2 text-xs font-bold shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All</span>
          </button>
        </div>
      </div>

      {/* Date & Time Range Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Date & Time Filter Range</span>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-bold mr-1">Presets:</span>
            <button
              onClick={() => applyPreset('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activePreset === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => applyPreset('TODAY')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activePreset === 'TODAY' ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => applyPreset('YESTERDAY')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activePreset === 'YESTERDAY' ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => applyPreset('SCHOOL')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                activePreset === 'SCHOOL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              School Hours (9AM-3PM)
            </button>
          </div>
        </div>

        {/* Date Time Picker Inputs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 min-w-[36px]">From:</span>
            <input
              type="datetime-local"
              value={fromTime}
              onChange={(e) => {
                setFromTime(e.target.value);
                setActivePreset('CUSTOM');
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 min-w-[24px]">To:</span>
            <input
              type="datetime-local"
              value={toTime}
              onChange={(e) => {
                setToTime(e.target.value);
                setActivePreset('CUSTOM');
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
            />
          </div>

          {(fromTime || toTime) && (
            <button
              onClick={() => applyPreset('ALL')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Total Screen Time</span>
            <span className="text-lg font-black text-slate-900">{formatTimeSpent(totalScreenTimeMs)}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Daily Avg Screen Time</span>
            <span className="text-lg font-black text-blue-600">{formatTimeSpent(dailyAverageMs)} / day</span>
            <span className="text-[10px] text-slate-400 font-medium block">Across {uniqueDaysCount} day{uniqueDaysCount > 1 ? 's' : ''} tracked</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Most Used App</span>
            <span className="text-sm font-bold text-amber-600 truncate block max-w-[130px]">
              {mostUsed ? `${mostUsed.label} (${formatTimeSpent(mostUsed.timeSpentMs)})` : 'None'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <AppWindow className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block">Active Apps Tracked</span>
            <span className="text-lg font-black text-emerald-600">{items.length} Apps</span>
          </div>
        </div>
      </div>

      {/* Table Filter Controls */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Entries per page dropdown */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-bold cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>

          {/* Search Input Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search apps or packages..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Competitor Data Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 hover:bg-slate-200 rounded transition-all text-slate-600"
                  >
                    {selectedIds.length === currentEntries.length && currentEntries.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Label</th>
                <th className="py-3 px-4">Time Spent</th>
                <th className="py-3 px-4">Last Used</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading application usage telemetry...</span>
                  </td>
                </tr>
              ) : currentEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
                    No data available in table
                  </td>
                </tr>
              ) : (
                currentEntries.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-indigo-50/40 transition-colors ${
                        isSelected ? 'bg-indigo-50/60' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleSelectRow(item.id)}
                          className="p-1 hover:bg-slate-200 rounded transition-all text-slate-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0">
                            <AppWindow className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block text-xs">{item.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">{item.packageName}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100">
                          {formatTimeSpent(item.timeSpentMs)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-xs font-semibold">
                        {item.lastUsed}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {item.timestamp}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Competitor Table Footer & Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs text-slate-500 font-medium">
          <div>
            Showing {totalEntries === 0 ? 0 : startIndex + 1} to {endIndex} of {totalEntries} entries
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold disabled:opacity-40 disabled:hover:bg-transparent"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, validCurrentPage - 2), Math.min(totalPages, validCurrentPage + 1))
              .map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    validCurrentPage === page
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'border border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {page}
                </button>
              ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Delete All Confirmation Modal */}
      {showConfirmDeleteAll && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center gap-3 text-amber-600 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Delete All App Usage Logs?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Are you sure you want to delete all <strong>{items.length}</strong> recorded application usage and screen time logs for <strong>{device.alias}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmDeleteAll(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleting}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
