import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

export interface ActivateLicenseDto {
  userId?: string;
  email?: string;
  licenseKey: string;
  deviceId: string;
  manufacturer?: string;
  model?: string;
  androidVersion?: number;
  sdkInt?: number;
}

export interface UnlinkLicenseDto {
  licenseKey: string;
}

@Injectable()
export class LicensesService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Get All Purchased Licenses from PostgreSQL Database
  async getLicensesForUser(userIdOrEmail: string) {
    try {
      // First try to find user by email or ID
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { id: userIdOrEmail },
            { email: userIdOrEmail.toLowerCase() }
          ]
        },
        include: {
          licenses: {
            include: { assignedDevice: true }
          }
        }
      }).catch(() => null);

      if (user && user.licenses && user.licenses.length > 0) {
        return user.licenses;
      }

      // Fallback: Fetch all provisioned licenses from PostgreSQL database
      const allLicenses = await this.prisma.license.findMany({
        include: { assignedDevice: true },
        orderBy: { createdAt: 'desc' }
      });

      if (allLicenses && allLicenses.length > 0) {
        return allLicenses;
      }
    } catch (e) {
      console.warn('[LicensesService] Error fetching user licenses:', e);
    }

    // Return empty array ONLY when database contains zero licenses
    return [];
  }

  // 2. Unlink License from Device (Unlimited Device Change / Transfer)
  async unlinkLicense(licenseKey: string) {
    const cleanKey = licenseKey.trim().toUpperCase();
    const license = await this.prisma.license.findUnique({
      where: { licenseKey: cleanKey },
      include: { assignedDevice: true },
    }).catch(() => null);

    if (!license) {
      throw new NotFoundException('License not found.');
    }

    const previousDeviceId = license.assignedDeviceId;

    await this.prisma.license.update({
      where: { id: license.id },
      data: {
        status: 'UNASSIGNED',
        assignedDeviceId: null,
      },
    });

    if (previousDeviceId) {
      await this.prisma.device.update({
        where: { id: previousDeviceId },
        data: { isPaired: false },
      }).catch(() => null);
    }

    return {
      success: true,
      message: 'License successfully unlinked. You can now re-link this license to a new target device.',
      licenseKey: cleanKey,
    };
  }

  // 3. Activate License Key on Target Android Device
  async activateLicense(dto: ActivateLicenseDto) {
    if (!dto.licenseKey) {
      throw new BadRequestException('License Key is required for activation.');
    }

    const cleanKey = dto.licenseKey.trim().toUpperCase();

    // Find License in PostgreSQL
    const license = await this.prisma.license.findUnique({
      where: { licenseKey: cleanKey },
      include: { user: true }
    }).catch(() => null);

    if (!license) {
      throw new BadRequestException('Invalid License Key. No active purchase found for this key. Please purchase a plan.');
    }

    if (license.status === 'EXPIRED' || new Date(license.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException('This License Key has EXPIRED. Please renew your subscription plan.');
    }

    if (license.status === 'ACTIVE' && license.assignedDeviceId && license.assignedDeviceId !== dto.deviceId) {
      throw new BadRequestException('This License Key is already active on another target device.');
    }

    // Upsert Target Device in PostgreSQL
    const deviceName = `${dto.manufacturer || 'Android'} ${dto.model || 'Device'}`;
    const device = await this.prisma.device.upsert({
      where: { id: dto.deviceId },
      update: {
        name: deviceName,
        lastSeenAt: new Date(),
        isPaired: true
      },
      create: {
        id: dto.deviceId,
        name: deviceName,
        manufacturer: dto.manufacturer || 'Android',
        model: dto.model || 'Device',
        androidVersion: dto.androidVersion || 14,
        sdkInt: dto.sdkInt || 34,
        isPaired: true,
        capabilities: {
          create: {
            location: true,
            callLogs: true,
            sms: true,
            contacts: true,
            appUsage: true,
            deviceOwnerMode: true
          }
        }
      }
    });

    // Bind License to Target Device in PostgreSQL
    await this.prisma.license.update({
      where: { id: license.id },
      data: {
        status: 'ACTIVE',
        assignedDeviceId: device.id
      }
    });

    console.log(`[PostgreSQL DB] Activated License ${cleanKey} for Device ${device.name} (${device.id})`);

    return {
      success: true,
      message: 'License Activated Successfully! Target device protection is active.',
      deviceId: device.id,
      licenseKey: cleanKey,
      planName: license.planName
    };
  }

  // 4. Inspect License Key Details (Preview before activation on Android Agent)
  async inspectLicense(licenseKey: string) {
    if (!licenseKey) {
      throw new BadRequestException('License Key is required.');
    }

    const cleanKey = licenseKey.trim().toUpperCase();

    const license = await this.prisma.license.findUnique({
      where: { licenseKey: cleanKey },
      include: {
        user: {
          include: {
            paymentOrders: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        assignedDevice: true,
      },
    }).catch(() => null);

    if (!license) {
      throw new NotFoundException(`License "${cleanKey}" not found. Please verify the key or purchase a subscription.`);
    }

    const latestOrder = license.user?.paymentOrders?.[0];
    const isExpired = new Date(license.expiresAt).getTime() < Date.now() || license.status === 'EXPIRED';
    const isAlreadyAssigned = Boolean(license.assignedDeviceId && license.status === 'ACTIVE');

    const planCode = (license.planCode || 'basic').trim().toLowerCase();
    const tier = await this.prisma.planTier.findUnique({
      where: { code: planCode },
    }).catch(() => null);

    return {
      success: true,
      licenseKey: license.licenseKey,
      planName: license.planName,
      planCode,
      planBadge: tier?.badge || null,
      status: license.status,
      expiresAt: license.expiresAt,
      isExpired,
      isAlreadyAssigned,
      assignedDeviceName: license.assignedDevice?.name || null,
      assignedDeviceId: license.assignedDeviceId || null,
      features: (tier?.features as string[]) || [],
      owner: {
        name: license.user?.name || latestOrder?.customerName || 'Registered Parent',
        email: license.user?.email || latestOrder?.customerEmail || 'N/A',
        phone: latestOrder?.customerPhone || 'N/A',
      },
    };
  }
}
