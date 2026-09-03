import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
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
  Eye,
  Filter,
  Cpu
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
  isSystemApp: boolean;
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
  const defaultApps: InstalledAppItem[] = [
    {
      id: 'app_1',
      label: 'Instagram',
      packageName: 'com.instagram.android',
      version: '280.0.0.18',
      status: 'Installed',
      timestamp: new Date().toLocaleString(),
      isStarred: true,
      isBlocked: false,
      isSystemApp: false,
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.instagram.android'
    },
    {
      id: 'app_2',
      label: 'WhatsApp',
      packageName: 'com.whatsapp',
      version: '2.24.10',
      status: 'Installed',
      timestamp: new Date().toLocaleString(),
      isStarred: true,
      isBlocked: false,
      isSystemApp: false,
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.whatsapp'
    },
    {
      id: 'app_3',
      label: 'Android System UI',
      packageName: 'com.android.systemui',
      version: '14.0.0',
      status: 'Installed',
      timestamp: new Date().toLocaleString(),
      isStarred: false,
      isBlocked: false,
      isSystemApp: true,
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.android.systemui'
    }
  ];

  const [apps, setApps] = useState<InstalledAppItem[]>(defaultApps);

  // Poll live Installed Applications telemetry from NestJS PostgreSQL backend
  useEffect(() => {
    let isMounted = true;
    const fetchLiveApps = async () => {
      try {
        const live = await apiService.getInstalledApps(device.id, []);
        if (isMounted && Array.isArray(live) && live.length > 0) {
          const formatted: InstalledAppItem[] = live.map((a: any, i: number) => ({
            id: a.id || `live_app_${i}`,
            label: a.label || a.appName || a.packageName,
            packageName: a.packageName,
            version: a.version || a.versionName || '1.0.0',
            status: a.status || 'Installed',
            timestamp: new Date(a.timestamp || Date.now()).toLocaleString(),
            isStarred: false,
            isBlocked: Boolean(a.isBlocked),
            isSystemApp: Boolean(a.isSystemApp),
            playStoreUrl: a.playStoreUrl || `https://play.google.com/store/apps/details?id=${a.packageName}`
          }));
          setApps(formatted);
        }
      } catch (err) {
        console.warn('Failed to fetch live installed applications:', err);
      }
    };

    fetchLiveApps();
    const interval = setInterval(fetchLiveApps, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [device.id]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('user'); // Default to User Apps
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
      onConfirm: async () => {
        const newBlockedState = !item.isBlocked;
        await apiService.toggleAppBlock({
          deviceId: device.id,
          packageName: item.packageName,
          appName: item.label,
          isBlocked: newBlockedState
        });
        setApps(apps.map(a => a.id === item.id ? { 
          ...a, 
          isBlocked: newBlockedState, 
          status: newBlockedState ? 'Removed' : 'Installed' 
        } : a));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

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

  const userAppsCount = apps.filter(a => !a.isSystemApp).length;
  const systemAppsCount = apps.filter(a => a.isSystemApp).length;

  const filteredApps = apps.filter(a => {
    const matchesSearch = a.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.packageName.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === 'user') return matchesSearch && !a.isSystemApp;
    if (filterStatus === 'system') return matchesSearch && a.isSystemApp;
    if (filterStatus === 'installed') return matchesSearch && a.status === 'Installed';
    if (filterStatus === 'blocked') return matchesSearch && (a.status === 'Removed' || a.isBlocked);
    if (filterStatus === 'updated') return matchesSearch && a.status === 'Updated';
    return matchesSearch; // 'all'
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
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
            User Apps: {userAppsCount}
          </span>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-semibold">
            System Apps: {systemAppsCount}
          </span>
        </div>
      </div>

      {/* Top Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
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

            {/* Filter Dropdown with System App Filter Option */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="user">User Downloaded Apps Only ({userAppsCount})</option>
                <option value="all">Show All Apps (User + System: {apps.length})</option>
                <option value="system">System Apps Only ({systemAppsCount})</option>
                <option value="installed">Installed Status Only</option>
                <option value="blocked">Blocked / Removed Only</option>
              </select>
            </div>
          </div>

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

          <span>Showing {filteredApps.length} installed applications ({filterStatus === 'user' ? 'User Apps' : filterStatus === 'system' ? 'System Apps' : 'All Apps'})</span>
        </div>

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
                <th className="p-3">Type</th>
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
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-sm shrink-0 ${
                        item.isSystemApp 
                          ? 'bg-slate-100 text-slate-600 border-slate-200' 
                          : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                      }`}>
                        {item.label.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{item.label}</span>
                        <span className="font-mono text-[11px] text-slate-400 block">{item.packageName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    {item.isSystemApp ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-slate-400" />
                        <span>System</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-emerald-500" />
                        <span>User App</span>
                      </span>
                    )}
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
          <span>Showing 1 to {filteredApps.length} of {apps.length} installed applications</span>
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
