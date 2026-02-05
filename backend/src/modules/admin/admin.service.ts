import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import {
  VerifyMerchantDto,
  VerificationAction,
} from './dto/verify-merchant.dto';
import {
  EnforcementActionDto,
  EnforcementActionType,
} from './dto/enforcement-action.dto';
import { MerchantQueryDto, UserQueryDto } from './dto/admin-query.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Get all merchants with filtering and pagination
   */
  async getMerchants(query: MerchantQueryDto) {
    this.logger.log('Getting merchants list');

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { businessName: { contains: query.search, mode: 'insensitive' } },
        { businessPhone: { contains: query.search } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [merchants, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              stores: true,
            },
          },
        },
        take: query.limit || 20,
        skip: ((query.page || 1) - 1) * (query.limit || 20),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.merchant.count({ where }),
    ]);

    return {
      merchants,
      pagination: {
        page: query.page || 1,
        limit: query.limit || 20,
        total,
        pages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  /**
   * Get single merchant details
   */
  async getMerchant(merchantId: string) {
    this.logger.log(`Getting merchant: ${merchantId}`);

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        stores: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            status: true,
            isPublished: true,
            createdAt: true,
          },
        },
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // Get order statistics
    const orderStats = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        store: { merchantId },
      },
      _count: true,
      _sum: { total: true },
    });

    return {
      merchant,
      statistics: {
        storeCount: merchant.stores.length,
        orders: orderStats.map((stat) => ({
          status: stat.status,
          count: stat._count,
          revenue: stat._sum.total?.toString() || '0',
        })),
      },
    };
  }

  /**
   * Verify (approve/reject) merchant application
   */
  async verifyMerchant(
    merchantId: string,
    dto: VerifyMerchantDto,
    adminId: string,
  ) {
    this.logger.log(
      `Verifying merchant ${merchantId}: ${dto.action} by admin ${adminId}`,
    );

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { user: true },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    if (merchant.status !== 'PENDING_VERIFICATION') {
      throw new BadRequestException(
        `Cannot verify merchant with status: ${merchant.status}`,
      );
    }

    const newStatus = dto.action === VerificationAction.APPROVE ? 'VERIFIED' : 'REJECTED';

    const updatedMerchant = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        status: newStatus as any,
        verifiedAt: dto.action === VerificationAction.APPROVE ? new Date() : null,
        verifiedBy: dto.action === VerificationAction.APPROVE ? adminId : null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Log audit trail
    await this.auditService.log({
      userId: adminId,
      action: dto.action === VerificationAction.APPROVE ? 'MERCHANT_APPROVED' : 'MERCHANT_REJECTED',
      entity: 'MERCHANT',
      entityId: merchantId,
      metadata: {
        merchantId,
        action: dto.action,
        reason: dto.reason,
        notes: dto.notes,
      },
      ipAddress: 'admin-panel',
    });

    return updatedMerchant;
  }

  /**
   * Execute enforcement action (suspend, ban, disable)
   */
  async executeEnforcementAction(
    dto: EnforcementActionDto,
    adminId: string,
  ) {
    this.logger.log(
      `Executing enforcement action: ${dto.actionType} on ${dto.targetId}`,
    );

    let result: any;

    switch (dto.actionType) {
      case EnforcementActionType.SUSPEND_MERCHANT:
        result = await this.prisma.merchant.update({
          where: { id: dto.targetId },
          data: { status: 'SUSPENDED' as any },
        });
        break;

      case EnforcementActionType.UNSUSPEND_MERCHANT:
        result = await this.prisma.merchant.update({
          where: { id: dto.targetId },
          data: { status: 'VERIFIED' as any },
        });
        break;

      case EnforcementActionType.BAN_MERCHANT:
        result = await this.prisma.merchant.update({
          where: { id: dto.targetId },
          data: { status: 'BANNED' as any },
        });
        // Also disable all stores
        await this.prisma.store.updateMany({
          where: { merchantId: dto.targetId },
          data: { isPublished: false },
        });
        break;

      case EnforcementActionType.DISABLE_STORE:
        result = await this.prisma.store.update({
          where: { id: dto.targetId },
          data: { isPublished: false },
        });
        break;

      case EnforcementActionType.ENABLE_STORE:
        result = await this.prisma.store.update({
          where: { id: dto.targetId },
          data: { isPublished: true },
        });
        break;

      case EnforcementActionType.REMOVE_PRODUCT:
        result = await this.prisma.product.delete({
          where: { id: dto.targetId },
        });
        break;

      default:
        throw new BadRequestException('Invalid enforcement action type');
    }

    // Log audit trail
    await this.auditService.log({
      userId: adminId,
      action: 'ADMIN_ACTION' as any,
      entity: 'ENFORCEMENT',
      entityId: dto.targetId,
      metadata: {
        targetId: dto.targetId,
        actionType: dto.actionType,
        reason: dto.reason,
        notes: dto.notes,
      },
      ipAddress: 'admin-panel',
    });

    return result;
  }

  /**
   * Get all users with filtering
   */
  async getUsers(query: UserQueryDto) {
    this.logger.log('Getting users list');

    const where: any = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          merchant: {
            select: {
              id: true,
              businessName: true,
              status: true,
            },
          },
        },
        take: query.limit || 20,
        skip: ((query.page || 1) - 1) * (query.limit || 20),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page: query.page || 1,
        limit: query.limit || 20,
        total,
        pages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  /**
   * Get platform configuration
   */
  async getConfig() {
    this.logger.log('Getting platform configuration');

    // In a real app, this would come from a database table
    // For now, return hardcoded defaults
    return {
      platformCommissionRate: 5, // 5%
      maintenanceMode: false,
      maintenanceMessage: null,
      allowNewMerchants: true,
      minOrderAmount: 10,
      maxOrderAmount: 10000,
    };
  }

  /**
   * Update platform configuration
   */
  async updateConfig(dto: UpdateConfigDto, adminId: string) {
    this.logger.log('Updating platform configuration');

    // In a real app, save to database
    // For now, just log the change
    await this.auditService.log({
      userId: adminId,
      action: 'UPDATE' as any,
      entity: 'PLATFORM_CONFIG',
      entityId: 'config',
      metadata: dto,
      ipAddress: 'admin-panel',
    });

    return {
      ...dto,
      updatedBy: adminId,
      updatedAt: new Date(),
    };
  }

  /**
   * Get platform statistics for admin dashboard
   */
  async getDashboardStats() {
    this.logger.log('Getting admin dashboard statistics');

    const [
      totalUsers,
      totalMerchants,
      pendingMerchants,
      approvedMerchants,
      totalStores,
      activeStores,
      totalProducts,
      totalOrders,
      totalRevenue,
      recentMerchants,
      recentOrders,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.merchant.count(),
      this.prisma.merchant.count({ where: { status: 'PENDING_VERIFICATION' } }),
      this.prisma.merchant.count({ where: { status: 'VERIFIED' } }),
      this.prisma.store.count(),
      this.prisma.store.count({ where: { isPublished: true } }),
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        where: {
          status: { in: ['COMPLETED', 'DELIVERED'] },
        },
        _sum: { total: true },
      }),
      this.prisma.merchant.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          store: {
            select: {
              name: true,
              merchant: {
                select: {
                  businessName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      overview: {
        totalUsers,
        totalMerchants,
        pendingMerchants,
        approvedMerchants,
        totalStores,
        activeStores,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue._sum.total?.toString() || '0',
      },
      recentMerchants,
      recentOrders,
    };
  }

  /**
   * Get audit logs for a specific resource
   */
  async getAuditLogs(resourceType?: string, resourceId?: string, limit = 50) {
    this.logger.log(`Getting audit logs: ${resourceType} ${resourceId}`);

    const where: any = {};

    if (resourceType) {
      where.resource = resourceType;
    }

    if (resourceId) {
      where.resourceId = resourceId;
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return logs;
  }
}
