export enum SseEventType {
  LOCATION_UPDATE = 'LOCATION_UPDATE',
  BATTERY_STATUS = 'BATTERY_STATUS',
  TELEMETRY_INGESTED = 'TELEMETRY_INGESTED',
  GEOFENCE_BREACH = 'GEOFENCE_BREACH',
  UNAUTHORIZED_APP_ALERT = 'UNAUTHORIZED_APP_ALERT',
  COMMAND_ACK = 'COMMAND_ACK',
  AGENT_HEARTBEAT = 'AGENT_HEARTBEAT',
}

export interface SseStreamEvent<T = any> {
  id: string;
  type: SseEventType;
  deviceId: string;
  timestamp: string;
  data: T;
}

export interface PushCommandPayload {
  commandId: string;
  action: 'SYNC_NOW' | 'START_SURROUND_RECORDING' | 'TAKE_SCREENSHOT' | 'UPDATE_POLICY' | 'LOCK_DEVICE';
  parameters?: Record<string, any>;
  issuedAt: string;
}
