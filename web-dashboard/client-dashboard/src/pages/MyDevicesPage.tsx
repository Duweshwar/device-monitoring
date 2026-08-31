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
  CheckCircle2
} from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface MyDevicesPageProps {
  availableDevices: DeviceInfo[];
  currentDevice: DeviceInfo;
  onSelectDevice: (device: DeviceInfo) => void;
  onNavigateTab: (tabId: string) => void;
}

export const MyDevicesPage: React.FC<MyDevicesPageProps> = ({
  availableDevices,
  currentDevice,
  onSelectDevice,
  onNavigateTab
}) => {
  const [addDeviceModalOpen, setAddDeviceModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Confirmation Modal for Add Device */}
      {addDeviceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Add Target Device</h3>
                <p className="text-xs text-slate-500">Pair new Android phone or tablet</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              To pair a new device, download the Parantel Agent APK on the target device, open the application, and enter your License Pairing Key: <span className="font-mono font-bold text-indigo-600">PAR-2026-9810</span>.
            </p>
            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-900 font-medium">
              💡 Need step-by-step help? Follow the Android Installation Video guide in your onboarding email.
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

      {/* Confirmation Modal for Transfer License */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Transfer License</h3>
                <p className="text-xs text-slate-500">Reassign active plan to another device</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Transferring your active <span className="font-semibold text-slate-900">allinone-pro</span> license will deactivate real-time telemetry on <span className="font-semibold text-slate-900">{currentDevice.alias}</span> and generate a new pairing QR code for the target phone.
            </p>
            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setTransferModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Transfer request initiated. Instructions sent to email.');
                  setTransferModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
              >
                Proceed Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Title & Top Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Devices</h1>
          <p className="text-xs text-slate-500">Manage paired target devices, active licenses, and device transfer settings</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddDeviceModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Device</span>
          </button>

          <button
            onClick={() => setTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs"
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
            <span>Device Transfer</span>
          </button>
        </div>
      </div>

      {/* Devices Full-Width Horizontal List View Stack (Restored Indigo & Slate Palette) */}
      <div className="space-y-4">
        {availableDevices.map((dev) => {
          const isSelected = dev.id === currentDevice.id;

          return (
            <div
              key={dev.id}
              className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md ${
                isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Left: Circular Green Android Hardware Avatar */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="w-16 h-16 rounded-full bg-emerald-100/90 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-xs">
                  <Smartphone className="w-8 h-8" />
                </div>
              </div>

              {/* Center Column 1: Device Alias, IMEI, Expiry Date */}
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900 leading-tight">{dev.alias}</h3>
                  <span className="text-xs text-slate-500 font-mono">({dev.model})</span>
                  {isSelected && (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-200">
                      Active Selected
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-indigo-900">📱 IMEI:</span>
                    <span className="font-mono text-slate-800">{dev.imei}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-indigo-900">🕒 Expiry:</span>
                    <span className="text-slate-800 font-medium">2029-05-19 13:02:47</span>
                  </div>
                </div>
              </div>

              {/* Center Column 2: Package License & Last Connected */}
              <div className="space-y-1.5 min-w-0 flex-1 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-indigo-700 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Package:
                  </span>
                  <span className="font-bold text-slate-900 font-mono">allinone-pro</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-rose-600 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Last Connected:
                  </span>
                  <span className="text-slate-800 font-medium">{dev.lastConnected}</span>
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

              {/* Right Column: Indigo Dashboard Button */}
              <div className="shrink-0 flex flex-col items-center justify-center gap-1 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 w-full md:w-auto">
                <button
                  onClick={() => {
                    onSelectDevice(dev);
                    onNavigateTab('dashboard');
                  }}
                  className="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all hover:scale-105 flex items-center justify-center"
                  title="Open Telemetry Dashboard"
                >
                  <BarChart2 className="w-6 h-6" />
                </button>
                <span className="text-xs font-bold text-indigo-900">Dashboard</span>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
