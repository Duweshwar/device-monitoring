import { Injectable, Optional } from '@nestjs/common';
import { Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

export interface PolicyChangeEvent {
  deviceId: string;
  type: 'APP' | 'CALL' | 'WEB' | 'GEOFENCE' | 'MEDIA';
  timestamp: number;
  payload?: any;
}

export interface AppBlockDto {
  deviceId: string;
  packageName: string;
  appName?: string;
  isBlocked: boolean;
}

export interface CallBlockDto {
  deviceId: string;
  phoneNumber: string;
  contactName?: string;
  isBlocked: boolean;
}

export interface WebBlockDto {
  deviceId: string;
  domain: string;
  isBlocked: boolean;
}

export interface GeofenceRuleDto {
  id?: string;
  deviceId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  alertOnEntry: boolean;
  alertOnExit: boolean;
}

@Injectable()
export class PolicyService {
  // Real-time SSE Policy Event Stream
  public readonly policyEvents$ = new Subject<PolicyChangeEvent>();

  private emitPolicyChange(deviceId: string, type: 'APP' | 'CALL' | 'WEB' | 'GEOFENCE' | 'MEDIA', payload?: any) {
    this.policyEvents$.next({ deviceId, type, timestamp: Date.now(), payload });
  }

  public emitMediaEvent(deviceId: string, payload: any) {
    this.emitPolicyChange(deviceId, 'MEDIA', payload);
  }

  // In-Memory Policy Rule Fallback Stores
  private appRulesStore = new Map<string, Map<string, AppBlockDto>>();
  private callRulesStore = new Map<string, Map<string, CallBlockDto>>();
  private webRulesStore = new Map<string, Map<string, WebBlockDto>>();
  private geofenceRulesStore = new Map<string, GeofenceRuleDto[]>();

  constructor(@Optional() private readonly prisma?: PrismaService) {
    // Seed initial rules for demo device dev_01
    const dev01Apps = new Map<string, AppBlockDto>([
      ['com.pubg.imobile', { deviceId: 'dev_01', packageName: 'com.pubg.imobile', appName: 'BGMI / PUBG Mobile', isBlocked: true }],
      ['com.zhiliaoapp.musically', { deviceId: 'dev_01', packageName: 'com.zhiliaoapp.musically', appName: 'TikTok', isBlocked: true }]
    ]);
    this.appRulesStore.set('dev_01', dev01Apps);

    const dev01Calls = new Map<string, CallBlockDto>([
      ['+19998887777', { deviceId: 'dev_01', phoneNumber: '+19998887777', contactName: 'Spam Telemarketer', isBlocked: true }]
    ]);
    this.callRulesStore.set('dev_01', dev01Calls);

    const dev01Web = new Map<string, WebBlockDto>([
      ['arcade-zone-unblocked-2026.net', { deviceId: 'dev_01', domain: 'arcade-zone-unblocked-2026.net', isBlocked: true }],
      ['restricted-social-hub.example.com', { deviceId: 'dev_01', domain: 'restricted-social-hub.example.com', isBlocked: true }]
    ]);
    this.webRulesStore.set('dev_01', dev01Web);

    this.geofenceRulesStore.set('dev_01', [
      {
        id: 'geo_01',
        deviceId: 'dev_01',
        name: 'Home Safety Zone',
        latitude: 28.6139,
        longitude: 77.2090,
        radiusMeters: 500,
        alertOnEntry: true,
        alertOnExit: true
      }
    ]);
  }

  // 1. App Blocking Policy (Persists via Prisma AppRestriction model)
  async toggleAppBlock(dto: AppBlockDto) {
    let deviceAppMap = this.appRulesStore.get(dto.deviceId);
    if (!deviceAppMap) {
      deviceAppMap = new Map();
      this.appRulesStore.set(dto.deviceId, deviceAppMap);
    }
    deviceAppMap.set(dto.packageName, dto);

    if (this.prisma) {
      try {
        await this.prisma.appRestriction.upsert({
          where: { deviceId_packageName: { deviceId: dto.deviceId, packageName: dto.packageName } },
          update: { isBlocked: dto.isBlocked, appName: dto.appName || dto.packageName },
          create: { deviceId: dto.deviceId, packageName: dto.packageName, appName: dto.appName || dto.packageName, isBlocked: dto.isBlocked }
        });
      } catch (err) {
        console.warn(`[Prisma Fallback] AppRestriction upsert warning: ${err.message}`);
      }
    }

    console.log(`[Policy Engine] Device ${dto.deviceId}: App ${dto.packageName} block status set to ${dto.isBlocked}`);
    this.emitPolicyChange(dto.deviceId, 'APP');
    return { success: true, rule: dto };
  }

  async getAppRules(deviceId: string) {
    if (this.prisma) {
      try {
        const rules = await this.prisma.appRestriction.findMany({ where: { deviceId } });
        if (rules && rules.length > 0) {
          return rules.map(r => ({
            deviceId: r.deviceId,
            packageName: r.packageName,
            appName: r.appName,
            isBlocked: r.isBlocked
          }));
        }
      } catch (err) {
        console.warn(`[Prisma Fallback] AppRestriction query warning: ${err.message}`);
      }
    }
    const map = this.appRulesStore.get(deviceId);
    return map ? Array.from(map.values()) : [];
  }

  // 2. Call Blocking Policy
  async toggleCallBlock(dto: CallBlockDto) {
    let deviceCallMap = this.callRulesStore.get(dto.deviceId);
    if (!deviceCallMap) {
      deviceCallMap = new Map();
      this.callRulesStore.set(dto.deviceId, deviceCallMap);
    }
    deviceCallMap.set(dto.phoneNumber, dto);

    console.log(`[Policy Engine] Device ${dto.deviceId}: Call ${dto.phoneNumber} block status set to ${dto.isBlocked}`);
    this.emitPolicyChange(dto.deviceId, 'CALL');
    return { success: true, rule: dto };
  }

  async getCallRules(deviceId: string) {
    const map = this.callRulesStore.get(deviceId);
    return map ? Array.from(map.values()) : [];
  }

  // 3. Web Domain Filtering Policy (Persists via Prisma WebFilterRule model)
  async toggleWebBlock(dto: WebBlockDto) {
    let deviceWebMap = this.webRulesStore.get(dto.deviceId);
    if (!deviceWebMap) {
      deviceWebMap = new Map();
      this.webRulesStore.set(dto.deviceId, deviceWebMap);
    }
    deviceWebMap.set(dto.domain, dto);

    if (this.prisma) {
      try {
        await this.prisma.webFilterRule.upsert({
          where: { deviceId_domainOrUrl: { deviceId: dto.deviceId, domainOrUrl: dto.domain } },
          update: { action: dto.isBlocked ? 'BLOCK' : 'ALLOW' },
          create: { deviceId: dto.deviceId, domainOrUrl: dto.domain, action: dto.isBlocked ? 'BLOCK' : 'ALLOW' }
        });
      } catch (err) {
        console.warn(`[Prisma Fallback] WebFilterRule upsert warning: ${err.message}`);
      }
    }

    console.log(`[Policy Engine] Device ${dto.deviceId}: Domain ${dto.domain} block status set to ${dto.isBlocked}`);
    this.emitPolicyChange(dto.deviceId, 'WEB');
    return { success: true, rule: dto };
  }

  async getWebRules(deviceId: string) {
    if (this.prisma) {
      try {
        const rules = await this.prisma.webFilterRule.findMany({ where: { deviceId } });
        if (rules && rules.length > 0) {
          return rules.map(r => ({
            deviceId: r.deviceId,
            domain: r.domainOrUrl,
            isBlocked: r.action === 'BLOCK'
          }));
        }
      } catch (err) {
        console.warn(`[Prisma Fallback] WebFilterRule query warning: ${err.message}`);
      }
    }
    const map = this.webRulesStore.get(deviceId);
    return map ? Array.from(map.values()) : [];
  }

  // 4. Geofence Radius Rules Policy (Persists via Prisma GeofenceRule model)
  async saveGeofenceRule(dto: GeofenceRuleDto) {
    const rules = this.geofenceRulesStore.get(dto.deviceId) || [];
    const ruleId = dto.id || `geo_${Date.now().toString(36)}`;
    const newRule = { ...dto, id: ruleId };

    const index = rules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      rules[index] = newRule;
    } else {
      rules.push(newRule);
    }
    this.geofenceRulesStore.set(dto.deviceId, rules);

    if (this.prisma) {
      try {
        await this.prisma.geofenceRule.create({
          data: {
            deviceId: dto.deviceId,
            name: dto.name,
            latitude: dto.latitude,
            longitude: dto.longitude,
            radiusMeters: dto.radiusMeters,
            alertOnEntry: dto.alertOnEntry,
            alertOnExit: dto.alertOnExit
          }
        });
      } catch (err) {
        console.warn(`[Prisma Fallback] GeofenceRule save warning: ${err.message}`);
      }
    }

    console.log(`[Policy Engine] Device ${dto.deviceId}: Saved Geofence Rule "${dto.name}" (${dto.radiusMeters}m radius)`);
    return { success: true, rule: newRule };
  }

  async deleteGeofenceRule(deviceId: string, ruleId: string) {
    const rules = this.geofenceRulesStore.get(deviceId) || [];
    const filtered = rules.filter(r => r.id !== ruleId);
    this.geofenceRulesStore.set(deviceId, filtered);

    if (this.prisma) {
      try {
        await this.prisma.geofenceRule.delete({ where: { id: ruleId } });
      } catch (err) {
        console.warn(`[Prisma Fallback] GeofenceRule delete warning: ${err.message}`);
      }
    }

    return { success: true, remaining: filtered.length };
  }

  async getGeofences(deviceId: string) {
    if (this.prisma) {
      try {
        const rules = await this.prisma.geofenceRule.findMany({ where: { deviceId } });
        if (rules && rules.length > 0) {
          return rules.map(r => ({
            id: r.id,
            deviceId: r.deviceId,
            name: r.name,
            latitude: r.latitude,
            longitude: r.longitude,
            radiusMeters: r.radiusMeters,
            alertOnEntry: r.alertOnEntry,
            alertOnExit: r.alertOnExit
          }));
        }
      } catch (err) {
        console.warn(`[Prisma Fallback] GeofenceRule query warning: ${err.message}`);
      }
    }
    return this.geofenceRulesStore.get(deviceId) || [];
  }
}
