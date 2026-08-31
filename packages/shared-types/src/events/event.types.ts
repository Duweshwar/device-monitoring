export enum CollectionMethod {
  ANDROID_API = 'android_api',
  NOTIFICATION = 'notification',
  ACCESSIBILITY = 'accessibility',
  MEDIA = 'media',
  DEVICE_POLICY = 'device_policy',
  USER_ACTION = 'user_action',
}

export enum EventSource {
  LOCATION = 'location',
  CALLS = 'calls',
  SMS = 'sms',
  CONTACTS = 'contacts',
  APP_USAGE = 'app_usage',
  KEYLOGGER = 'keylogger',
  BROWSER = 'browser',
  SCREENSHOTS = 'screenshots',
  WHATSAPP = 'whatsapp',
  INSTAGRAM = 'instagram',
  TELEGRAM = 'telegram',
  SIGNAL = 'signal',
  SNAPCHAT = 'snapchat',
  MESSENGER = 'messenger',
  SKYPE = 'skype',
  VIBER = 'viber',
  SYSTEM = 'system',
}

export interface NormalizedEvent<T = Record<string, any>> {
  eventId: string;
  deviceId: string;
  familyId?: string;
  organizationId?: string;
  source: EventSource | string;
  eventType: string;
  timestamp: string;
  collectionMethod: CollectionMethod;
  payload: T;
  deviceMetadata?: {
    batteryLevel?: number;
    isCharging?: boolean;
    networkType?: string;
    appVersion?: string;
  };
}
