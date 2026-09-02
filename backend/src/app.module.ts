import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UpdatesModule } from './updates/updates.module';
import { DevicesModule } from './devices/devices.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { PolicyModule } from './policy/policy.module';
import { CommandsModule } from './commands/commands.module';
import { LicensesModule } from './licenses/licenses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UpdatesModule,
    DevicesModule,
    TelemetryModule,
    PolicyModule,
    CommandsModule,
    LicensesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
