import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { LoggerService } from '@/common/services/logger.service';
import { AuditService } from '@/common/services/audit.service';
import { PaystackService } from '@/common/services/paystack.service';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { InitializePaymentDto, LinkPaystackAccountDto } from './dto';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private audit: AuditService,
    private paystack: PaystackService,
  ) {}

  /**
   * Initialize payment for an order
   * Creates Paystack transaction with merchant subaccount for direct payment
   */
  async initializePayment(userId: string, dto: InitializePaymentDto) {
    // Get order with merchant details
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        store: {
          include: {
            merchant: {
              include: {
                paystackAccount: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify order belongs to user
    if (order.customerEmail !== dto.email && order.customerPhone !== dto.phone) {
      throw new BadRequestException('Order does not match provided contact information');
    }

    // Check if order is already paid
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Order already paid');
    }

    // Get merchant's Paystack subaccount
    const merchant = order.store.merchant;
    if (!merchant.paystackAccount) {
      throw new BadRequestException(
        'Merchant has not linked payment account. Please contact support.',
      );
    }

    // Generate unique reference
    const reference = `ORD-${order.orderNumber}-${Date.now()}`;

    // Initialize Paystack transaction
    const transaction = await this.paystack.initializeTransaction({
      email: dto.email,
      amount: Math.round(Number(order.total) * 100), // Convert to pesewas
      currency: 'GHS',
      reference,
      callbackUrl: dto.callbackUrl,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        merchantId: merchant.id,
        storeId: order.storeId,
        customerPhone: dto.phone,
      },
      subaccount: merchant.paystackAccount.paystackSubaccountCode || undefined,
      transactionCharge: 0, // Platform doesn't charge extra
      bearer: 'account', // Platform bears Paystack fees
    });

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.total,
        currency: 'GHS',
        method: 'CARD',
        paystackReference: reference,
        paystackAccessCode: transaction.access_code,
        paystackAuthUrl: transaction.authorization_url,
        status: PaymentStatus.PENDING,
        metadata: {
          access_code: transaction.access_code,
          authorization_url: transaction.authorization_url,
        },
      },
    });

    await this.audit.log({
      userId,
      action: 'PAYMENT',
      entity: 'Payment',
      entityId: payment.id,
      metadata: { orderId: order.id, amount: order.total },
    });

    this.logger.log(
      `Payment initialized: ${reference} for order ${order.orderNumber}`,
      'PaymentsService',
    );

    return {
      payment,
      authorization_url: transaction.authorization_url,
      access_code: transaction.access_code,
      reference: transaction.reference,
    };
  }

  /**
   * Verify payment after Paystack callback
   */
  async verifyPayment(reference: string) {
    // Verify with Paystack
    const paystackData = await this.paystack.verifyTransaction(reference);

    // Find payment record
    const payment = await this.prisma.payment.findFirst({
      where: { paystackReference: reference },
      include: {
        order: {
          include: {
            store: {
              include: {
                merchant: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Update payment status
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status:
          paystackData.status === 'success'
            ? PaymentStatus.COMPLETED
            : PaymentStatus.FAILED,
        verifiedAt: paystackData.status === 'success' ? new Date() : null,
        webhookVerified: true,
        webhookPayload: paystackData,
      },
    });

    // Update order status if payment successful
    if (paystackData.status === 'success') {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
          paidAt: new Date(),
          status: OrderStatus.PREPARING,
        },
      });

      this.logger.log(
        `Payment verified successfully: ${reference}`,
        'PaymentsService',
      );
    }

    return {
      payment: updatedPayment,
      verified: paystackData.status === 'success',
      message:
        paystackData.status === 'success'
          ? 'Payment successful'
          : 'Payment failed',
    };
  }

  /**
   * Handle Paystack webhook events
   */
  async handleWebhook(signature: string, body: string) {
    // Verify webhook signature
    if (!this.paystack.verifyWebhookSignature(signature, body)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(body);

    this.logger.log(
      `Webhook received: ${event.event}`,
      'PaymentsService',
    );

    switch (event.event) {
      case 'charge.success':
        await this.handleChargeSuccess(event.data);
        break;

      case 'transfer.success':
        await this.handleTransferSuccess(event.data);
        break;

      case 'transfer.failed':
        await this.handleTransferFailed(event.data);
        break;

      default:
        this.logger.log(
          `Unhandled webhook event: ${event.event}`,
          'PaymentsService',
        );
    }

    return { status: 'success' };
  }

  /**
   * Handle successful charge webhook
   */
  private async handleChargeSuccess(data: any) {
    const payment = await this.prisma.payment.findFirst({
      where: { paystackReference: data.reference },
    });

    if (payment && payment.status === PaymentStatus.PENDING) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          verifiedAt: new Date(),
          webhookReceived: true,
          webhookPayload: data,
        },
      });

      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
          paidAt: new Date(),
          status: OrderStatus.PREPARING,
        },
      });
    }
  }

  /**
   * Handle successful transfer webhook
   */
  private async handleTransferSuccess(data: any) {
    this.logger.log(
      `Transfer successful: ${data.reference}`,
      'PaymentsService',
    );
  }

  /**
   * Handle failed transfer webhook
   */
  private async handleTransferFailed(data: any) {
    this.logger.error(
      `Transfer failed: ${data.reference}`,
      data.reason,
      'PaymentsService',
    );
  }

  /**
   * Link merchant Paystack account (create subaccount)
   */
  async linkMerchantPaystackAccount(userId: string, dto: LinkPaystackAccountDto) {
    // Get merchant
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
      include: {
        paystackAccount: true,
        user: true,
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }

    // Check if already linked
    if (merchant.paystackAccount) {
      throw new ConflictException('Paystack account already linked');
    }

    // Validate bank account with Paystack
    const validation = await this.paystack.validateBankAccount(
      dto.accountNumber,
      dto.bankCode,
    );

    // Create Paystack subaccount
    const subaccount = await this.paystack.createSubaccount({
      businessName: merchant.businessName || 'Ghana Commerce Merchant',
      settlementBank: dto.bankCode,
      accountNumber: dto.accountNumber,
      percentageCharge: 0, // Merchant gets 100% of payment
      description: `Subaccount for ${merchant.businessName}`,
      primaryContactEmail: merchant.businessEmail || merchant.user.email,
      primaryContactName: validation.account_name,
      primaryContactPhone: merchant.primaryPhone,
    });

    // Save to database
    const paystackAccount = await this.prisma.paystackAccount.create({
      data: {
        merchantId: merchant.id,
        paystackSubaccountCode: subaccount.subaccount_code,
        businessName: merchant.businessName || dto.bankName,
        settlementBank: dto.bankCode,
        accountNumber: dto.accountNumber,
        isActive: true,
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'PaystackAccount',
      entityId: paystackAccount.id,
      metadata: { subaccountCode: subaccount.subaccount_code },
    });

    this.logger.log(
      `Paystack account linked for merchant ${merchant.id}`,
      'PaymentsService',
    );

    return {
      paystackAccount,
      message: 'Paystack account linked successfully',
    };
  }

  /**
   * Get merchant's Paystack account
   */
  async getMerchantPaystackAccount(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
      include: {
        paystackAccount: true,
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }

    if (!merchant.paystackAccount) {
      return {
        linked: false,
        message: 'No Paystack account linked',
      };
    }

    return {
      linked: true,
      account: merchant.paystackAccount,
    };
  }

  /**
   * Get list of Ghana banks
   */
  async getBanks() {
    const banks = await this.paystack.getBanks();
    return { banks };
  }
}
