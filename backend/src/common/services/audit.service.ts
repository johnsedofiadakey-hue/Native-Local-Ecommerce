import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create immutable audit log entry
   * All administrative actions, security events, and critical operations must be logged
   */
  async log(params: {
    userId?: string;
    action: AuditAction;
    entity: string;
    entityId: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldValues: params.oldValues || undefined,
        newValues: params.newValues || undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata || undefined,
      },
    });
  }

  /**
   * Log user authentication events
   */
  async logAuth(
    action: 'LOGIN' | 'LOGOUT',
    userId: string,
    ipAddress: string,
    userAgent?: string,
    success: boolean = true,
  ) {
    return this.log({
      userId,
      action: action as AuditAction,
      entity: 'User',
      entityId: userId,
      ipAddress,
      userAgent,
      metadata: { success },
    });
  }

  /**
   * Log payment events (critical for financial tracking)
   */
  async logPayment(
    userId: string,
    orderId: string,
    amount: number,
    status: string,
    paystackReference: string,
  ) {
    return this.log({
      userId,
      action: 'PAYMENT' as AuditAction,
      entity: 'Payment',
      entityId: orderId,
      metadata: {
        amount,
        status,
        paystackReference,
      },
    });
  }

  /**
   * Log merchant verification events
   */
  async logVerification(
    adminId: string,
    merchantId: string,
    oldStatus: string,
    newStatus: string,
    notes?: string,
  ) {
    return this.log({
      userId: adminId,
      action: 'VERIFICATION' as AuditAction,
      entity: 'Merchant',
      entityId: merchantId,
      oldValues: { verificationStatus: oldStatus },
      newValues: { verificationStatus: newStatus },
      metadata: { notes },
    });
  }

  /**
   * Log enforcement actions
   */
  async logEnforcement(
    adminId: string,
    merchantId: string,
    action: string,
    reason: string,
  ) {
    return this.log({
      userId: adminId,
      action: 'ENFORCEMENT' as AuditAction,
      entity: 'Merchant',
      entityId: merchantId,
      metadata: {
        enforcementAction: action,
        reason,
      },
    });
  }

  /**
   * Log admin override actions (high security)
   */
  async logOverride(
    adminId: string,
    entity: string,
    entityId: string,
    overrideAction: string,
    reason: string,
  ) {
    return this.log({
      userId: adminId,
      action: 'OVERRIDE' as AuditAction,
      entity,
      entityId,
      metadata: {
        overrideAction,
        reason,
      },
    });
  }

  /**
   * Get audit trail for entity
   */
  async getAuditTrail(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entity,
        entityId,
      },
      orderBy: {
        createdAt: 'desc',
      },
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
  }

  /**
   * Get user activity logs
   */
  async getUserActivity(userId: string, limit: number = 50) {
    return this.prisma.auditLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }
}
