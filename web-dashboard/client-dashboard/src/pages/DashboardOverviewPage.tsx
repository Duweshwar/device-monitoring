import React from 'react';
import { DeviceStatusBanner } from '../components/DeviceStatusBanner';
import { FeatureTileGrid } from '../components/FeatureTileGrid';
import { LiveMapWidget } from '../components/LiveMapWidget';
import { RecentActivityFeed } from '../components/RecentActivityFeed';
import { CallHistoryAndContactsWidget } from '../components/CallHistoryAndContactsWidget';
import { DeviceInfo, MetricSummary, ActivityEvent } from '../types/dashboard.types';

interface DashboardOverviewPageProps {
  device: DeviceInfo;
  metrics: MetricSummary;
  activityEvents: ActivityEvent[];
  onSelectFeature: (featureId: string) => void;
  onRefreshDevice: () => void;
}

export const DashboardOverviewPage: React.FC<DashboardOverviewPageProps> = ({
  device,
  metrics,
  activityEvents,
  onSelectFeature,
  onRefreshDevice
}) => {
  return (
    <div className="space-y-6">
      {/* Top Protection Banner Alert */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-sm">
            <span className="px-2 py-0.5 rounded bg-white/20 text-xs uppercase tracking-wider">
              ALL-IN-ONE PRO
            </span>
            <span>Active Protection & Telemetry Real-Time Stream</span>
          </div>
          <p className="text-xs text-amber-100 mt-1">
            Monitoring WhatsApp, Call Recordings, Live Location, Keylogger, Photos, App Blocker & Web Filtering in one unified portal.
          </p>
        </div>
        <button className="px-4 py-2 bg-white text-orange-800 hover:bg-orange-50 rounded-lg text-xs font-bold shadow-xs transition-all shrink-0">
          Upgrade Subscription
        </button>
      </div>

      {/* 1. Device Information & Security Banner */}
      <DeviceStatusBanner
        device={device}
        onRefresh={onRefreshDevice}
      />

      {/* 2. Feature Tile Grid (4-Column Layout) */}
      <FeatureTileGrid
        metrics={metrics}
        onSelectFeature={onSelectFeature}
      />

      {/* 3. Live Map Preview & Real-Time Event Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveMapWidget
          device={device}
          onOpenFullMap={() => onSelectFeature('location')}
        />
        <RecentActivityFeed
          events={activityEvents}
          onViewAll={() => onSelectFeature('keylogger')}
        />
      </div>

      {/* 4. Detailed Telemetry Tables: Call History, Call Recordings, Contacts (3-Column Layout) */}
      <CallHistoryAndContactsWidget
        device={device}
        onSelectFeature={onSelectFeature}
      />
    </div>
  );
};
