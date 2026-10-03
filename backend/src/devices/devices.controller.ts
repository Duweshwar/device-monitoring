import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DevicesService, PairDeviceDto, DeviceHeartbeatDto } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  async getAllDevices(@CurrentUser() user: any) {
    return this.devicesService.getAllDevices(user);
  }

  @Public()
  @Get('admin/fleet')
  async getFleetDevices() {
    return this.devicesService.getAllDevices(null);
  }

  @Get(':id')
  async getDeviceById(@Param('id') id: string) {
    return this.devicesService.getDeviceById(id);
  }

  @Get(':id/features')
  async getDeviceFeatures(@Param('id') id: string) {
    return this.devicesService.getDeviceFeatures(id);
  }

  @Public()
  @Post('pair')
  async pairDevice(@Body() dto: PairDeviceDto) {
    return this.devicesService.pairDevice(dto);
  }

  @Public()
  @Post('heartbeat')
  async heartbeat(@Body() dto: DeviceHeartbeatDto) {
    return this.devicesService.processHeartbeat(dto);
  }

  @Public()
  @Get('check-uninstall-permission')
  async checkUninstallPermission(
    @Query('deviceId') queryDeviceId?: string,
    @Param('deviceId') paramDeviceId?: string,
  ) {
    const deviceId = queryDeviceId || paramDeviceId || '';
    return this.devicesService.checkUninstallPermission(deviceId);
  }
}
