import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { 
  Globe, 
  RefreshCw, 
  Trash2, 
  Ban, 
  CheckCircle2, 
  Search, 
  Star, 
  AlertTriangle,
  X,
  ExternalLink,
  ShieldAlert,
  Compass,
  Bookmark
} from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface WebHistoryPageProps {
  device: DeviceInfo;
}

interface WebHistoryItem {
  id: string;
  title: string;
  url: string;
  domain: string;
  visitCount: number;
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

export const WebHistoryPage: React.FC<WebHistoryPageProps> = ({ device }) => {
  const defaultHistory: WebHistoryItem[] = [
    {
      id: 'wh_1',
      title: 'Google Search - Android Parental Monitoring',
      url: 'https://www.google.com/search?q=parental+monitoring',
      domain: 'google.com',
      visitCount: 3,
      timestamp: new Date().toLocaleString(),
      isStarred: true,
      isBlocked: false
    }
  ];

  const [webHistory, setWebHistory] = useState<WebHistoryItem[]>(defaultHistory);

  // Poll live Web History telemetry from NestJS PostgreSQL backend
  useEffect(() => {
    let isMounted = true;
    const fetchLiveHistory = async () => {
      try {
        const [live, webRules] = await Promise.all([
          apiService.getWebHistory(device.id, []),
          apiService.getWebRules(device.id)
        ]);

        const blockedSet = new Set((webRules || []).filter((r: any) => r.isBlocked).map((r: any) => r.domain));

        if (isMounted && Array.isArray(live) && live.length > 0) {
          const formatted: WebHistoryItem[] = live.map((w: any, i: number) => {
            const domainStr = w.domain || (w.url ? new URL(w.url.startsWith('http') ? w.url : `https://${w.url}`).hostname : '');
            return {
              id: w.id || `live_wh_${i}`,
              title: w.title || domainStr || 'Web Page',
              url: w.url || '',
              domain: domainStr,
              visitCount: w.visitCount || 1,
              timestamp: new Date(w.timestamp || Date.now()).toLocaleString(),
              isStarred: Boolean(w.isStarred),
              isBlocked: blockedSet.has(domainStr) || Boolean(w.isBlocked)
            };
          });
          setWebHistory(formatted);
        }
      } catch (err) {
        console.warn('Failed to fetch live web history:', err);
      }
    };

    fetchLiveHistory();
    const interval = setInterval(fetchLiveHistory, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [device.id]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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
    if (selectedIds.length === filteredHistory.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredHistory.map(w => w.id));
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
    setWebHistory(webHistory.map(w => w.id === id ? { ...w, isStarred: !w.isStarred } : w));
  };

  const requestToggleBlock = (item: WebHistoryItem) => {
    const isBlocking = !item.isBlocked;
    setConfirmModal({
      isOpen: true,
      title: isBlocking ? `Block Domain: ${item.domain}` : `Unblock Domain: ${item.domain}`,
      description: isBlocking
        ? `Are you sure you want to enforce a web filter block on domain ${item.domain} for ${device.alias}? All browser access to this domain will be blocked.`
        : `Are you sure you want to unblock access to ${item.domain} for ${device.alias}?`,
      confirmText: isBlocking ? 'Yes, Enforce Domain Block' : 'Yes, Lift Domain Block',
      danger: isBlocking,
      onConfirm: async () => {
        const newBlockedState = !item.isBlocked;
        await apiService.toggleWebBlock({
          deviceId: device.id,
          domain: item.domain,
          isBlocked: newBlockedState
        });
        setWebHistory(webHistory.map(w => w.id === item.id ? { ...w, isBlocked: newBlockedState } : w));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Delete ${selectedIds.length} Selected Web History Record(s)`,
      description: `Are you sure you want to permanently delete the selected ${selectedIds.length} web history log entry/entries recorded for ${device.alias}? This action cannot be undone.`,
      confirmText: 'Yes, Delete Selected',
      danger: true,
      onConfirm: () => {
        setWebHistory(webHistory.filter(w => !selectedIds.includes(w.id)));
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const requestDeleteAll = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete All Internet History Data',
      description: `WARNING: Are you sure you want to permanently clear ALL web browsing history records for ${device.alias}?`,
      confirmText: 'Yes, Delete All Web History',
      danger: true,
      onConfirm: () => {
        setWebHistory([]);
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const filteredHistory = webHistory.filter(w => {
    const matchesSearch = w.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          w.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          w.domain.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === 'blocked') return matchesSearch && w.isBlocked;
    if (filterStatus === 'starred') return matchesSearch && w.isStarred;
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Internet History</h1>
          <p className="text-xs text-slate-500">Tracked web browsing logs, visited URLs, domain blocking, and search history for {device.alias}</p>
        </div>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
          Total Synced: {webHistory.length} Entries
        </span>
      </div>

      {/* Top Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => console.log('Refreshing internet history...')}
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Show all data</option>
              <option value="blocked">Blocked domains only</option>
              <option value="starred">Starred entries only</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, URL, or domain..."
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

          <span>Showing {filteredHistory.length} web history records</span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredHistory.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="p-3 w-14 text-center">Starred</th>
                <th className="p-3 w-64 min-w-[220px]">Title</th>
                <th className="p-3 w-72 min-w-[260px]">URL / Domain</th>
                <th className="p-3 text-center">Action</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredHistory.map((item) => (
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
                      title={item.isStarred ? "Unstar Web Entry" : "Star Web Entry"}
                    >
                      <Star className={`w-4 h-4 ${item.isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-300 hover:text-amber-400'}`} />
                    </button>
                  </td>
                  <td className="p-3 w-64 min-w-[220px]">
                    <span className="font-bold text-slate-900 leading-snug block">{item.title}</span>
                  </td>
                  <td className="p-3 w-72 min-w-[260px]">
                    <a
                      href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:text-sky-800 font-mono text-xs font-medium flex items-center gap-1 hover:underline truncate max-w-xs block"
                      title={item.url}
                    >
                      <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0 inline" />
                      <span className="truncate">{item.url}</span>
                    </a>
                  </td>

                  <td className="p-3 text-center">
                    <button
                      onClick={() => requestToggleBlock(item)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors inline-flex items-center gap-1 ${
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
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <span>Showing 1 to {filteredHistory.length} of {webHistory.length} web history records</span>
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
