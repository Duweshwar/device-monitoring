import { Injectable, NotFoundException } from '@nestjs/common';

export interface AppBlockDto {
  deviceId: string;
  packageName: string;
  appName: string;
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
  // In-Memory Policy Rule Stores
  private appRulesStore = new Map<string, Map<string, AppBlockDto>>();
  private webRulesStore = new Map<string, Map<string, WebBlockDto>>();
  private geofenceRulesStore = new Map<string, GeofenceRuleDto[]>();

  constructor() {
    // Seed initial rules for demo device dev_01
    const dev01Apps = new Map<string, AppBlockDto>([
      ['com.pubg.imobile', { deviceId: 'dev_01', packageName: 'com.pubg.imobile', appName: 'BGMI / PUBG Mobile', isBlocked: true }],
      ['com.zhiliaoapp.musically', { deviceId: 'dev_01', packageName: 'com.zhiliaoapp.musically', appName: 'TikTok', isBlocked: true }]
    ]);
    this.appRulesStore.set('dev_01', dev01Apps);

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
      },
      {
        id: 'geo_02',
        deviceId: 'dev_01',
        name: 'School Campus Radius',
        latitude: 28.5355,
        longitude: 77.3910,
        radiusMeters: 1000,
        alertOnEntry: true,
        alertOnExit: true
      }
    ]);
  }

  // 1. App Blocking Policy
  async toggleAppBlock(dto: AppBlockDto) {
    let deviceAppMap = this.appRulesStore.get(dto.deviceId);
    if (!deviceAppMap) {
      deviceAppMap = new Map();
      this.appRulesStore.set(dto.deviceId, deviceAppMap);
    }

    deviceAppMap.set(dto.packageName, dto);
    console.log(`[Policy Engine] Device ${dto.deviceId}: App ${dto.packageName} block status set to ${dto.isBlocked}`);
    return { success: true, rule: dto };
  }

  async getAppRules(deviceId: string) {
    const map = this.appRulesStore.get(deviceId);
    return map ? Array.from(map.values()) : [];
  }

  // 2. Web Domain Filtering Policy
  async toggleWebBlock(dto: WebBlockDto) {
    let deviceWebMap = this.webRulesStore.get(dto.deviceId);
    if (!deviceWebMap) {
      deviceWebMap = new Map();
      this.webRulesStore.set(dto.deviceId, deviceWebMap);
    }

    deviceWebMap.set(dto.domain, dto);
    console.log(`[Policy Engine] Device ${dto.deviceId}: Domain ${dto.domain} block status set to ${dto.isBlocked}`);
    return { success: true, rule: dto };
  }

  async getWebRules(deviceId: string) {
    const map = this.webRulesStore.get(deviceId);
    return map ? Array.from(map.values()) : [];
  }

  // 3. Geofence Radius Rules Policy
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
    console.log(`[Policy Engine] Device ${dto.deviceId}: Saved Geofence Rule "${dto.name}" (${dto.radiusMeters}m radius)`);
    return { success: true, rule: newRule };
  }

  async deleteGeofenceRule(deviceId: string, ruleId: string) {
    const rules = this.geofenceRulesStore.get(deviceId) || [];
    const filtered = rules.filter(r => r.id !== ruleId);
    this.geofenceRulesStore.set(deviceId, filtered);
    return { success: true, remaining: filtered.length };
  }

  async getGeofences(deviceId: string) {
    return this.geofenceRulesStore.get(deviceId) || [];
  }
}
