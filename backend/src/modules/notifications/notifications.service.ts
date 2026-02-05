import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/services/prisma.service';
import axios from 'axios';
import {
  SendSmsDto,
  OrderNotificationDto,
  MerchantAlertDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly hubtelApiKey: string;
  private readonly hubtelClientId: string;
  private readonly hubtelClientSecret: string;
  private readonly defaultSender: string;
  private readonly smsEnabled: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.hubtelApiKey = this.configService.get('HUBTEL_API_KEY') || '';
    this.hubtelClientId = this.configService.get('HUBTEL_CLIENT_ID') || '';
    this.hubtelClientSecret = this.configService.get('HUBTEL_CLIENT_SECRET') || '';
    this.defaultSender = this.configService.get('SMS_SENDER_ID') || 'CommerceGH';
    this.smsEnabled = this.configService.get('SMS_ENABLED') === 'true';
  }

  /**
   * Send SMS via Hubtel API
   */
  async sendSms(dto: SendSmsDto): Promise<any> {
    if (!this.smsEnabled) {
      this.logger.log('SMS disabled - would send:', dto);
      return { success: true, message: 'SMS disabled in development' };
    }

    try {
      const response = await axios.post(
        'https://sms.hubtel.com/v1/messages/send',
        {
          From: dto.sender || this.defaultSender,
          To: this.formatPhoneNumber(dto.to),
          Content: dto.message,
        },
        {
          auth: {
            username: this.hubtelClientId,
            password: this.hubtelClientSecret,
          },
        },
      );

      this.logger.log(`SMS sent to ${dto.to}: ${response.data.MessageId}`);

      // Log notification in database
      await this.logNotification({
        channel: 'SMS',
        recipient: dto.to,
        message: dto.message,
        status: 'SENT',
        metadata: { messageId: response.data.MessageId },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${dto.to}:`, error.message);

      await this.logNotification({
        channel: 'SMS',
        recipient: dto.to,
        message: dto.message,
        status: 'FAILED',
        metadata: { error: error.message },
      });

      throw error;
    }
  }

  /**
   * Send order status notification to customer
   */
  async sendOrderNotification(dto: OrderNotificationDto): Promise<void> {
    this.logger.log(`Sending order notification: ${dto.orderId} - ${dto.status}`);

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
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
    });

    if (!order) {
      this.logger.warn(`Order not found: ${dto.orderId}`);
      return;
    }

    const message = this.buildOrderStatusMessage(order, dto.status, dto.note);

    try {
      await this.sendSms({
        to: order.customerPhone,
        message,
      });
    } catch (error) {
      this.logger.error(`Failed to send order notification: ${error.message}`);
    }
  }

  /**
   * Send alert to merchant
   */
  async sendMerchantAlert(dto: MerchantAlertDto): Promise<void> {
    this.logger.log(`Sending merchant alert: ${dto.merchantId}`);

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchantId },
      select: {
        primaryPhone: true,
        businessName: true,
      },
    });

    if (!merchant) {
      this.logger.warn(`Merchant not found: ${dto.merchantId}`);
      return;
    }

    const message = `${merchant.businessName}: ${dto.message}`;

    try {
      await this.sendSms({
        to: merchant.primaryPhone,
        message,
      });
    } catch (error) {
      this.logger.error(`Failed to send merchant alert: ${error.message}`);
    }
  }

  /**
   * Send new order alert to merchant
   */
  async notifyMerchantNewOrder(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          select: {
            name: true,
            merchantId: true,
            merchant: {
              select: {
                primaryPhone: true,
                businessName: true,
              },
            },
          },
        },
      },
    });

    if (!order) return;

    const message = `New Order ${order.orderNumber}: GHS ${order.total} - ${order.customerName} (${order.customerPhone}). View: commercegh.com/orders/${order.orderNumber}`;

    try {
      await this.sendSms({
        to: order.store.merchant.primaryPhone,
        message,
        sender: 'CommerceGH',
      });
    } catch (error) {
      this.logger.error(`Failed to notify merchant of new order: ${error.message}`);
    }
  }

  /**
   * Send review notification to merchant
   */
  async notifyMerchantNewReview(reviewId: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: {
          select: {
            name: true,
          },
        },
        store: {
          select: {
            merchantId: true,
            merchant: {
              select: {
                primaryPhone: true,
                businessName: true,
              },
            },
          },
        },
      },
    });

    if (!review) return;

    const stars = '⭐'.repeat(review.rating);
    const message = `New ${review.rating}-star review ${stars} on ${review.product.name}${review.title ? ': "' + review.title + '"' : ''}. Reply on your dashboard.`;

    try {
      await this.sendSms({
        to: review.store.merchant.primaryPhone,
        message,
      });
    } catch (error) {
      this.logger.error(`Failed to notify merchant of new review: ${error.message}`);
    }
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(userId?: string, limit = 50) {
    const where: any = {};

    if (userId) {
      // Get user's phone/email to filter notifications
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, email: true },
      });

      if (user) {
        where.OR = [
          { recipient: user.phone },
          { recipient: user.email },
        ];
      }
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return notifications;
  }

  // ========== Private Helper Methods ==========

  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with 233
    if (cleaned.startsWith('0')) {
      cleaned = '233' + cleaned.substring(1);
    }

    // Ensure it starts with 233
    if (!cleaned.startsWith('233')) {
      cleaned = '233' + cleaned;
    }

    return cleaned;
  }

  private buildOrderStatusMessage(order: any, status: string, note?: string): string {
    const storeName = order.store.name;
    const orderNumber = order.orderNumber;
    const total = order.total;

    const messages: Record<string, string> = {
      PLACED: `Order ${orderNumber} placed! Total: GHS ${total}. Track: commercegh.com/track/${orderNumber}`,
      ACCEPTED: `${storeName} accepted order ${orderNumber}. Your order is being prepared.`,
      PREPARING: `${storeName} is preparing order ${orderNumber}. ${order.deliveryOption === 'PICKUP' ? 'Ready for pickup soon' : 'Will be delivered soon'}.`,
      READY_FOR_PICKUP: `Order ${orderNumber} ready for pickup at ${storeName}! Address: ${order.store.address || storeName}`,
      OUT_FOR_DELIVERY: `Order ${orderNumber} is on the way! Expect delivery within 30-60 minutes.`,
      DELIVERED: `Order ${orderNumber} delivered! Enjoy your purchase. Rate your experience: commercegh.com/review/${orderNumber}`,
      COMPLETED: `Order ${orderNumber} completed. Thank you for shopping with ${storeName}!`,
      CANCELLED: `Order ${orderNumber} cancelled${note ? ': ' + note : ''}. Refund processed if applicable.`,
    };

    return messages[status] || `Order ${orderNumber} status: ${status}`;
  }

  private async logNotification(data: {
    channel: string;
    recipient: string;
    message: string;
    status: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          channel: data.channel,
          recipient: data.recipient,
          subject: null,
          message: data.message,
          status: data.status,
          metadata: data.metadata || {},
        },
      });
    } catch (error) {
      this.logger.error('Failed to log notification:', error.message);
    }
  }
}
