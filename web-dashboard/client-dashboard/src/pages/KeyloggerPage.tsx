import React, { useState } from 'react';
import { 
  Key, 
  RefreshCw, 
  Trash2, 
  Search, 
  Star, 
  AlertTriangle,
  X,
  Filter,
  Smartphone,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface KeyloggerPageProps {
  device: DeviceInfo;
}

interface KeylogItem {
  id: string;
  packageName: string;
  appName: string;
  typedText: string;
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

export const KeyloggerPage: React.FC<KeyloggerPageProps> = ({ device }) => {
  const [keylogs, setKeylogs] = useState<KeylogItem[]>([
    {
      id: 'kl_1',
      packageName: 'com.snapchat.android',
      appName: 'Snapchat',
      typedText: 'Hey, are you free for coffee near central park today?',
      timestamp: '30/08/2026 06:41 pm',
      isStarred: true
    },
    {
      id: 'kl_2',
      packageName: 'com.android.chrome',
      appName: 'Google Chrome',
      typedText: 'best python programming tutorials 2026 advanced agentic ai',
      timestamp: '30/08/2026 05:12 pm',
      isStarred: false
    },
    {
      id: 'kl_3',
      packageName: 'im.thebot.messenger',
      appName: 'Messenger',
      typedText: 'HIS time.',
      timestamp: '30/08/2026 06:22 pm',
      isStarred: false
    },
    {
      id: 'kl_4',
      packageName: 'com.jeevansathi.android',
      appName: 'Jeevansathi',
      typedText: 'Hatter.',
      timestamp: '30/08/2026 02:35 pm',
      isStarred: false
    },
    {
      id: 'kl_5',
      packageName: 'com.whatsapp',
      appName: 'WhatsApp',
      typedText: 'Meeting scheduled for 5 PM at central office. Please bring files.',
      timestamp: '30/08/2026 01:15 pm',
      isStarred: true
    },
    {
      id: 'kl_6',
      packageName: 'com.graymatrix.did',
      appName: 'GrayMatrix App',
      typedText: 'It was.',
      timestamp: '30/08/2026 12:15 pm',
      isStarred: false
    },
    {
      id: 'kl_7',
      packageName: 'com.king.candycrushsaga',
      appName: 'Candy Crush',
      typedText: 'The.',
      timestamp: '30/08/2026 11:43 am',
      isStarred: false
    },
    {
      id: 'kl_8',
      packageName: 'com.UCMobile.intl',
      appName: 'UC Browser',
      typedText: 'online shopping summer sale discounts 2026',
      timestamp: '30/08/2026 11:01 am',
      isStarred: false
    }
  ]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppFilter, setSelectedAppFilter] = useState('all');
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
    if (selectedIds.length === filteredKeylogs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredKeylogs.map(k => k.id));
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
    setKeylogs(keylogs.map(k => k.id === id ? { ...k, isStarred: !k.isStarred } : k));
  };

  {/* Delete Selected Action Confirmation Modal */}
  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Delete ${selectedIds.length} Selected Keylog Record(s)`,
      description: `Are you sure you want to permanently delete the selected ${selectedIds.length} keystroke entry/entries captured from ${device.alias}? This action cannot be undone.`,
      confirmText: 'Yes, Delete Selected',
      danger: true,
      onConfirm: () => {
        setKeylogs(keylogs.filter(k => !selectedIds.includes(k.id)));
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  {/* Delete All Action Confirmation Modal */}
  const requestDeleteAll = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete All Keylogger Records',
      description: `WARNING: Are you sure you want to permanently clear ALL captured keylog streams for ${device.alias}?`,
      confirmText: 'Yes, Delete All Keylogs',
      danger: true,
      onConfirm: () => {
        setKeylogs([]);
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  {/* Extract Unique Packages for Filter Dropdown */}
  const uniquePackages = Array.from(new Set(keylogs.map(k => k.packageName)));

  const filteredKeylogs = keylogs.filter(k => {
    const matchesSearch = k.typedText.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          k.packageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          k.appName.toLowerCase().includes(searchTerm.toLowerCase());
    if (selectedAppFilter !== 'all') {
      return matchesSearch && k.packageName === selectedAppFilter;
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

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Keylogger Telemetry</h1>
          <p className="text-xs text-slate-500">Real-time accessibility service keystroke stream, package sources, and timestamps for {device.alias}</p>
        </div>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
          Total Synced: 142 Keystrokes
        </span>
      </div>

      {/* Top Action Toolbar (OneMonitar Style Alignment) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Action Buttons: Refresh, Delete, Delete All, Package Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => console.log('Refreshing keylog stream...')}
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

            {/* Filter by Package Name Dropdown */}
            <select
              value={selectedAppFilter}
              onChange={(e) => setSelectedAppFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Show all applications</option>
              {uniquePackages.map((pkg) => (
                <option key={pkg} value={pkg}>{pkg}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search package or typed text..."
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

          <span>Showing {filteredKeylogs.length} keystroke records</span>
        </div>

        {/* Keylogger Data Table (OneMonitar Style Alignment) */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredKeylogs.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="p-3 w-14 text-center">Starred</th>
                <th className="p-3">Package</th>
                <th className="p-3 w-1/2">Text</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredKeylogs.map((item) => (
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
                      title={item.isStarred ? "Unstar Keylog" : "Star Keylog"}
                    >
                      <Star className={`w-4 h-4 ${item.isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-300 hover:text-amber-400'}`} />
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[11px] border border-indigo-100 font-semibold">
                        {item.packageName}
                      </span>
                      <span className="text-[11px] text-slate-400">({item.appName})</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-800 font-normal leading-relaxed">{item.typedText}</td>
                  <td className="p-3 text-right text-[11px] text-slate-400 whitespace-nowrap">{item.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <span>Showing 1 to {filteredKeylogs.length} of 142 entries</span>
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
