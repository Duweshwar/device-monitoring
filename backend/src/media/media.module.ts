import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [PrismaModule, PolicyModule],
  controllers: [MediaController],
})
export class MediaModule {}
