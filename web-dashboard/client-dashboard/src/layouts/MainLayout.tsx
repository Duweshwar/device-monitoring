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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
      {/* Decoupled Sidebar Component */}
      <Sidebar
        currentDevice={currentDevice}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Decoupled Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
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

        {/* Fluid Page Content Workspace Area */}
        <main className="p-4 sm:p-6 lg:p-8 w-full space-y-6 transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
};
