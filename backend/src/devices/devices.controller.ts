import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DevicesService, PairDeviceDto, DeviceHeartbeatDto } from './devices.service';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  async getAllDevices() {
    return this.devicesService.getAllDevices();
  }

  @Get(':id')
  async getDeviceById(@Param('id') id: string) {
    return this.devicesService.getDeviceById(id);
  }

  @Post('pair')
  async pairDevice(@Body() dto: PairDeviceDto) {
    return this.devicesService.pairDevice(dto);
  }

  @Post('heartbeat')
  async heartbeat(@Body() dto: DeviceHeartbeatDto) {
    return this.devicesService.processHeartbeat(dto);
  }
}
