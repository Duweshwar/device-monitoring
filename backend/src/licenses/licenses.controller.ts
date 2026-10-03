import { Controller, Get, Post, Body, Headers, Query, Param, UseGuards } from '@nestjs/common';
import { LicensesService, ActivateLicenseDto } from './licenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Public()
  @Get('my-licenses')
  async getMyLicenses(
    @Headers('authorization') authHeader?: string,
    @Query('email') queryEmail?: string,
    @CurrentUser() user?: any,
  ) {
    let identifier = user?.id || user?.email;
    if (!identifier && authHeader) {
      const raw = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (raw.includes('.')) {
        try {
          const parts = raw.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            identifier = payload.sub || payload.email;
          }
        } catch {
          // Quiet fallback
        }
      } else if (raw) {
        // Direct email passed by Android ApiClient.kt
        identifier = raw;
      }
    }
    if (!identifier && queryEmail) {
      identifier = queryEmail;
    }
    return this.licensesService.getLicensesForUser(identifier || 'parent@gmail.com');
  }

  @Post('unlink')
  async unlinkLicense(@Body() body: { licenseKey: string }) {
    return this.licensesService.unlinkLicense(body.licenseKey);
  }

  @Public()
  @Get('inspect/:licenseKey')
  async inspectLicense(@Param('licenseKey') licenseKey: string) {
    return this.licensesService.inspectLicense(licenseKey);
  }

  @Public()
  @Post('activate')
  async activateLicense(@Body() dto: ActivateLicenseDto) {
    return this.licensesService.activateLicense(dto);
  }
}
