export enum RestrictionType {
  APP_BLOCK = 'APP_BLOCK',
  WEB_CATEGORY_BLOCK = 'WEB_CATEGORY_BLOCK',
  DOMAIN_BLOCK = 'DOMAIN_BLOCK',
  SCREEN_TIME_LIMIT = 'SCREEN_TIME_LIMIT',
  GEOFENCE_ALERT = 'GEOFENCE_ALERT',
}

export interface AppRestrictionRule {
  id: string;
  deviceId: string;
  packageName: string;
  appName: string;
  isBlocked: boolean;
  dailyTimeLimitMinutes?: number;
}

export interface WebFilterRule {
  id: string;
  deviceId: string;
  domainOrUrl: string;
  category?: string;
  action: 'ALLOW' | 'BLOCK';
}

export interface GeofenceRule {
  id: string;
  deviceId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  alertOnEntry: boolean;
  alertOnExit: boolean;
}
