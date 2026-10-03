import React, { useState } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { DeviceInfo } from '../types/dashboard.types';

interface MainLayoutProps {
  currentDevice: DeviceInfo;
  availableDevices: DeviceInfo[];
  onSelectDevice: (device: DeviceInfo) => void;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onLogout?: () => void;
  onUpgradeRequired?: (tier: string, featureName: string) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentDevice,
  availableDevices,
  onSelectDevice,
  activeTab,
  onSelectTab,
  onUpgradeRequired,
  children
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen w-screen bg-slate-50 text-slate-900 flex font-sans antialiased overflow-hidden">
      {/* Fixed Independent Sidebar */}
      <Sidebar
        currentDevice={currentDevice}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onUpgradeRequired={onUpgradeRequired}
      />

      {/* Main Workspace Area with Independent Content Scrolling */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Fixed Header Component */}
        <Header
          currentDevice={currentDevice}
          availableDevices={availableDevices}
          onSelectDevice={onSelectDevice}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Independently Scrollable Main Content Container */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {children}
        </main>
      </div>
    </div>
  );
};
