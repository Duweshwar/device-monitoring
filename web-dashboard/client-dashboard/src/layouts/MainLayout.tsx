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
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentDevice,
  availableDevices,
  onSelectDevice,
  activeTab,
  onSelectTab,
  children
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased overflow-x-hidden">
      {/* Decoupled Sidebar Component */}
      <Sidebar
        currentDevice={currentDevice}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Decoupled Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
        {/* Decoupled Header Component */}
        <Header
          currentDevice={currentDevice}
          availableDevices={availableDevices}
          onSelectDevice={onSelectDevice}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Dynamic Page Container */}
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-7xl w-full mx-auto flex flex-col gap-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
