import { Module } from '@nestjs/common';
import { UpdatesController } from './updates.controller';
import { UpdatesService } from './updates.service';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [PolicyModule],
  controllers: [UpdatesController],
  providers: [UpdatesService],
  exports: [UpdatesService]
})
export class UpdatesModule {}
