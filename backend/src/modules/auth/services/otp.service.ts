import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/services/prisma.service';
import { LoggerService } from '@/common/services/logger.service';
import { generateOTP } from '@/common/utils/helpers';
import { HubtelService } from './hubtel.service';

@Injectable()
export class OtpService {
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;

  constructor(
    private prisma: PrismaService,
    private hubtelService: HubtelService,
    private logger: LoggerService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate and send OTP code via SMS
   */
  async sendOtp(phone: string, purpose: string): Promise<void> {
    // Check for recent OTP requests (rate limiting)
    const recentOtp = await this.prisma.otpVerification.findFirst({
      where: {
        phone,
        purpose,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000), // Last minute
        },
      },
    });

    if (recentOtp) {
      throw new BadRequestException(
        'OTP already sent. Please wait before requesting again.',
      );
    }

    // Invalidate previous OTPs for this phone and purpose
    await this.prisma.otpVerification.deleteMany({
      where: {
        phone,
        purpose,
        verified: false,
      },
    });

    // Generate OTP code
    const code = generateOTP(6);
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save OTP to database
    await this.prisma.otpVerification.create({
      data: {
        phone,
        code,
        purpose,
        expiresAt,
      },
    });

    // Send OTP via Hubtel SMS
    try {
      await this.hubtelService.sendSms(
        phone,
        `Your ${this.configService.get('PLATFORM_NAME', 'Commerce Platform')} verification code is: ${code}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`,
      );

      this.logger.log(`OTP sent to ${phone} for ${purpose}`, 'OtpService');
    } catch (error) {
      this.logger.error(
        `Failed to send OTP to ${phone}: ${error.message}`,
        error.stack,
        'OtpService',
      );
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(phone: string, code: string, purpose: string): Promise<boolean> {
    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        phone,
        purpose,
        verified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      return false;
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      this.logger.warn(`Expired OTP attempt for ${phone}`, 'OtpService');
      return false;
    }

    // Check max attempts
    if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
      this.logger.warn(
        `Max OTP attempts exceeded for ${phone}`,
        'OtpService',
      );
      return false;
    }

    // Increment attempts
    await this.prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: {
        attempts: otpRecord.attempts + 1,
      },
    });

    // Verify code
    if (otpRecord.code !== code) {
      return false;
    }

    // Mark as verified
    await this.prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: {
        verified: true,
      },
    });

    this.logger.log(`OTP verified for ${phone}`, 'OtpService');
    return true;
  }

  /**
   * Clean up expired OTPs (can be run as a scheduled job)
   */
  async cleanupExpiredOtps(): Promise<void> {
    const deleted = await this.prisma.otpVerification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned up ${deleted.count} expired OTPs`, 'OtpService');
  }
}
