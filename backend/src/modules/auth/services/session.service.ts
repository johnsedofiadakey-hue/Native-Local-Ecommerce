import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/services/prisma.service';
import { LoggerService } from '@/common/services/logger.service';

@Injectable()
export class SessionService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  /**
   * Create new session
   */
  async createSession(data: {
    userId: string;
    token: string;
    refreshToken: string;
    ipAddress: string;
    userAgent?: string;
  }) {
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() +
        parseInt(this.configService.get('JWT_REFRESH_EXPIRES_IN', '30').replace('d', '')),
    );

    return this.prisma.session.create({
      data: {
        userId: data.userId,
        token: data.token,
        refreshToken: data.refreshToken,
        expiresAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent || 'Unknown',
        isActive: true,
      },
    });
  }

  /**
   * Invalidate session by token
   */
  async invalidateSession(token: string) {
    return this.prisma.session.updateMany({
      where: { token },
      data: { isActive: false },
    });
  }

  /**
   * Invalidate all user sessions
   */
  async invalidateUserSessions(userId: string) {
    const result = await this.prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    this.logger.log(
      `Invalidated ${result.count} sessions for user ${userId}`,
      'SessionService',
    );

    return result;
  }

  /**
   * Update session tokens (during refresh)
   */
  async updateSessionTokens(
    oldRefreshToken: string,
    newToken: string,
    newRefreshToken: string,
  ) {
    return this.prisma.session.update({
      where: { refreshToken: oldRefreshToken },
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  }

  /**
   * Get active sessions for user
   */
  async getUserSessions(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    const deleted = await this.prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned up ${deleted.count} expired sessions`, 'SessionService');
    return deleted.count;
  }
}
