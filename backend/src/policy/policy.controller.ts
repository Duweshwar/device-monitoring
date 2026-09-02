import { Controller, Get, Post, Delete, Body, Query, Param } from '@nestjs/common';
import { PolicyService, AppBlockDto, WebBlockDto, GeofenceRuleDto } from './policy.service';

@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  // 1. App Blocking Endpoints
  @Post('apps/block')
  async toggleAppBlock(@Body() dto: AppBlockDto) {
    return this.policyService.toggleAppBlock(dto);
  }

  @Get('apps/:deviceId')
  async getAppRules(@Param('deviceId') deviceId: string) {
    return this.policyService.getAppRules(deviceId);
  }

  // 2. Web Safety & Domain Filtering Endpoints
  @Post('web/block')
  async toggleWebBlock(@Body() dto: WebBlockDto) {
    return this.policyService.toggleWebBlock(dto);
  }

  @Get('web/:deviceId')
  async getWebRules(@Param('deviceId') deviceId: string) {
    return this.policyService.getWebRules(deviceId);
  }

  // 3. Geofence Radius Endpoints
  @Post('geofence')
  async saveGeofenceRule(@Body() dto: GeofenceRuleDto) {
    return this.policyService.saveGeofenceRule(dto);
  }

  @Get('geofence/:deviceId')
  async getGeofences(@Param('deviceId') deviceId: string) {
    return this.policyService.getGeofences(deviceId);
  }

  @Delete('geofence/:deviceId/:ruleId')
  async deleteGeofenceRule(
    @Param('deviceId') deviceId: string,
    @Param('ruleId') ruleId: string
  ) {
    return this.policyService.deleteGeofenceRule(deviceId, ruleId);
  }
}
