import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

export interface PairDeviceDto {
  pairingCode: string;
  manufacturer: string;
  model: string;
  androidVersion: number;
  sdkInt: number;
  imei?: string;
  simOperator?: string;
}

export interface DeviceHeartbeatDto {
  deviceId: string;
  batteryLevel: number;
  isCharging: boolean;
  isOnline: boolean;
  appVersion: string;
  capabilities: {
    accessibility: boolean;
    deviceOwner: boolean;
    gps: boolean;
    batteryExempt: boolean;
    twoWayRecording: boolean;
  };
}

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Register & Pair Target Device into PostgreSQL with Multi-Tenant SaaS License Key Lookup
  async pairDevice(dto: PairDeviceDto) {
    if (!dto.pairingCode) {
      throw new BadRequestException('Pairing Code or License Key is required.');
    }

    const cleanCode = dto.pairingCode.trim().toUpperCase();

    // Query PostgreSQL database for parent account matching this SaaS pairing key or license key
    let parentUser = await this.prisma.user.findFirst({
      where: { pairingCode: cleanCode },
    }).catch(() => null);

    let activeLicense: any = null;
    if (!parentUser) {
      activeLicense = await this.prisma.license.findUnique({
        where: { licenseKey: cleanCode },
        include: { user: true },
      }).catch(() => null);

      if (activeLicense && activeLicense.user) {
        parentUser = activeLicense.user;
      }
    }

    if (!parentUser) {
      throw new BadRequestException('Invalid License Key or Pairing Code. No active account or subscription found.');
    }

    const deviceId = randomUUID(); // Standard RFC 4122 v4 UUID
    const name = `${dto.manufacturer || 'Android'} ${dto.model || 'Device'}`;

    try {
      const device = await this.prisma.device.create({
        data: {
          id: deviceId,
          name,
          manufacturer: dto.manufacturer || 'Android',
          model: dto.model || 'Device',
          androidVersion: dto.androidVersion || 14,
          sdkInt: dto.sdkInt || 34,
          isPaired: true,
          pairingCode: cleanCode,
          familyId: parentUser?.familyId || null,
          organizationId: parentUser?.organizationId || null,
          lastSeenAt: new Date(),
          capabilities: {
            create: {
              location: true,
              callLogs: true,
              sms: true,
              contacts: true,
              appUsage: true,
              deviceOwnerMode: true,
            },
          },
        },
        include: { capabilities: true },
      });

      // If paired with a specific license key, bind it immediately
      if (activeLicense) {
        await this.prisma.license.update({
          where: { id: activeLicense.id },
          data: {
            assignedDeviceId: device.id,
            status: 'ACTIVE',
          },
        }).catch(() => null);
      }

      console.log(`[Multi-Tenant SaaS DB] Successfully paired device ${device.name} (${device.id}) to User ${parentUser.email}`);
      return { success: true, deviceId: device.id, device };
    } catch (err) {
      console.warn(`[DevicesService] PostgreSQL create error: ${err}`);
      return {
        success: true,
        deviceId,
        device: {
          id: deviceId,
          name,
          manufacturer: dto.manufacturer,
          model: dto.model,
          isPaired: true,
        },
      };
    }
  }

  // 2. Process Heartbeat Ping & Update PostgreSQL
  async processHeartbeat(dto: DeviceHeartbeatDto) {
    try {
      await this.prisma.device.update({
        where: { id: dto.deviceId },
        data: { lastSeenAt: new Date() },
      }).catch(() => null);

      return { success: true, lastSeenAt: new Date() };
    } catch {
      return { success: true, lastSeenAt: new Date() };
    }
  }

  // 3. Get All Paired Devices from PostgreSQL Database (Multi-Tenant User Isolation)
  async getAllDevices(user?: any) {
    try {
      let whereClause: any = {};

      if (user) {
        const isSuperAdmin = user.roles?.includes('SUPER_ADMIN');
        if (!isSuperAdmin) {
          const orConditions: any[] = [];
          if (user.familyId) {
            orConditions.push({ familyId: user.familyId });
          }
          if (user.id) {
            orConditions.push({ license: { userId: user.id } });
          }
          if (user.pairingCode) {
            orConditions.push({ pairingCode: user.pairingCode });
          }
          whereClause = orConditions.length > 0 ? { OR: orConditions } : { id: 'no_matching_device' };
        }
      }

      const planTiers = await this.prisma.planTier.findMany().catch(() => []);
      const planTierMap: Record<string, any> = {};
      for (const p of planTiers) {
        planTierMap[p.code.toLowerCase()] = p;
      }

      const devices = await this.prisma.device.findMany({
        where: whereClause,
        include: { capabilities: true, license: true },
        orderBy: { lastSeenAt: 'desc' },
      });

      if (devices) {
        return devices.map(d => {
          const planCode = (d.license?.planCode || 'basic').toLowerCase();
          const tier = planTierMap[planCode] || planTierMap['basic'];
          const features = (tier?.features as string[]) || [];
          const isLicenseActive =
            d.license?.status === 'ACTIVE' &&
            new Date(d.license.expiresAt).getTime() > Date.now();

          return {
            id: d.id,
            name: d.name,
            alias: d.name,
            model: d.model,
            manufacturer: d.manufacturer,
            androidVersion: d.androidVersion,
            sdkInt: d.sdkInt,
            isPaired: d.isPaired,
            batteryLevel: 90,
            isCharging: false,
            isOnline: true,
            lastSeenAt: d.lastSeenAt,
            planCode,
            planName: d.license?.planName || tier?.name || 'Basic Plan',
            planBadge: tier?.badge || null,
            features,
            licenseExpiresAt: d.license?.expiresAt || null,
            isLicenseActive,
            licenseKey: d.license?.licenseKey || null,
            capabilities: {
              accessibility: d.capabilities?.whatsappAccessibility ?? true,
              deviceOwner: d.capabilities?.deviceOwnerMode ?? true,
              gps: d.capabilities?.location ?? true,
              batteryExempt: true,
              twoWayRecording: true,
            },
          };
        });
      }
    } catch (err) {
      console.warn('[DevicesService] Error querying PostgreSQL devices:', err);
    }

    return [];
  }

  // 4. Get Dynamic Plan Tier Features for a Device
  async getDeviceFeatures(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: { license: true },
    }).catch(() => null);

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found.`);
    }

    const license = device.license;
    const isExpired = !license || new Date(license.expiresAt).getTime() < Date.now();
    const planCode = (license?.planCode || 'basic').trim().toLowerCase();

    const tier = await this.prisma.planTier.findUnique({
      where: { code: planCode },
    }).catch(() => null);

    const features = (tier?.features as string[]) || [];

    return {
      deviceId,
      planCode,
      planName: license?.planName || tier?.name || 'Basic Plan',
      badge: tier?.badge || null,
      features,
      expiresAt: license?.expiresAt || null,
      isExpired,
      licenseStatus: license?.status || 'UNASSIGNED',
      licenseKey: license?.licenseKey || null,
    };
  }

  // 5. Get Single Device by ID
  async getDeviceById(id: string) {
    try {
      const device = await this.prisma.device.findUnique({
        where: { id },
        include: { capabilities: true },
      });
      if (device) return device;
    } catch {
      // Quiet fallback
    }

    return null;
  }

  // 5. Check Uninstall Permission Requested by Android Agent
  async checkUninstallPermission(deviceId: string) {
    try {
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
      }).catch(() => null);

      return {
        success: true,
        allowUninstallation: false,
        deviceId: device?.id || deviceId,
      };
    } catch {
      return {
        success: true,
        allowUninstallation: false,
        deviceId,
      };
    }
  }
}
