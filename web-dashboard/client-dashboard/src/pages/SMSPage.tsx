import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { 
  MessageSquare, 
  RefreshCw, 
  Trash2, 
  Ban, 
  CheckCircle2, 
  Search, 
  Star, 
  AlertTriangle,
  X,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface SMSPageProps {
  device: DeviceInfo;
}

interface SMSLogItem {
  id: string;
  name: string;
  number: string;
  direction: 'incoming' | 'outgoing';
  simSlot: string;
  body: string;
  timestamp: string;
  isStarred: boolean;
  isBlocked: boolean;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string;
  danger: boolean;
  onConfirm: () => void;
}

export const SMSPage: React.FC<SMSPageProps> = ({ device }) => {
  const defaultLogs: SMSLogItem[] = [
    {
      id: 'sms_1',
      name: 'Elmore Sipes',
      number: '(829) 430-2000',
      direction: 'incoming',
      simSlot: 'SIM 1 (Airtel)',
      body: 'Meeting scheduled for 5 PM at central office. Please bring project files.',
      timestamp: '30/08/2026 08:03 pm',
      isStarred: false,
      isBlocked: false
    },
    {
      id: 'sms_2',
      name: 'Mr. Lavon Monahan',
      number: '412-226-7034',
      direction: 'incoming',
      simSlot: 'SIM 1 (Airtel)',
      body: 'Your bank verification code is 492108. Do not share this OTP with anyone.',
      timestamp: '30/08/2026 06:12 pm',
      isStarred: true,
      isBlocked: false
    }
  ];

  const [smsLogs, setSmsLogs] = useState<SMSLogItem[]>(defaultLogs);

  // Poll live real-time SMS logs from NestJS PostgreSQL backend
  useEffect(() => {
    let isMounted = true;
    const fetchLiveSms = async () => {
      try {
        const live = await apiService.getSms(device.id, []);
        if (isMounted && Array.isArray(live) && live.length > 0) {
          const formatted: SMSLogItem[] = live.map((s: any, i: number) => ({
            id: s.id || `live_sms_${i}`,
            name: s.contactName || 'Target Contact',
            number: s.phoneNumber || 'Unknown',
            direction: ((s.direction || 'incoming').toLowerCase()) as any,
            simSlot: 'SIM 1 (Airtel)',
            body: s.body || s.messageBody || '',
            timestamp: new Date(s.timestamp || Date.now()).toLocaleString(),
            isStarred: false,
            isBlocked: false
          }));
          setSmsLogs(formatted);
        }
      } catch (err) {
        console.warn('Failed to fetch live SMS logs:', err);
      }
    };

    fetchLiveSms();
    const interval = setInterval(fetchLiveSms, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [device.id]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirection, setFilterDirection] = useState('all');
  const [pageSize, setPageSize] = useState(10);

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    danger: true,
    onConfirm: () => {},
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSms.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSms.map(s => s.id));
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
    setSmsLogs(smsLogs.map(s => s.id === id ? { ...s, isStarred: !s.isStarred } : s));
  };

  const requestToggleBlock = (item: SMSLogItem) => {
    const isBlocking = !item.isBlocked;
    setConfirmModal({
      isOpen: true,
      title: isBlocking ? `Block Number: ${item.name}` : `Unblock Number: ${item.name}`,
      description: isBlocking
        ? `Are you sure you want to block incoming calls and SMS from ${item.name} (${item.number}) on ${device.alias}?`
        : `Are you sure you want to unblock SMS from ${item.name} (${item.number}) on ${device.alias}?`,
      confirmText: isBlocking ? 'Yes, Block Number' : 'Yes, Unblock Number',
      danger: isBlocking,
      onConfirm: () => {
        setSmsLogs(smsLogs.map(s => s.id === item.id ? { ...s, isBlocked: !s.isBlocked } : s));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Delete ${selectedIds.length} Selected SMS Message(s)`,
      description: `Are you sure you want to permanently delete the selected ${selectedIds.length} SMS entry/entries from ${device.alias}? This action cannot be undone.`,
      confirmText: 'Yes, Delete Selected',
      danger: true,
      onConfirm: () => {
        setSmsLogs(smsLogs.filter(s => !selectedIds.includes(s.id)));
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const requestDeleteAll = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete All SMS Telemetry Records',
      description: `WARNING: Are you sure you want to permanently clear ALL SMS message logs for ${device.alias}?`,
      confirmText: 'Yes, Delete All SMS Logs',
      danger: true,
      onConfirm: () => {
        setSmsLogs([]);
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const filteredSms = smsLogs.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.number.includes(searchTerm) || 
                          s.body.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterDirection === 'incoming') return matchesSearch && s.direction === 'incoming';
    if (filterDirection === 'outgoing') return matchesSearch && s.direction === 'outgoing';
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">SMS Telemetry</h1>
          <p className="text-xs text-slate-500">Incoming & outgoing SMS text messages, SIM slot info, and timestamps for {device.alias}</p>
        </div>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
          Total Synced: {smsLogs.length} Messages
        </span>
      </div>

      {/* Top Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => console.log('Refreshing SMS history...')}
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

            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Show all data</option>
              <option value="incoming">Incoming SMS only</option>
              <option value="outgoing">Outgoing SMS only</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by contact, number or text..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

        </div>

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

          <span>Showing {filteredSms.length} SMS messages</span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredSms.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="p-3 w-14 text-center">Starred</th>
                <th className="p-3">Direction</th>
                <th className="p-3">Name</th>
                <th className="p-3">Number</th>
                <th className="p-3">SIM Slot</th>
                <th className="p-3 w-2/5">Text</th>
                <th className="p-3 text-center">Action</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredSms.map((item) => (
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
                  </td>
                  <td className="p-3 font-semibold text-slate-900">{item.name}</td>
                  <td className="p-3 font-mono text-slate-700">{item.number}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[11px] border border-indigo-100 whitespace-nowrap">
                      {item.simSlot}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700 leading-relaxed font-normal">{item.body}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => requestToggleBlock(item)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors inline-flex items-center gap-1 ${
                        item.isBlocked
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                      }`}
                    >
                      {item.isBlocked ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Unblock</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-3 h-3" />
                          <span>Block</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-3 text-right text-[11px] text-slate-400 whitespace-nowrap">{item.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <span>Showing 1 to {filteredSms.length} of {smsLogs.length} entries</span>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="px-3 py-1 rounded bg-indigo-600 text-white text-xs font-semibold">
              1
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
