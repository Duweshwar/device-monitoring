import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator';

@Injectable()
export class FeatureGateGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rawRequired = this.reflector.getAllAndOverride<string | string[]>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If endpoint has no @RequireFeature decorator, pass through
    if (!rawRequired || (Array.isArray(rawRequired) && rawRequired.length === 0)) {
      return true;
    }

    const requiredFeatures: string[] = Array.isArray(rawRequired) ? rawRequired : [rawRequired];
    const request = context.switchToHttp().getRequest();
    const deviceId =
      request.body?.deviceId ||
      request.params?.deviceId ||
      request.params?.id ||
      request.query?.deviceId;

    // 1. Device-targeted check: If a deviceId is specified
    if (deviceId && typeof deviceId === 'string') {
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
        include: { license: true },
      }).catch(() => null);

      if (!device) {
        return true;
      }

      const license = device.license;
      if (!license) {
        throw new ForbiddenException({
          success: false,
          code: 'NO_LICENSE',
          message: 'This target device does not have an assigned license.',
          features: requiredFeatures,
        });
      }

      if (license.status !== 'ACTIVE' || new Date(license.expiresAt).getTime() < Date.now()) {
        throw new ForbiddenException({
          success: false,
          code: 'LICENSE_EXPIRED',
          message: 'The subscription license for this target device has expired. Please renew your plan.',
          features: requiredFeatures,
        });
      }

      const planCode = (license.planCode || 'basic').trim().toLowerCase();
      const tier = await this.prisma.planTier.findUnique({
        where: { code: planCode },
      }).catch(() => null);

      const allowedFeatures = (tier?.features as string[]) || [];
      const missingFeatures = requiredFeatures.filter(f => !allowedFeatures.includes(f));

      if (missingFeatures.length > 0) {
        throw new ForbiddenException({
          success: false,
          code: 'FEATURE_GATED',
          message: `The capability [${missingFeatures.join(', ')}] is not included in your ${tier?.name || planCode.toUpperCase()} subscription tier. Please upgrade to unlock this feature.`,
          missingFeatures,
          currentPlan: planCode,
        });
      }

      return true;
    }

    // 2. User-targeted fallback check: If no specific device is targeted, check user's active licenses
    const user = request.user;
    if (user && user.id) {
      const activeLicenses = await this.prisma.license.findMany({
        where: {
          userId: user.id,
          status: { in: ['ACTIVE', 'UNASSIGNED'] },
          expiresAt: { gt: new Date() },
        },
      }).catch(() => []);

      if (activeLicenses.length > 0) {
        const planCodes = [...new Set(activeLicenses.map(l => (l.planCode || 'basic').toLowerCase()))];
        const tiers = await this.prisma.planTier.findMany({
          where: { code: { in: planCodes } },
        }).catch(() => []);

        const allUserFeatures = new Set(tiers.flatMap(t => (t.features as string[]) || []));
        const missingFeatures = requiredFeatures.filter(f => !allUserFeatures.has(f));

        if (missingFeatures.length > 0) {
          throw new ForbiddenException({
            success: false,
            code: 'FEATURE_GATED',
            message: `The capability [${missingFeatures.join(', ')}] is not included in your current subscription tier. Please upgrade to unlock this feature.`,
            missingFeatures,
          });
        }
      }
    }

    return true;
  }
}
