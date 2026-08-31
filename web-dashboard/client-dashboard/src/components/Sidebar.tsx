import React from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  PhoneCall, 
  MessageSquare, 
  Users, 
  Image as ImageIcon, 
  Camera, 
  Key, 
  Globe, 
  Mic, 
  Radio, 
  ShieldAlert, 
  Lock, 
  Sliders, 
  Smartphone,
  PlusCircle,
  Repeat,
  ShoppingCart,
  RotateCw,
  Info
} from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface SidebarProps {
  currentDevice: DeviceInfo;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentDevice,
  activeTab,
  onSelectTab
}) => {
  const navSections = [
    {
      title: 'GENERAL FEATURES',
      items: [
        { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
        { id: 'location', label: 'Live Location & GPS', icon: MapPin },
        { id: 'calls', label: 'Call Logs & Recordings', icon: PhoneCall },
        { id: 'sms', label: 'SMS Telemetry', icon: MessageSquare },
        { id: 'contacts', label: 'Contacts Inventory', icon: Users },
      ]
    },
    {
      title: 'SOCIAL & MESSAGING',
      items: [
        { id: 'whatsapp', label: 'WhatsApp & WA Business', icon: MessageSquare, badge: 'Full' },
        { id: 'instagram', label: 'Instagram DMs', icon: MessageSquare },
        { id: 'telegram', label: 'Telegram Messenger', icon: MessageSquare },
        { id: 'social_other', label: 'FB, Signal & Other Apps', icon: MessageSquare },
      ]
    },
    {
      title: 'MEDIA & LOGS',
      items: [
        { id: 'photos', label: 'Photos & Captures', icon: ImageIcon },
        { id: 'screenshots', label: 'Periodic Screenshots', icon: Camera },
        { id: 'keylogger', label: 'Keylogger Stream', icon: Key },
        { id: 'webfilter', label: 'Web Safety & History', icon: Globe },
      ]
    },
    {
      title: 'LIVE STREAMING',
      items: [
        { id: 'surround', label: 'Live Surround Audio', icon: Mic, badge: 'Live' },
        { id: 'livestream', label: 'Live Screen & Camera', icon: Radio, badge: 'Phase 3' },
      ]
    },
    {
      title: 'POLICIES & MDM',
      items: [
        { id: 'appblock', label: 'App Blocker & Limits', icon: Lock },
        { id: 'geofence', label: 'Geofence Radius Rules', icon: ShieldAlert },
        { id: 'settings', label: 'Device Policy Settings', icon: Sliders },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md font-bold text-lg">
          P
        </div>
        <div>
          <h1 className="font-bold text-slate-100 text-base leading-tight">Parantel Guard</h1>
          <p className="text-[11px] text-slate-400">Enterprise & Parental Monitoring</p>
        </div>
      </div>

      {/* User Profile Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-slate-700 shrink-0">
          👤
        </div>
        <div className="min-w-0">
          <span className="text-[11px] text-slate-400 block">Welcome,</span>
          <span className="font-semibold text-slate-100 text-sm truncate block">Ayesha (Demo)</span>
        </div>
      </div>

      {/* Highlighted Last Sync Bar (OneMonitar Style) */}
      <div className="bg-slate-950 px-4 py-2 text-xs text-slate-300 font-medium flex items-center justify-center gap-1.5 border-b border-slate-800">
        <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span>Last Sync:</span>
        <span className="text-emerald-400 font-semibold italic">Just now</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
      </div>

      {/* Device Management Section (ChyldMonitor Style) */}
      <div className="p-3 space-y-1 border-b border-slate-800">
        <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          DATA & DEVICE MANAGEMENT
        </div>

        {/* Active Selected Device Item */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-100 border border-slate-700/80"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate font-semibold">{currentDevice.alias}</span>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Premium
          </span>
        </button>

        <button
          onClick={() => onSelectTab('add_device')}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/80 hover:text-slate-100 transition-colors"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Add Device</span>
        </button>

        <button
          onClick={() => onSelectTab('my_devices')}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/80 hover:text-slate-100 transition-colors"
        >
          <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
          <span>My Devices / License</span>
        </button>

        <button
          onClick={() => onSelectTab('device_transfer')}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/80 hover:text-slate-100 transition-colors"
        >
          <Repeat className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Device Transfer</span>
        </button>
      </div>

      {/* Buy Now & Renew Section */}
      <div className="p-3 space-y-1 border-b border-slate-800">
        <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          BUY NOW & RENEW
        </div>
        <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/10 font-medium transition-colors">
          <ShoppingCart className="w-4 h-4 shrink-0" />
          <span>Buy Now</span>
        </button>
        <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-indigo-400 hover:bg-indigo-500/10 font-medium transition-colors">
          <RotateCw className="w-4 h-4 shrink-0" />
          <span>Renew Subscription</span>
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 px-3 py-3 space-y-6 overflow-y-auto">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold' 
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer System Version */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
        v1.0.0 Enterprise • SQLCipher & TLS 1.3
      </div>
    </aside>
  );
};
