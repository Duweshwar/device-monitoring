import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  UseInterceptors, 
  UploadedFile, 
  Req, 
  BadRequestException,
  UseGuards
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Request } from 'express';
import { UpdatesService, CreateReleaseDto, TriggerUpdateDto, ProgressReportDto } from './updates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

const apkUploadDir = join(process.cwd(), 'uploads', 'apk');
if (!existsSync(apkUploadDir)) {
  mkdirSync(apkUploadDir, { recursive: true });
}

@UseGuards(JwtAuthGuard)
@Controller('updates')
export class UpdatesController {
  constructor(private readonly updatesService: UpdatesService) {}

  @Public()
  @Get('releases')
  async getReleases() {
    return this.updatesService.getReleases();
  }

  @Public()
  @Get('jobs')
  async getJobs() {
    return this.updatesService.getActiveJobs();
  }

  @Post('release')
  async createRelease(@Body() dto: CreateReleaseDto) {
    return this.updatesService.createRelease(dto);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, apkUploadDir);
        },
        filename: (req, file, cb) => {
          const rawVName = req.body?.versionName || 'update';
          const cleanName = basename(rawVName).replace(/[^a-zA-Z0-9._-]/g, '_');
          const ext = extname(basename(file.originalname)) || '.apk';
          cb(null, `agent-${cleanName}-${Date.now()}${ext}`);
        },
      }),
    })
  )
  async uploadApk(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { versionCode?: string; versionName?: string; releaseNotes?: string; isMandatory?: string },
    @Req() req: Request
  ) {
    if (!file) {
      throw new BadRequestException('APK binary file is required');
    }
    const host = req.get('host') || 'localhost:3000';
    return this.updatesService.uploadRelease(
      file.path,
      file.size,
      file.filename,
      body.versionCode || '',
      body.versionName || '',
      body.releaseNotes || '',
      body.isMandatory || 'false',
      host
    );
  }

  @Public()
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

  @Public()
  @Post('progress')
  async reportProgress(@Body() dto: ProgressReportDto) {
    return this.updatesService.reportProgress(dto);
  }
}
