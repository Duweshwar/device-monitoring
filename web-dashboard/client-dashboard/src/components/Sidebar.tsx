import React from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  PhoneCall, 
  Disc,
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
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface SidebarProps {
  currentDevice: DeviceInfo;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentDevice,
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse
}) => {
  const navSections = [
    {
      title: 'GENERAL FEATURES',
      items: [
        { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
        { id: 'location', label: 'Live Location & GPS', icon: MapPin },
        { id: 'calls', label: 'Call History', icon: PhoneCall },
        { id: 'recordings', label: 'Call Recordings', icon: Disc },
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
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shrink-0 min-h-screen transition-all duration-300 relative z-20`}>
      
      {/* Brand Header */}
      <div className={`p-4 border-b border-slate-800 flex items-center justify-between ${isCollapsed ? 'justify-center px-2' : ''}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md font-bold text-lg shrink-0">
            P
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-slate-100 text-base leading-tight truncate">Parantel Guard</h1>
              <p className="text-[11px] text-slate-400 truncate">Enterprise & Parental</p>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition-colors hidden md:flex items-center justify-center"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* User Profile Header */}
      <div className={`p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center gap-3 ${isCollapsed ? 'justify-center px-2' : ''}`}>
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-slate-700 shrink-0">
          👤
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 block">Welcome,</span>
            <span className="font-semibold text-slate-100 text-sm truncate block">Ayesha (Demo)</span>
          </div>
        )}
      </div>

      {/* Highlighted Last Sync Bar */}
      {!isCollapsed ? (
        <div className="bg-slate-950 px-4 py-2 text-xs text-slate-300 font-medium flex items-center justify-center gap-1.5 border-b border-slate-800">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>Last Sync:</span>
          <span className="text-emerald-400 font-semibold italic">Just now</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
        </div>
      ) : (
        <div className="bg-slate-950 py-2 flex justify-center border-b border-slate-800" title="Last Sync: Just now">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      )}

      {/* Device Management Section */}
      <div className="p-3 space-y-1 border-b border-slate-800">
        {!isCollapsed && (
          <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            DATA & DEVICE MANAGEMENT
          </div>
        )}

        {/* Active Selected Device Item */}
        <button
          onClick={() => onSelectTab('dashboard')}
          title={isCollapsed ? currentDevice.alias : ''}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'} rounded-lg text-xs font-medium bg-slate-800 text-slate-100 border border-slate-700/80`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
            {!isCollapsed && <span className="truncate font-semibold">{currentDevice.alias}</span>}
          </div>
          {!isCollapsed && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Premium
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('devices')}
          title={isCollapsed ? "My Devices / License" : ''}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-1.5'} rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'devices'
              ? 'bg-indigo-600 text-white font-semibold'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
          }`}
        >
          <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
          {!isCollapsed && <span>My Devices / License</span>}
        </button>

        <button
          onClick={() => onSelectTab('devices')}
          title={isCollapsed ? "Add Device" : ''}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-1.5'} rounded-lg text-xs text-slate-300 hover:bg-slate-800/80 hover:text-slate-100 transition-colors`}
        >
          <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          {!isCollapsed && <span>Add Device</span>}
        </button>

        <button
          onClick={() => onSelectTab('devices')}
          title={isCollapsed ? "Device Transfer" : ''}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-1.5'} rounded-lg text-xs text-slate-300 hover:bg-slate-800/80 hover:text-slate-100 transition-colors`}
        >
          <Repeat className="w-4 h-4 text-indigo-400 shrink-0" />
          {!isCollapsed && <span>Device Transfer</span>}
        </button>
      </div>

      {/* Buy Now & Renew Section */}
      <div className="p-3 space-y-1 border-b border-slate-800">
        {!isCollapsed && (
          <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            BUY NOW & RENEW
          </div>
        )}
        <button
          title={isCollapsed ? "Buy Now" : ''}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-1.5'} rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/10 font-medium transition-colors`}
        >
          <ShoppingCart className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Buy Now</span>}
        </button>
        <button
          title={isCollapsed ? "Renew Subscription" : ''}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-1.5'} rounded-lg text-xs text-indigo-400 hover:bg-indigo-500/10 font-medium transition-colors`}
        >
          <RotateCw className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Renew Subscription</span>}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 px-3 py-3 space-y-6 overflow-y-auto">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={isCollapsed ? item.label : ''}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'} rounded-lg text-xs font-medium transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold' 
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge && (
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
        {isCollapsed ? 'v1.0' : 'v1.0.0 Enterprise • SQLCipher'}
      </div>
    </aside>
  );
};
