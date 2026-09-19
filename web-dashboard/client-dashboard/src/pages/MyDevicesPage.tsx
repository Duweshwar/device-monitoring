import React, { useState } from 'react';
import { 
  Smartphone, 
  PlusCircle, 
  ArrowRightLeft, 
  BarChart2, 
  ShieldCheck, 
  Calendar, 
  Wifi, 
  Battery, 
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Download,
  AlertCircle,
  Zap,
  Info,
  X,
  RefreshCw,
  Check,
  Key,
  Copy,
  ShoppingCart
} from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface MyDevicesPageProps {
  availableDevices: DeviceInfo[];
  userLicenses?: any[];
  currentDevice: DeviceInfo;
  onSelectDevice: (device: DeviceInfo) => void;
  onNavigateTab: (tabId: string) => void;
}

interface UpdateModalState {
  isOpen: boolean;
  device: DeviceInfo | null;
  version: string;
  updateType: 'mandatory' | 'optional';
  releaseNotes: string;
  isUpdating: boolean;
  progressStep: number;
}

export const MyDevicesPage: React.FC<MyDevicesPageProps> = ({
  availableDevices,
  userLicenses = [],
  currentDevice,
  onSelectDevice,
  onNavigateTab
}) => {
  const [addDeviceModalOpen, setAddDeviceModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filter unassigned licenses
  const unassignedLicenses = userLicenses.filter(
    l => l.status === 'UNASSIGNED' || !l.assignedDevice || !l.assignedDeviceId
  );

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  {/* Remote OTA Update Modal State */}
  const [updateModal, setUpdateModal] = useState<UpdateModalState>({
    isOpen: false,
    device: null,
    version: 'v8.2.0',
    updateType: 'optional',
    releaseNotes: 'Includes Call Recording separation, enhanced location triangulation accuracy, and memory optimizations.',
    isUpdating: false,
    progressStep: 0
  });

  {/* Simulate Remote OTA Installation Stream */}
  const handleStartUpdate = async () => {
    setUpdateModal(prev => ({ ...prev, isUpdating: true, progressStep: 1 }));

    try {
      const deviceId = updateModal.device?.id || currentDevice?.id || 'ac7189fd-ec87-40a0-9f8a-4d93e01aa73a';
      await fetch('http://localhost:3000/api/v1/updates/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });
    } catch (e) {
      console.warn('Backend update trigger error:', e);
    }

    setTimeout(() => setUpdateModal(prev => ({ ...prev, progressStep: 2 })), 1200);
    setTimeout(() => setUpdateModal(prev => ({ ...prev, progressStep: 3 })), 2400);
    setTimeout(() => setUpdateModal(prev => ({ ...prev, progressStep: 4 })), 3600);
    setTimeout(() => {
      setUpdateModal(prev => ({ ...prev, isUpdating: false, progressStep: 5 }));
    }, 4800);
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {/* Super Admin Mandatory Update Info Banner */}
      <div className="bg-slate-900 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-100">Super Admin Remote Update Engine</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider">
                Active MDM / Device Owner
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Mandatory patches auto-install silently on check-in. Optional updates are parent-decided from this panel.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <span>Server Release:</span>
          <span className="font-mono text-emerald-400 font-bold">v8.2.0 (Build 220)</span>
        </div>
      </div>

      {/* Confirmation Modal for Add Device */}
      {addDeviceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Add Target Device</h3>
                <p className="text-xs text-slate-500">Pair new Android phone or tablet</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              To pair a new device, download the ChildCare Agent APK on the target device, open the application, and enter your License Key below:
            </p>
            
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-center space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Available License Key</span>
              <div className="font-mono font-extrabold text-xl text-indigo-400 tracking-widest">
                {unassignedLicenses[0]?.licenseKey || `LIC-2026-${Math.floor(100000 + Math.random() * 900000)}`}
              </div>
              <span className="text-[10px] text-slate-400 block">Valid for 365 Days • Unassigned Plan</span>
            </div>

            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-900 font-medium">
              💡 Open ChildCare Agent App on target phone ➔ Login ➔ Enter License Key.
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setAddDeviceModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Title & Top Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">My Devices & Licenses</h1>
          <p className="text-xs text-slate-500">Manage paired target devices, unassigned active licenses, and remote updates</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('buynow')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Buy New License Plan</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Unassigned / Available Purchased License Keys (Modern Indigo/Slate Styling) */}
      {unassignedLicenses.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-indigo-600" />
              <span>Unassigned Purchased Licenses ({unassignedLicenses.length})</span>
            </h2>
            <span className="text-[10px] text-indigo-800 font-bold bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              Ready to pair on target Android phone
            </span>
          </div>

          {/* Outer White Container matching Paired Devices section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3">
            {unassignedLicenses.map((lic) => (
              <div
                key={lic.id || lic.licenseKey}
                className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-300 transition-all w-full"
              >
                {/* Left: License Badge & Plan Info */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider border border-indigo-200">
                      UNASSIGNED PLAN
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Expires: {new Date(lic.expiresAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {lic.planName || 'ChildCare All-in-One Pro (12 Months)'}
                  </h3>

                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Download ChildCare Agent app on target phone ➔ Open app ➔ Select this License to activate.</span>
                  </p>
                </div>

                {/* Right: Sleek License Key Box with Copy Action */}
                <div className="w-full sm:w-auto shrink-0 bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400 block">
                      LICENSE KEY
                    </span>
                    <span className="font-mono font-extrabold text-sm sm:text-base text-indigo-950 tracking-wider">
                      {lic.licenseKey}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyKey(lic.licenseKey)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-98"
                  >
                    {copiedKey === lic.licenseKey ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-white" />
                        <span>Copy Key</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: Paired & Active Devices List */}
      <div className="space-y-2.5">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
          <span>Paired Target Devices ({availableDevices.length})</span>
        </h2>

        {availableDevices.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 space-y-2 shadow-xs">
            <Smartphone className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="text-xs">No active devices paired yet. Download ChildCare Agent app on your child's phone and select your license key during login.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3">
            {availableDevices.map((dev) => {
              const isSelected = dev.id === currentDevice.id;

              return (
                <div
                  key={dev.id}
                  className={`bg-white border rounded-xl p-4 shadow-xs transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5 hover:shadow-md ${
                    isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-12 h-12 rounded-full bg-emerald-100/90 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                      <Smartphone className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Device Info */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900 leading-tight">{dev.alias}</h3>
                      <span className="text-xs text-slate-500 font-mono">({dev.model})</span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-200">
                          Active Selected
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-indigo-900">IMEI:</span>
                        <span className="font-mono text-slate-800">{dev.imei}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-indigo-900">Status:</span>
                        <span className="text-emerald-700 font-bold">Active Protection</span>
                      </div>
                    </div>
                  </div>

                  {/* App Version & Status */}
                  <div className="space-y-1 min-w-0 flex-1 border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-indigo-700 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" /> App Version:
                      </span>
                      <span className="font-bold text-slate-900 font-mono">{dev.appVersion || 'v8.2.0'}</span>
                    </div>

                    <div className="flex items-center gap-3 pt-0.5 text-xs text-slate-500">
                      <span className={`flex items-center gap-1 font-semibold ${dev.isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${dev.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        {dev.isOnline ? 'Online' : 'Offline'}
                      </span>
                      <span>•</span>
                      <span>Battery {dev.batteryLevel}%</span>
                    </div>
                  </div>

                  {/* Dashboard Button */}
                  <div className="shrink-0 flex flex-col items-center justify-center gap-0.5 border-t md:border-t-0 border-slate-100 pt-2 md:pt-0 w-full md:w-auto">
                    <button
                      onClick={() => {
                        onSelectDevice(dev);
                        onNavigateTab('dashboard');
                      }}
                      className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center justify-center"
                      title="Open Telemetry Dashboard"
                    >
                      <BarChart2 className="w-5 h-5" />
                    </button>
                    <span className="text-[11px] font-bold text-indigo-900">Dashboard</span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
