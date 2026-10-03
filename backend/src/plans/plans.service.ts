import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PlanPricing {
  1: number;
  3: number;
  12: number;
  [key: string]: number;
}

export interface CreatePlanDto {
  code: string;
  name: string;
  badge?: string;
  description: string;
  features: string[];
  pricing: PlanPricing;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdatePlanDto {
  name?: string;
  badge?: string;
  description?: string;
  features?: string[];
  pricing?: PlanPricing;
  isActive?: boolean;
  sortOrder?: number;
}

// Master System Feature Catalog (Used by Super Admin to toggle capabilities per plan)
export const FEATURE_CATALOG = [
  {
    key: 'calls',
    name: 'Call History Logs',
    category: 'Core Telemetry',
    description: 'Incoming, outgoing, and missed call logs with contact name and duration',
    tier: 'basic',
  },
  {
    key: 'sms',
    name: 'SMS Messages',
    category: 'Core Telemetry',
    description: 'Full SMS inbox and sent message threads',
    tier: 'basic',
  },
  {
    key: 'contacts',
    name: 'Contacts Address Book',
    category: 'Core Telemetry',
    description: 'Synced phone contacts and phone numbers',
    tier: 'basic',
  },
  {
    key: 'location',
    name: 'Live GPS Location Tracking',
    category: 'Location & Geofencing',
    description: 'Real-time GPS coordinate trail, geofences, and map viewer',
    tier: 'basic',
  },
  {
    key: 'apps',
    name: 'Installed Applications',
    category: 'Application Safety',
    description: 'Installed package inventory and versions',
    tier: 'basic',
  },
  {
    key: 'app_usage',
    name: 'App Screen Time & Usage Stats',
    category: 'Application Safety',
    description: 'Daily and hourly foreground app usage analytics',
    tier: 'basic',
  },
  {
    key: 'calendar',
    name: 'Calendar & Event Reminders',
    category: 'Core Telemetry',
    description: 'Calendar appointments and schedule sync',
    tier: 'basic',
  },
  {
    key: 'web_history',
    name: 'Internet Browsing History',
    category: 'Web Protection',
    description: 'Active web URLs and search queries from browsers',
    tier: 'premium',
  },
  {
    key: 'web_filter',
    name: 'Real-Time Domain & URL Blocking',
    category: 'Web Protection',
    description: 'Instantly block blacklisted domains and search phrases',
    tier: 'premium',
  },
  {
    key: 'app_block',
    name: 'Application Blocker',
    category: 'Application Safety',
    description: 'Remotely block and close restricted apps',
    tier: 'premium',
  },
  {
    key: 'call_block',
    name: 'Call Screening & Number Blocking',
    category: 'Core Telemetry',
    description: 'Block incoming and outgoing calls by number or contact',
    tier: 'premium',
  },
  {
    key: 'keylogger',
    name: 'Keystroke Logger',
    category: 'Social & Text Inspection',
    description: 'Capture active keystroke input across applications',
    tier: 'premium',
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp & WA Business Chats',
    category: 'Social & Text Inspection',
    description: 'Inbound and outbound text chat messages parsing',
    tier: 'premium',
  },
  {
    key: 'youtube',
    name: 'YouTube Watch & Search History',
    category: 'Social & Text Inspection',
    description: 'Monitors YouTube app video search terms and watch history',
    tier: 'premium',
  },
  {
    key: 'screenshots',
    name: 'Automated & On-Demand Screenshots',
    category: 'Live & Stealth Media',
    description: 'Periodic background screenshots and instant live triggers',
    tier: 'vip',
  },
  {
    key: 'stealth_photos',
    name: 'Stealth CameraX Photo Capture',
    category: 'Live & Stealth Media',
    description: 'Silent front and rear camera photo snapshots without preview',
    tier: 'vip',
  },
  {
    key: 'call_recordings',
    name: 'Two-Way Call Audio Recordings',
    category: 'Live & Stealth Media',
    description: 'Records voice calls to .m4a audio and streams in dashboard',
    tier: 'vip',
  },
  {
    key: 'device_lock',
    name: 'Remote Device Lock',
    category: 'Security Controls',
    description: 'Emergency remote device screen lock via Device Admin DPM',
    tier: 'vip',
  },
];

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Seed default plans if table is empty
    await this.seedDefaultPlansIfEmpty();
  }

  // 1. Get All Active Plans with Features & Pricing (Strictly from PostgreSQL)
  async getAllPlans() {
    return this.prisma.planTier.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // 2. Admin: Get All Plans (Including Inactive)
  // 2. Admin: Get All Plans (Strictly from PostgreSQL Database)
  async getAdminPlans() {
    return this.prisma.planTier.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  // 3. Get Single Plan by Code
  async getPlanByCode(code: string) {
    const cleanCode = code.trim().toLowerCase();
    const plan = await this.prisma.planTier.findUnique({
      where: { code: cleanCode },
    }).catch(() => null);

    if (!plan) {
      throw new NotFoundException(`Plan with code "${code}" not found.`);
    }

    return plan;
  }

  // 4. Admin: Create New Plan
  async createPlan(dto: CreatePlanDto) {
    const cleanCode = dto.code.trim().toLowerCase();
    const existing = await this.prisma.planTier.findUnique({
      where: { code: cleanCode },
    }).catch(() => null);

    if (existing) {
      throw new BadRequestException(`Plan with code "${cleanCode}" already exists.`);
    }

    return this.prisma.planTier.create({
      data: {
        code: cleanCode,
        name: dto.name,
        badge: dto.badge || null,
        description: dto.description || '',
        features: dto.features || [],
        pricing: dto.pricing,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  // 5. Admin: Update Existing Plan (Features, Pricing, Badge)
  async updatePlan(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.planTier.findUnique({
      where: { id },
    }).catch(() => null);

    if (!plan) {
      throw new NotFoundException('Plan not found.');
    }

    return this.prisma.planTier.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.badge !== undefined && { badge: dto.badge }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.features && { features: dto.features }),
        ...(dto.pricing && { pricing: dto.pricing }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  // 6. Admin: Toggle Plan Status
  async togglePlanStatus(id: string, isActive: boolean) {
    return this.prisma.planTier.update({
      where: { id },
      data: { isActive },
    });
  }

  // 7. Get Master Feature Catalog
  getFeatureCatalog() {
    return {
      success: true,
      features: FEATURE_CATALOG,
    };
  }

  // Fallback / Initial Seed Plans
  private getDefaultPlans() {
    return [
      {
        id: 'plan_basic',
        code: 'basic',
        name: 'Basic Plan',
        badge: null,
        description: 'Essential parental protection: GPS tracking, call logs, SMS, and contacts.',
        features: ['calls', 'sms', 'contacts', 'location', 'apps', 'app_usage', 'calendar'],
        pricing: { 1: 1499, 3: 2999, 12: 5999 },
        isActive: true,
        sortOrder: 1,
      },
      {
        id: 'plan_premium',
        code: 'premium',
        name: 'Premium Plan',
        badge: 'Most Popular',
        description: 'Advanced monitoring: Web filter, app blocker, keylogger, and WhatsApp messages.',
        features: [
          'calls',
          'sms',
          'contacts',
          'location',
          'apps',
          'app_usage',
          'calendar',
          'web_history',
          'web_filter',
          'app_block',
          'call_block',
          'keylogger',
          'whatsapp',
          'youtube',
        ],
        pricing: { 1: 1999, 3: 3999, 12: 7999 },
        isActive: true,
        sortOrder: 2,
      },
      {
        id: 'plan_vip',
        code: 'vip',
        name: 'VIP Plan',
        badge: 'Best Value',
        description: 'Complete stealth surveillance: Stealth camera photos, call recordings, and screenshots.',
        features: [
          'calls',
          'sms',
          'contacts',
          'location',
          'apps',
          'app_usage',
          'calendar',
          'web_history',
          'web_filter',
          'app_block',
          'call_block',
          'keylogger',
          'whatsapp',
          'youtube',
          'screenshots',
          'stealth_photos',
          'call_recordings',
          'device_lock',
        ],
        pricing: { 1: 2999, 3: 5999, 12: 11999 },
        isActive: true,
        sortOrder: 3,
      },
    ];
  }

  private async seedDefaultPlansIfEmpty() {
    try {
      const count = await this.prisma.planTier.count().catch(() => -1);
      if (count === 0) {
        console.log('[PlansService] Seeding default Plan Tiers and Feature Matrix into PostgreSQL...');
        for (const plan of this.getDefaultPlans()) {
          await this.prisma.planTier.create({
            data: {
              code: plan.code,
              name: plan.name,
              badge: plan.badge,
              description: plan.description,
              features: plan.features,
              pricing: plan.pricing,
              isActive: plan.isActive,
              sortOrder: plan.sortOrder,
            },
          }).catch(() => null);
        }
        console.log('[PlansService] Successfully seeded default plans.');
      } else {
        // Normalize any existing database plans to keep only 1, 3, and 12 months
        const existingPlans = await this.prisma.planTier.findMany().catch(() => []);
        for (const p of existingPlans) {
          const pricing = p.pricing as Record<string, number>;
          if (pricing && pricing['6'] !== undefined) {
            const { '6': _, ...cleanPricing } = pricing;
            await this.prisma.planTier.update({
              where: { id: p.id },
              data: { pricing: cleanPricing },
            }).catch(() => null);
          }
        }
      }
    } catch {
      // Quiet fallback
    }
  }
}
