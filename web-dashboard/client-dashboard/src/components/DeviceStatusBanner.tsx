import React from 'react';
import { 
  Smartphone, 
  RefreshCw, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Info, 
  PackageCheck
} from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface DeviceStatusBannerProps {
  device: DeviceInfo;
  onRefresh: () => void;
}

export const DeviceStatusBanner: React.FC<DeviceStatusBannerProps> = ({ device, onRefresh }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      
      {/* 1. Product Information Card (Left) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <PackageCheck className="w-4 h-4 text-indigo-600" />
            Product Information
          </h3>
          <button 
            className="flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-md transition-colors border border-indigo-200/80"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Renew</span>
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">History Retention:</span>
            <span className="font-semibold text-slate-900">365 Days</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Package:</span>
            <span className="font-semibold text-indigo-600">Allinone-pro</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Expiry:</span>
            <span className="font-semibold text-emerald-600">in 3 years</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Device Name:</span>
            <span className="font-semibold text-slate-800">{device.alias || 'No name Given'}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="text-slate-600 font-medium">Last Connected:</span>
            <span className="font-semibold text-slate-800">{device.lastConnected}</span>
          </div>
        </div>
      </div>

      {/* 2. Device Information Card (Middle) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-indigo-600" />
            Device Information
          </h3>
          <button 
            onClick={onRefresh}
            className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
            title="Refresh Device Info"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Model:</span>
            <span className="font-semibold text-slate-900">{device.model}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Android:</span>
            <span className="font-semibold text-slate-900">{device.androidVersion}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">IMEI:</span>
            <span className="font-mono font-semibold text-slate-800">{device.imei}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">SIM Operator:</span>
            <span className="font-semibold text-slate-900">{device.simOperator}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="text-slate-600 font-medium">App Version:</span>
            <span className="font-semibold text-indigo-600">{device.appVersion}</span>
          </div>
        </div>
      </div>

      {/* 3. More Information Card (Right) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-600" />
            More Information
          </h3>
          <button 
            onClick={onRefresh}
            className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
            title="Refresh Security Status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Battery Optimization:</span>
            <span className={`font-semibold flex items-center gap-1 ${device.capabilities.batteryExempt ? 'text-slate-700' : 'text-amber-600'}`}>
              {device.capabilities.batteryExempt ? 'No (Exempt)' : 'Yes'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Accessibility:</span>
            {device.capabilities.accessibility ? (
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> On
              </span>
            ) : (
              <span className="flex items-center gap-1 font-semibold text-rose-600">
                <XCircle className="w-3.5 h-3.5" /> Off
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">GPS:</span>
            {device.capabilities.gps ? (
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> On
              </span>
            ) : (
              <span className="flex items-center gap-1 font-semibold text-slate-500">
                Off
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Sim Serial No:</span>
            <span className="font-mono text-[11px] font-semibold text-slate-800">89918720400022610479</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="text-slate-600 font-medium">Command:</span>
            <span className="flex items-center gap-1 font-semibold text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" /> Push
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
