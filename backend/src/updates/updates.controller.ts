import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { UpdatesService, CreateReleaseDto, TriggerUpdateDto, ProgressReportDto } from './updates.service';

@Controller('updates')
export class UpdatesController {
  constructor(private readonly updatesService: UpdatesService) {}

  @Get('releases')
  async getReleases() {
    return this.updatesService.getReleases();
  }

  @Post('release')
  async createRelease(@Body() dto: CreateReleaseDto) {
    return this.updatesService.createRelease(dto);
  }

  @Get('check')
  async checkUpdate(
    @Query('deviceId') deviceId: string,
    @Query('versionCode') versionCode: string
  ) {
    const code = parseInt(versionCode, 10) || 0;
    return this.updatesService.checkDeviceUpdate(deviceId, code);
  }

  @Post('trigger')
  async triggerUpdate(@Body() dto: TriggerUpdateDto) {
    return this.updatesService.triggerDeviceUpdate(dto);
  }

  @Post('progress')
  async reportProgress(@Body() dto: ProgressReportDto) {
    return this.updatesService.reportProgress(dto);
  }
}
