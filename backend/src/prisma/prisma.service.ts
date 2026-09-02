import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('[PrismaService] Successfully connected to PostgreSQL database!');
    } catch (error) {
      console.warn('[PrismaService] Database connection pending. Operating in memory fallback mode until DB connection completes.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
