import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/services/prisma.service';
import { AuditService } from '@/common/services/audit.service';
import { LoggerService } from '@/common/services/logger.service';
import { UserRole } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { OtpService } from './services/otp.service';
import { SessionService } from './services/session.service';
import { formatGhanaPhone } from '@/common/utils/helpers';
import { ERROR_MESSAGES } from '@/common/constants';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
    private logger: LoggerService,
    private otpService: OtpService,
    private sessionService: SessionService,
  ) {}

  /**
   * Register new user account
   */
  async register(registerDto: RegisterDto, ipAddress: string, userAgent?: string) {
    const { email, phone, password, role } = registerDto;

    // Format phone number
    const formattedPhone = formatGhanaPhone(phone);

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone: formattedPhone }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email already registered');
      }
      throw new ConflictException('Phone number already registered');
    }

    // Hash password
    const saltRounds = parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS', '12')) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        phone: formattedPhone,
        passwordHash,
        role: role || UserRole.CUSTOMER,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        phoneVerified: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Log registration
    await this.auditService.log({
      userId: user.id,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      ipAddress,
      userAgent,
      metadata: { email, phone: formattedPhone, role: user.role },
    });

    this.logger.log(`New user registered: ${email}`, 'AuthService');

    // Send OTP for phone verification
    await this.otpService.sendOtp(formattedPhone, 'SIGNUP');

    return {
      user,
      message: 'Registration successful. Please verify your phone number.',
    };
  }

  /**
   * Login with email/phone and password
   */
  async login(loginDto: LoginDto, ipAddress: string, userAgent?: string) {
    const { identifier, password } = loginDto;

    // Find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: formatGhanaPhone(identifier) }],
      },
    });

    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 1000 / 60,
      );
      throw new UnauthorizedException(
        `Account locked. Try again in ${remainingTime} minutes.`,
      );
    }

    // Check if account is banned
    if (user.isBanned) {
      await this.auditService.log({
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
        metadata: { success: false, reason: 'Account banned' },
      });
      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.ACCOUNT_BANNED);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updates: any = { failedLoginAttempts: failedAttempts };

      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        this.logger.security(
          `Account locked after 5 failed login attempts: ${user.email}`,
          'AuthService',
          { userId: user.id, ipAddress },
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updates,
      });

      throw new UnauthorizedException(ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Reset failed login attempts on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Create session
    await this.sessionService.createSession({
      userId: user.id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      ipAddress,
      userAgent,
    });

    // Log successful login
    await this.auditService.logAuth('LOGIN', user.id, ipAddress, userAgent, true);

    this.logger.log(`User logged in: ${user.email}`, 'AuthService');

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        phoneVerified: user.phoneVerified,
        emailVerified: user.emailVerified,
      },
      tokens,
    };
  }

  /**
   * Request OTP for phone verification
   */
  async requestOtp(requestOtpDto: RequestOtpDto) {
    const { phone, purpose } = requestOtpDto;
    const formattedPhone = formatGhanaPhone(phone);

    await this.otpService.sendOtp(formattedPhone, purpose);

    return {
      message: `OTP sent to ${formattedPhone}`,
    };
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { phone, code, purpose } = verifyOtpDto;
    const formattedPhone = formatGhanaPhone(phone);

    const isValid = await this.otpService.verifyOtp(formattedPhone, code, purpose);

    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP code');
    }

    // Update user verification status
    if (purpose === 'SIGNUP' || purpose === 'PHONE_VERIFICATION') {
      await this.prisma.user.update({
        where: { phone: formattedPhone },
        data: { phoneVerified: true },
      });
    }

    return {
      message: 'Phone number verified successfully',
    };
  }

  /**
   * Initiate password reset
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      return {
        message: 'If the email exists, a reset code has been sent.',
      };
    }

    // Send OTP to user's phone
    await this.otpService.sendOtp(user.phone, 'PASSWORD_RESET');

    this.logger.log(`Password reset requested for: ${email}`, 'AuthService');

    return {
      message: 'Reset code sent to your registered phone number.',
      phone: user.phone.replace(/(\+233\d{2})\d{5}(\d{2})/, '$1*****$2'), // Mask phone
    };
  }

  /**
   * Reset password with OTP verification
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { phone, code, newPassword } = resetPasswordDto;
    const formattedPhone = formatGhanaPhone(phone);

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(formattedPhone, code, 'PASSWORD_RESET');

    if (!isValid) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { phone: formattedPhone },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Hash new password
    const saltRounds = parseInt(this.configService.get<string>('BCRYPT_SALT_ROUNDS', '12')) || 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear lockout
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Invalidate all existing sessions
    await this.sessionService.invalidateUserSessions(user.id);

    this.logger.log(`Password reset successful for: ${user.email}`, 'AuthService');

    return {
      message: 'Password reset successful. Please login with your new password.',
    };
  }

  /**
   * Logout user
   */
  async logout(userId: string, token: string, ipAddress: string) {
    await this.sessionService.invalidateSession(token);
    await this.auditService.logAuth('LOGOUT', userId, ipAddress);

    this.logger.log(`User logged out: ${userId}`, 'AuthService');

    return {
      message: 'Logged out successfully',
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify session exists
      const session = await this.prisma.session.findUnique({
        where: { refreshToken },
      });

      if (!session || !session.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update session
      await this.sessionService.updateSessionTokens(
        refreshToken,
        tokens.accessToken,
        tokens.refreshToken,
      );

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        phoneVerified: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
    };
  }

  /**
   * Validate user for passport strategies
   */
  async validateUser(identifier: string, password: string): Promise<any> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: formatGhanaPhone(identifier) }],
      },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }
}
