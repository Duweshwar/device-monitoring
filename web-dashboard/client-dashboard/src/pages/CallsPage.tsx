import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { 
  PhoneCall, 
  RefreshCw, 
  Trash2, 
  Ban, 
  CheckCircle2, 
  Search, 
  Star, 
  AlertTriangle,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  PhoneMissed,
  Play,
  Pause,
  Volume2
} from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface CallsPageProps {
  device: DeviceInfo;
}

interface CallLogItem {
  id: string;
  name: string;
  number: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  duration: string;
  simSlot: string;
  cellId?: string;
  lac?: string;
  timestamp: string;
  isStarred: boolean;
  isBlocked: boolean;
  hasAudioRecording: boolean;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string;
  danger: boolean;
  onConfirm: () => void;
}

export const CallsPage: React.FC<CallsPageProps> = ({ device }) => {
  const defaultLogs: CallLogItem[] = [
    { id: 'cl_1', name: 'Bran', number: '91234XX567', direction: 'outgoing', duration: '', simSlot: 'SIM 1 (Airtel)', cellId: '', lac: '', timestamp: '30/08/2026 08:52 pm', isStarred: true, isBlocked: false, hasAudioRecording: false },
    { id: 'cl_2', name: 'Bran', number: '91234XX567', direction: 'incoming', duration: '', simSlot: 'SIM 1 (Airtel)', cellId: '', lac: '', timestamp: '30/08/2026 07:02 pm', isStarred: true, isBlocked: false, hasAudioRecording: false },
    { id: 'cl_3', name: 'Hema', number: '99992XX787', direction: 'outgoing', duration: '', simSlot: 'SIM 2 (Jio 5G)', cellId: '', lac: '', timestamp: '30/08/2026 05:57 pm', isStarred: false, isBlocked: false, hasAudioRecording: false },
    { id: 'cl_4', name: 'Hema', number: '9234XXX87', direction: 'incoming', duration: '', simSlot: 'SIM 1 (Airtel)', cellId: '', lac: '', timestamp: '30/08/2026 04:59 pm', isStarred: false, isBlocked: false, hasAudioRecording: false },
    { id: 'cl_5', name: 'Samaira', number: '92342XX454', direction: 'outgoing', duration: '', simSlot: 'SIM 2 (Jio 5G)', cellId: '', lac: '', timestamp: '30/08/2026 02:53 pm', isStarred: false, isBlocked: false, hasAudioRecording: false },
    { id: 'cl_6', name: 'Bran', number: '91234XX567', direction: 'incoming', duration: '01m 40s', simSlot: 'SIM 1 (Airtel)', cellId: '404-20', lac: '4102', timestamp: '30/08/2026 05:59 am', isStarred: true, isBlocked: false, hasAudioRecording: true },
    { id: 'cl_7', name: 'Alex Rivera', number: '98765XX210', direction: 'missed', duration: '00m 00s', simSlot: 'SIM 1 (Airtel)', cellId: '404-12', lac: '1209', timestamp: '29/08/2026 11:20 am', isStarred: true, isBlocked: false, hasAudioRecording: false },
    { id: 'cl_8', name: 'Sarah Jenkins', number: '97112XX439', direction: 'incoming', duration: '05m 22s', simSlot: 'SIM 2 (Jio 5G)', cellId: '404-12', lac: '1209', timestamp: '29/08/2026 09:40 am', isStarred: false, isBlocked: false, hasAudioRecording: true }
  ];

  const [callLogs, setCallLogs] = useState<CallLogItem[]>(defaultLogs);

  useEffect(() => {
    let isMounted = true;
    const fetchLiveCalls = async () => {
      try {
        const live = await apiService.getCalls(device.id, []);
        if (isMounted && Array.isArray(live) && live.length > 0) {
          const formatted: CallLogItem[] = live.map((c: any, i: number) => ({
            id: c.id || `live_call_${i}`,
            name: c.contactName || 'Target Contact',
            number: c.phoneNumber || 'Unknown',
            direction: ((c.direction || 'incoming').toLowerCase()) as any,
            duration: c.durationSec ? `${Math.floor(c.durationSec / 60)}m ${c.durationSec % 60}s` : '00m 05s',
            simSlot: 'SIM 1 (Airtel)',
            timestamp: new Date(c.timestamp || Date.now()).toLocaleString(),
            isStarred: false,
            isBlocked: false,
            hasAudioRecording: false
          }));
          setCallLogs(formatted);
        }
      } catch (err) {
        console.warn('Failed to fetch live call logs:', err);
      }
    };
    fetchLiveCalls();
    const interval = setInterval(fetchLiveCalls, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [device.id]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirection, setFilterDirection] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    danger: true,
    onConfirm: () => {},
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCalls.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCalls.map(c => c.id));
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
    setCallLogs(callLogs.map(c => c.id === id ? { ...c, isStarred: !c.isStarred } : c));
  };

  const toggleAudio = (id: string) => {
    setPlayingAudioId(playingAudioId === id ? null : id);
  };

  {/* Block / Unblock Action Confirmation Modal */}
  const requestToggleBlock = (item: CallLogItem) => {
    const isBlocking = !item.isBlocked;
    setConfirmModal({
      isOpen: true,
      title: isBlocking ? `Block Number: ${item.name}` : `Unblock Number: ${item.name}`,
      description: isBlocking
        ? `Are you sure you want to block incoming calls and SMS from ${item.name} (${item.number}) on ${device.alias}?`
        : `Are you sure you want to unblock calls from ${item.name} (${item.number}) on ${device.alias}?`,
      confirmText: isBlocking ? 'Yes, Block Number' : 'Yes, Unblock Number',
      danger: isBlocking,
      onConfirm: () => {
        setCallLogs(callLogs.map(c => c.id === item.id ? { ...c, isBlocked: !c.isBlocked } : c));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  {/* Delete Selected Action Confirmation Modal */}
  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Delete ${selectedIds.length} Selected Call Record(s)`,
      description: `Are you sure you want to permanently delete the selected ${selectedIds.length} call log entry/entries from ${device.alias}? This action cannot be undone.`,
      confirmText: 'Yes, Delete Selected',
      danger: true,
      onConfirm: () => {
        setCallLogs(callLogs.filter(c => !selectedIds.includes(c.id)));
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  {/* Delete All Action Confirmation Modal */}
  const requestDeleteAll = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete All Call History Records',
      description: `WARNING: Are you sure you want to permanently clear ALL call history logs and audio recordings for ${device.alias}?`,
      confirmText: 'Yes, Delete All Call History',
      danger: true,
      onConfirm: () => {
        setCallLogs([]);
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const filteredCalls = callLogs.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.number.includes(searchTerm);
    if (filterDirection === 'incoming') return matchesSearch && c.direction === 'incoming';
    if (filterDirection === 'outgoing') return matchesSearch && c.direction === 'outgoing';
    if (filterDirection === 'missed') return matchesSearch && c.direction === 'missed';
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

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Call History</h1>
          <p className="text-xs text-slate-500">Call logs, SIM slot info, call direction, and cell tower telemetry for {device.alias}</p>
        </div>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
          Total Logs: 142 Calls
        </span>
      </div>

      {/* Top Action Toolbar (OneMonitar Style) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Action Buttons: Refresh, Delete, Delete All, Data Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => console.log('Refreshing call history...')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Refresh</span>
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
              <span>Delete {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</span>
            </button>

            <button 
              onClick={requestDeleteAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete All</span>
            </button>

            {/* Show Data Filter Dropdown */}
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Show all data</option>
              <option value="incoming">Incoming calls only</option>
              <option value="outgoing">Outgoing calls only</option>
              <option value="missed">Missed calls only</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by contact or number..."
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

          <span>Showing {filteredCalls.length} call logs</span>
        </div>

        {/* Call Logs Data Table (Separated Play vs Block Columns) */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredCalls.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="p-3 w-14 text-center">Starred</th>
                <th className="p-3">Direction</th>
                <th className="p-3">Name</th>
                <th className="p-3">Number</th>
                <th className="p-3">SIM Slot</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Cell ID</th>
                <th className="p-3">LAC</th>
                <th className="p-3 text-center">Audio</th>
                <th className="p-3 text-center">Action</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredCalls.map((item) => {
                const isNotConnected = !item.duration || item.duration === '00m 00s' || item.direction === 'missed';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelectRow(item.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => toggleStar(item.id)}
                        className="hover:scale-110 transition-transform"
                        title={item.isStarred ? "Unstar Contact" : "Star Contact"}
                      >
                        <Star className={`w-4 h-4 ${item.isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-300 hover:text-amber-400'}`} />
                      </button>
                    </td>
                    <td className="p-3">
                      {item.direction === 'outgoing' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" /> Outgoing
                        </span>
                      )}
                      {item.direction === 'incoming' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white inline-flex items-center gap-1">
                          <ArrowDownLeft className="w-3 h-3" /> Incoming
                        </span>
                      )}
                      {item.direction === 'missed' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                          <PhoneMissed className="w-3 h-3" /> Missed
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{item.name}</td>
                    <td className="p-3 font-mono text-slate-700">{item.number}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100 whitespace-nowrap">
                        {item.simSlot}
                      </span>
                    </td>
                    <td className="p-3">
                      {isNotConnected ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-medium text-[11px] border border-slate-200/80">
                          Not Connected
                        </span>
                      ) : (
                        <span className="text-slate-700 font-medium">{item.duration}</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {item.cellId ? <span className="text-slate-600">{item.cellId}</span> : <span className="text-slate-300">--</span>}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {item.lac ? <span className="text-slate-600">{item.lac}</span> : <span className="text-slate-300">--</span>}
                    </td>

                    {/* Dedicated Column 1: Audio Playback (Circular Icon-only Button) */}
                    <td className="p-3 text-center">
                      {item.hasAudioRecording && !isNotConnected ? (
                        <button
                          onClick={() => toggleAudio(item.id)}
                          className={`w-9 h-9 rounded-full mx-auto flex items-center justify-center transition-all hover:scale-105 shadow-xs ${
                            playingAudioId === item.id
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                              : 'bg-sky-500 hover:bg-sky-600 text-white'
                          }`}
                          title={playingAudioId === item.id ? "Pause Audio" : "Play Recording"}
                        >
                          {playingAudioId === item.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                        </button>
                      ) : (
                        <span className="text-slate-300 font-mono text-[11px]">--</span>
                      )}
                    </td>

                    {/* Dedicated Column 2: Security Action (Block / Unblock Button) */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => requestToggleBlock(item)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors inline-flex items-center gap-1 ${
                          item.isBlocked
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                        }`}
                      >
                        {item.isBlocked ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Unblock</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-3.5 h-3.5" />
                            <span>Block</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="p-3 text-right text-[11px] text-slate-400 whitespace-nowrap">{item.timestamp}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <span>Showing 1 to {filteredCalls.length} of 142 call logs</span>
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
