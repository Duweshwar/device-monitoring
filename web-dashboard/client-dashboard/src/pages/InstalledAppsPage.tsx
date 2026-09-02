import React, { useState } from 'react';
import { 
  AppWindow, 
  RefreshCw, 
  Trash2, 
  Ban, 
  CheckCircle2, 
  Search, 
  Star, 
  AlertTriangle,
  X,
  ExternalLink,
  Smartphone,
  Eye
} from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface InstalledAppsPageProps {
  device: DeviceInfo;
}

interface InstalledAppItem {
  id: string;
  label: string;
  packageName: string;
  version: string;
  status: 'Installed' | 'Removed' | 'Updated';
  timestamp: string;
  isStarred: boolean;
  isBlocked: boolean;
  playStoreUrl: string;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText: string;
  danger: boolean;
  onConfirm: () => void;
}

export const InstalledAppsPage: React.FC<InstalledAppsPageProps> = ({ device }) => {
  const [apps, setApps] = useState<InstalledAppItem[]>([
    {
      id: 'app_1',
      label: 'WeChat',
      packageName: 'com.tencent.mm',
      version: '12.09',
      status: 'Removed',
      timestamp: '31/08/2026 04:35 pm',
      isStarred: false,
      isBlocked: true,
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.tencent.mm'
    },
    {
      id: 'app_2',
      label: 'ZEE5 Movies & Shows',
      packageName: 'com.zee5.android',
      version: '11.2.96',
      status: 'Removed',
      timestamp: '31/08/2026 03:16 pm',
      isStarred: false,
      isBlocked: true,
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.zee5.android'
    },
    {
      id: 'app_3',
      label: 'UC Browser',
      packageName: 'com.UCMobile.intl',
      version: '1.09',
      status: 'Removed',
      timestamp: '31/08/2026 02:56 pm',
      isStarred: false,
      isBlocked: true,
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.UCMobile.intl'
    },
    {
      id: 'app_4',
      label: 'Tango Live Stream',
      packageName: 'com.sgiggle.production',
      version: '3.1',
      status: 'Installed',
      timestamp: '31/08/2026 10:57 am',
      isStarred: true,
      isBlocked: false,
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.sgiggle.production'
    },
    {
      id: 'app_5',
      label: 'Instagram',
      packageName: 'com.instagram.android',
      version: '280.0.0.18',
      status: 'Updated',
      timestamp: '31/08/2026 09:44 am',
      isStarred: true,
      isBlocked: false,
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.instagram.android'
    },
    {
      id: 'app_6',
      label: 'Snapchat',
      packageName: 'com.snapchat.android',
      version: '12.45.0.32',
      status: 'Installed',
      timestamp: '31/08/2026 07:47 am',
      isStarred: true,
      isBlocked: false,
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.snapchat.android'
    },
    {
      id: 'app_7',
      label: 'Subway Surfers',
      packageName: 'com.kiloo.subwaysurf',
      version: '3.12.0',
      status: 'Installed',
      timestamp: '30/08/2026 08:20 pm',
      isStarred: false,
      isBlocked: false,
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.kiloo.subwaysurf'
    }
  ]);

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
    if (selectedIds.length === filteredApps.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApps.map(a => a.id));
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
    setApps(apps.map(a => a.id === id ? { ...a, isStarred: !a.isStarred } : a));
  };

  {/* Block / Unblock Action Confirmation Modal */}
  const requestToggleBlock = (item: InstalledAppItem) => {
    const isBlocking = !item.isBlocked;
    setConfirmModal({
      isOpen: true,
      title: isBlocking ? `Block Application: ${item.label}` : `Unblock Application: ${item.label}`,
      description: isBlocking
        ? `Are you sure you want to enforce a Device Owner policy block on ${item.label} (${item.packageName}) on ${device.alias}? The target phone will immediately restrict app access.`
        : `Are you sure you want to lift the block on ${item.label} (${item.packageName}) on ${device.alias}?`,
      confirmText: isBlocking ? 'Yes, Enforce Block' : 'Yes, Lift Block',
      danger: isBlocking,
      onConfirm: () => {
        setApps(apps.map(a => a.id === item.id ? { 
          ...a, 
          isBlocked: !a.isBlocked, 
          status: !a.isBlocked ? 'Removed' : 'Installed' 
        } : a));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  {/* Delete Selected Action Confirmation Modal */}
  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Delete ${selectedIds.length} Selected App Record(s)`,
      description: `Are you sure you want to permanently delete the selected ${selectedIds.length} app record(s) from ${device.alias}? This action cannot be undone.`,
      confirmText: 'Yes, Delete Selected',
      danger: true,
      onConfirm: () => {
        setApps(apps.filter(a => !selectedIds.includes(a.id)));
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  {/* Delete All Action Confirmation Modal */}
  const requestDeleteAll = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete All Installed App Telemetry Data',
      description: `WARNING: Are you sure you want to permanently clear ALL installed application telemetry records for ${device.alias}?`,
      confirmText: 'Yes, Delete All App Data',
      danger: true,
      onConfirm: () => {
        setApps([]);
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const filteredApps = apps.filter(a => {
    const matchesSearch = a.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.packageName.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === 'installed') return matchesSearch && a.status === 'Installed';
    if (filterStatus === 'blocked') return matchesSearch && (a.status === 'Removed' || a.isBlocked);
    if (filterStatus === 'updated') return matchesSearch && a.status === 'Updated';
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Installed Applications</h1>
          <p className="text-xs text-slate-500">Inventory of installed apps, versions, block policy controls, and store links for {device.alias}</p>
        </div>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
          Total Inventory: 78 Apps
        </span>
      </div>

      {/* Top Action Toolbar (OneMonitar Style Alignment) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Action Buttons: Refresh, Delete, Delete All, Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => console.log('Refreshing installed applications...')}
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

            {/* App Status Filter Dropdown */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Show all data</option>
              <option value="installed">Installed apps only</option>
              <option value="blocked">Blocked / Removed apps only</option>
              <option value="updated">Updated apps only</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search app or package name..."
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

          <span>Showing {filteredApps.length} installed applications</span>
        </div>

        {/* Installed Applications Data Table (OneMonitar Style Alignment) */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredApps.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="p-3 w-14 text-center">Starred</th>
                <th className="p-3">Label</th>
                <th className="p-3">Version</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Play Store</th>
                <th className="p-3 text-center">Action</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredApps.map((item) => (
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
                      title={item.isStarred ? "Unstar Application" : "Star Application"}
                    >
                      <Star className={`w-4 h-4 ${item.isStarred ? 'fill-amber-400 text-amber-500' : 'text-slate-300 hover:text-amber-400'}`} />
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-sm shrink-0">
                        {item.label.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{item.label}</span>
                        <span className="font-mono text-[11px] text-slate-400 block">{item.packageName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-slate-600">{item.version}</td>
                  <td className="p-3">
                    {item.status === 'Installed' && (
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white shadow-2xs">
                        Installed
                      </span>
                    )}
                    {item.status === 'Removed' && (
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-600 text-white shadow-2xs">
                        Removed
                      </span>
                    )}
                    {item.status === 'Updated' && (
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-white shadow-2xs">
                        Updated
                      </span>
                    )}
                  </td>

                  {/* Play Store View Link Column (OneMonitar Style Indigo/Brownish View Button) */}
                  <td className="p-3 text-center">
                    <a
                      href={item.playStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all inline-flex items-center gap-1"
                      title="View on Google Play Store"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </a>
                  </td>

                  {/* Dedicated Action Column (Block / Unblock Button) */}
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

        {/* Bottom Pagination */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <span>Showing 1 to {filteredApps.length} of 78 installed applications</span>
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
