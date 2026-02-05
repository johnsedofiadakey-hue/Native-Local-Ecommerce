import { Module, Global } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';
import { LoggerService } from './services/logger.service';
import { AuditService } from './services/audit.service';
import { S3Service } from './services/s3.service';
import { PaystackService } from './services/paystack.service';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    ConfigService,
    PrismaService,
    LoggerService,
    AuditService,
    S3Service,
    PaystackService,
  ],
  exports: [
    ConfigService,
    PrismaService,
    LoggerService,
    AuditService,
    S3Service,
    PaystackService,
  ],
})
export class CommonModule {}
