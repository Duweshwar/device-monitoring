import React from 'react';
import { MapPin, Navigation, Compass, ShieldCheck, Maximize2 } from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface LiveMapWidgetProps {
  device: DeviceInfo;
  onOpenFullMap: () => void;
}

export const LiveMapWidget: React.FC<LiveMapWidgetProps> = ({ device, onOpenFullMap }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Live GPS Location Preview — {device.alias}</h3>
            <p className="text-xs text-slate-500">{device.model} • Geofence Active</p>
          </div>

        </div>
        <button
          onClick={onOpenFullMap}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Full Map</span>
        </button>
      </div>

      {/* Visual Map Canvas Placeholder / Tile Mock */}
      <div className="relative w-full h-56 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center group">
        {/* Decorative Grid Lines to simulate map */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />
        
        {/* Decorative Road Paths */}
        <svg className="absolute inset-0 w-full h-full text-slate-300/80" stroke="currentColor" fill="none" strokeWidth="3">
          <path d="M-20 40 Q 100 120, 250 80 T 500 200" />
          <path d="M 120 -20 L 120 300" strokeWidth="4" className="text-slate-300" />
          <circle cx="120" cy="80" r="40" className="text-emerald-500/10 stroke-emerald-500/40" strokeDasharray="4 4" strokeWidth="2" />
        </svg>

        {/* Live GPS Pin Overlay */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-white shadow-lg flex items-center justify-center text-white animate-bounce">
              <Navigation className="w-4 h-4 fill-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
          </div>

          <div className="mt-2 bg-slate-900/90 text-white px-3 py-1 rounded-lg shadow-md text-xs font-medium backdrop-blur-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>28.6139° N, 77.2090° E</span>
          </div>
        </div>

        {/* Map Bottom Status Strip */}
        <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-md border border-slate-200/80 text-[11px] flex items-center justify-between shadow-xs">
          <span className="text-slate-600 font-medium flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-indigo-600" /> Speed: 0 km/h (Stationary)
          </span>
          <span className="text-emerald-600 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Inside Home Geofence
          </span>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Address: Connaught Place, New Delhi</span>
        <span className="font-medium text-slate-700">Accuracy: ~5m</span>
      </div>
    </div>
  );
};
