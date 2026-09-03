import { Controller, Get, Post, Delete, Body, Param, Sse, MessageEvent } from '@nestjs/common';
import { Observable, filter, map } from 'rxjs';
import { PolicyService, AppBlockDto, CallBlockDto, WebBlockDto, GeofenceRuleDto } from './policy.service';

@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  // 0. Real-time SSE Stream Endpoint for Instant 0-Second Policy Sync
  @Sse('stream/:deviceId')
  streamPolicyUpdates(@Param('deviceId') deviceId: string): Observable<MessageEvent> {
    return this.policyService.policyEvents$.pipe(
      filter(event => event.deviceId === deviceId || event.deviceId === 'all'),
      map(event => ({
        data: JSON.stringify({ type: 'POLICY_UPDATE', category: event.type, timestamp: event.timestamp })
      }))
    );
  }

  // 1. App Blocking Endpoints
  @Post('apps/block')
  async toggleAppBlock(@Body() dto: AppBlockDto) {
    return this.policyService.toggleAppBlock(dto);
  }

  @Get('apps/:deviceId')
  async getAppRules(@Param('deviceId') deviceId: string) {
    return this.policyService.getAppRules(deviceId);
  }

  // 2. Call Blocking Endpoints
  @Post('calls/block')
  async toggleCallBlock(@Body() dto: CallBlockDto) {
    return this.policyService.toggleCallBlock(dto);
  }

  @Get('calls/:deviceId')
  async getCallRules(@Param('deviceId') deviceId: string) {
    return this.policyService.getCallRules(deviceId);
  }

  // 3. Web Safety & Domain Filtering Endpoints
  @Post('web/block')
  async toggleWebBlock(@Body() dto: WebBlockDto) {
    return this.policyService.toggleWebBlock(dto);
  }

  @Get('web/:deviceId')
  async getWebRules(@Param('deviceId') deviceId: string) {
    return this.policyService.getWebRules(deviceId);
  }

  // 4. Geofence Radius Endpoints
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
