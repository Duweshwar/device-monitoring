import { Controller, Get, Post, Delete, Body, Param, Sse, MessageEvent, UseGuards } from '@nestjs/common';
import { Observable, filter, map } from 'rxjs';
import { PolicyService, AppBlockDto, CallBlockDto, WebBlockDto, GeofenceRuleDto } from './policy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureGateGuard } from '../auth/guards/feature-gate.guard';
import { RequireFeature } from '../auth/decorators/require-feature.decorator';
import { Public } from '../auth/decorators/public.decorator';

@UseGuards(JwtAuthGuard, FeatureGateGuard)
@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  // 0. Real-time SSE Stream Endpoint for Instant 0-Second Policy & Media Sync (Device Agent Stream)
  @Public()
  @Sse('stream/:deviceId')
  streamPolicyUpdates(@Param('deviceId') deviceId: string): Observable<MessageEvent> {
    return this.policyService.policyEvents$.pipe(
      filter(event => event.deviceId === deviceId || event.deviceId === 'all'),
      map(event => ({
        data: JSON.stringify({ 
          type: event.type, 
          category: event.type, 
          timestamp: event.timestamp,
          payload: event.payload 
        })
      }))
    );
  }

  // 1. App Blocking Endpoints
  @RequireFeature('app_block')
  @Post('apps/block')
  async toggleAppBlock(@Body() dto: AppBlockDto) {
    return this.policyService.toggleAppBlock(dto);
  }

  @Public()
  @Get('apps/:deviceId')
  async getAppRules(@Param('deviceId') deviceId: string) {
    return this.policyService.getAppRules(deviceId);
  }

  // 2. Call Blocking Endpoints
  @RequireFeature('call_block')
  @Post('calls/block')
  async toggleCallBlock(@Body() dto: CallBlockDto) {
    return this.policyService.toggleCallBlock(dto);
  }

  @Public()
  @Get('calls/:deviceId')
  async getCallRules(@Param('deviceId') deviceId: string) {
    return this.policyService.getCallRules(deviceId);
  }

  // 3. Web Safety & Domain Filtering Endpoints
  @RequireFeature('web_filter')
  @Post('web/block')
  async toggleWebBlock(@Body() dto: WebBlockDto) {
    return this.policyService.toggleWebBlock(dto);
  }

  @Public()
  @Get('web/:deviceId')
  async getWebRules(@Param('deviceId') deviceId: string) {
    return this.policyService.getWebRules(deviceId);
  }

  // 4. Geofence Radius Endpoints
  @RequireFeature('location')
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
