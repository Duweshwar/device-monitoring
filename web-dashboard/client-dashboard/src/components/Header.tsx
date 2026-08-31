import React, { useState } from 'react';
import { 
  Smartphone, 
  BatteryCharging, 
  Bell, 
  User, 
  ChevronDown,
  MessageSquare,
  PhoneCall,
  MapPin,
  Mic,
  Image as ImageIcon,
  Key,
  Lock,
  Globe,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  HelpCircle,
  LogOut,
  Menu,
  Headphones,
  ShieldCheck,
  Check
} from 'lucide-react';
import { DeviceInfo } from '../types/dashboard.types';

interface HeaderProps {
  currentDevice: DeviceInfo;
  availableDevices: DeviceInfo[];
  onSelectDevice: (device: DeviceInfo) => void;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDevice,
  availableDevices,
  onSelectDevice,
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse
}) => {
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [supportDropdownOpen, setSupportDropdownOpen] = useState(false);
  const [isSupportGranted, setIsSupportGranted] = useState(false);

  const quickRibbonItems = [
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, badge: '24' },
    { id: 'calls', label: 'Call Recs', icon: PhoneCall, badge: '12' },
    { id: 'location', label: 'Live GPS', icon: MapPin, badge: 'Live' },
    { id: 'surround', label: 'Live Audio', icon: Mic, badge: 'Stream' },
    { id: 'photos', label: 'Photos', icon: ImageIcon, badge: '8' },
    { id: 'keylogger', label: 'Keylogger', icon: Key, badge: '142' },
    { id: 'appblock', label: 'App Blocker', icon: Lock, badge: '3 Rules' },
    { id: 'webfilter', label: 'Web Filter', icon: Globe, badge: 'Active' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Main Navigation Bar (Fluid Full Width) */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: Sidebar Hamburger Toggle + Device Selector */}
          <div className="flex items-center gap-3">
            {/* Hamburger / Sidebar Toggle Button */}
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Device Selector Component */}
            <div className="relative">
              <button
                onClick={() => {
                  setDeviceDropdownOpen(!deviceDropdownOpen);
                  setUserDropdownOpen(false);
                  setSupportDropdownOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 bg-slate-50/80 hover:bg-indigo-50/50 transition-all text-left"
              >
                <div className="relative">
                  <Smartphone className="w-5 h-5 text-indigo-600" />
                  <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${currentDevice.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{currentDevice.alias}</span>
                    <span className="text-xs text-slate-500">({currentDevice.model})</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <BatteryCharging className="w-3 h-3" /> {currentDevice.batteryLevel}%
                    </span>
                    <span>•</span>
                    <span>Android {currentDevice.androidVersion}</span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
              </button>

              {/* Device Dropdown Menu */}
              {deviceDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 divide-y divide-slate-100">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Select Target Device
                  </div>
                  {availableDevices.map((dev) => (
                    <button
                      key={dev.id}
                      onClick={() => {
                        onSelectDevice(dev);
                        setDeviceDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 text-sm ${dev.id === currentDevice.id ? 'bg-indigo-50/60 font-medium text-indigo-900' : 'text-slate-700'}`}
                    >
                      <div>
                        <div className="font-medium text-slate-900">{dev.alias}</div>
                        <div className="text-xs text-slate-500">{dev.model} • Android {dev.androidVersion}</div>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${dev.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Support Access, Notifications & User Profile */}
          <div className="flex items-center gap-3">

            {/* Support Agent Access Trigger Button (ChyldMonitor / OneMonitar Style) */}
            <div className="relative">
              <button
                onClick={() => {
                  setSupportDropdownOpen(!supportDropdownOpen);
                  setDeviceDropdownOpen(false);
                  setUserDropdownOpen(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
                  isSupportGranted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-rose-50/70 hover:bg-rose-100/70 text-rose-700 border-rose-200'
                }`}
                title="Technical Support Account Access"
              >
                <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs shadow-xs">
                  <Headphones className="w-3.5 h-3.5" />
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {/* Support Access Modal Popup Menu */}
              {supportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4 space-y-3 text-left">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Headphones className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Technical Help Access</h4>
                      <p className="text-[11px] text-slate-500 leading-snug mt-1">
                        Only click below button when asked by support team to share temporary account access for technical help and provide them your UID.
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Viewing UID:</span>
                    <span className="font-mono font-bold text-slate-900">396QK528359</span>
                  </div>

                  <button
                    onClick={() => setIsSupportGranted(!isSupportGranted)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                      isSupportGranted
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-sky-500 hover:bg-sky-600 text-white'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSupportGranted ? 'Support Access Active (Revoke)' : 'Grant Support Access'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <button className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
            </button>

            {/* Top Right User Profile Dropdown Menu */}
            <div className="relative pl-2 border-l border-slate-200">
              <button
                onClick={() => {
                  setUserDropdownOpen(!userDropdownOpen);
                  setDeviceDropdownOpen(false);
                  setSupportDropdownOpen(false);
                }}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600 border border-indigo-200 flex items-center justify-center text-white font-semibold text-sm shadow-xs">
                  A
                </div>
                <span className="hidden md:inline text-sm font-medium text-slate-700">Ayesha (Demo)</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* User Dropdown Popup Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 divide-y divide-slate-100">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">Ayesha Demo Account</p>
                    <p className="text-[11px] text-slate-500">ayesha@example.com</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onSelectTab('dashboard');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                    >
                      <LayoutDashboard className="w-4 h-4 text-slate-400" />
                      <span>Dashboard</span>
                    </button>
                    <button
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Account Settings</span>
                    </button>
                    <button
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                    >
                      <ShoppingCart className="w-4 h-4 text-indigo-600" />
                      <span>Buy Now / Renew</span>
                    </button>
                    <button
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>Help / Live-Chat</span>
                    </button>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      <span>Log Out</span>
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Horizontal Quick-Access Icon Ribbon (Fluid Full Width) */}
      <div className="border-t border-slate-100 bg-slate-50/70 overflow-x-auto no-scrollbar">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2 min-w-max">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 hidden sm:inline">
            Quick Actions:
          </span>
          {quickRibbonItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-indigo-600'}`} />
                <span>{item.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
