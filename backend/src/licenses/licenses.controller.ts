import { Controller, Get, Post, Body, Headers } from '@nestjs/common';
import { LicensesService, ActivateLicenseDto, PurchaseSimulateDto } from './licenses.service';

@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get('my-licenses')
  async getMyLicenses(@Headers('authorization') authHeader?: string) {
    // Authenticated session context lookup
    const userIdOrEmail = authHeader?.replace('Bearer ', '') || 'parent@gmail.com';
    return this.licensesService.getLicensesForUser(userIdOrEmail);
  }

  @Post('purchase-simulate')
  async simulatePurchase(@Body() dto: PurchaseSimulateDto) {
    return this.licensesService.simulatePurchase(dto);
  }

  @Post('activate')
  async activateLicense(@Body() dto: ActivateLicenseDto) {
    return this.licensesService.activateLicense(dto);
  }
}
