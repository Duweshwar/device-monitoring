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

const uploadDir = join(process.cwd(), 'uploads', 'recordings');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@Controller('media')
export class MediaController {
  constructor(private readonly prisma: PrismaService) {}

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
    @Body() body: { deviceId?: string; category?: string; fileName?: string }
  ) {
    if (!file) {
      return { success: false, message: 'No file uploaded.' };
    }

    const deviceId = body.deviceId || 'ac7189fd-ec87-40a0-9f8a-4d93e01aa73a';
    const category = body.category || 'CALL_RECORDING';
    const publicUrl = `/uploads/recordings/${file.filename}`;

    try {
      await this.prisma.mediaAsset.create({
        data: {
          deviceId,
          category,
          storageKey: file.filename,
          fileHash: file.filename,
          fileSizeBytes: file.size,
          mimeType: file.mimetype || 'audio/mp4',
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

  @Get('stream/:filename')
  async streamFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(uploadDir, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Recording file not found on server.');
    }
    return res.sendFile(filePath);
  }
}
