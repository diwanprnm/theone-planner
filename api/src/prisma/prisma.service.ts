import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Klien Prisma sebagai provider NestJS. Satu koneksi dipakai bersama
 * seluruh aplikasi; ditutup rapi saat proses dimatikan.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Terhubung ke database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
