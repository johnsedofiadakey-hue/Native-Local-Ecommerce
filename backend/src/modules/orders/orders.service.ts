import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { LoggerService } from '@/common/services/logger.service';
import { AuditService } from '@/common/services/audit.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  OrderQueryDto,
} from './dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create a new order (no login required - universal tracking)
   */
  async createOrder(dto: CreateOrderDto, userId?: string) {
    // Validate store exists and is active
    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
      include: {
        merchant: true,
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.status !== 'ACTIVE' || !store.isPublished) {
      throw new BadRequestException('Store is not available for orders');
    }

    // Validate delivery address for MERCHANT_DELIVERY
    if (dto.deliveryOption === 'MERCHANT_DELIVERY') {
      if (!dto.deliveryAddress || !dto.deliveryCity) {
        throw new BadRequestException(
          'Delivery address and city are required for merchant delivery',
        );
      }
    }

    // Fetch and validate all products
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId: dto.storeId,
        isAvailable: true,
      },
      include: {
        variants: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Some products are not available');
    }

    // Calculate order totals and validate stock
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of dto.items) {
      const product = products.find((p: any) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }

      let price = product.price;
      let variantName: string | null = null;
      let stockQuantity = product.stockQuantity;

      // Handle variant
      if (item.variantId) {
        const variant = product.variants.find((v: any) => v.id === item.variantId);
        if (!variant || !variant.isAvailable) {
          throw new BadRequestException(
            `Variant ${item.variantId} not available`,
          );
        }
        price = variant.price || product.price;
        variantName = variant.name;
        stockQuantity = variant.stockQuantity;
      }

      // Validate stock
      if (product.trackInventory && stockQuantity !== null) {
        if (stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Available: ${stockQuantity}`,
          );
        }
      }

      const itemSubtotal = Number(price) * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        productId: item.productId,
        variantId: item.variantId,
        productName: product.name,
        variantName,
        price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        productSnapshot: {
          name: product.name,
          description: product.description,
          images: product.images,
          sku: product.sku,
        },
      });
    }

    // Calculate fees and totals
    const deliveryFee = this.calculateDeliveryFee(dto.deliveryOption, dto.deliveryCity);
    const tax = 0; // Ghana doesn't require VAT on most retail
    const discount = 0; // TODO: Implement discount codes
    const total = subtotal + deliveryFee + tax - discount;

    // Generate unique order number
    const orderNumber = await this.generateOrderNumber();

    // Create order in transaction
    const order = await this.prisma.$transaction(async (tx: any) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          storeId: dto.storeId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerEmail: dto.customerEmail,
          status: 'PLACED',
          subtotal,
          deliveryFee,
          tax,
          discount,
          total,
          deliveryOption: dto.deliveryOption,
          deliveryAddress: dto.deliveryAddress,
          deliveryCity: dto.deliveryCity,
          deliveryArea: dto.deliveryArea,
          deliveryNotes: dto.deliveryNotes,
          paymentMethod: dto.paymentMethod,
          paymentStatus: dto.paymentMethod === 'CASH_ON_DELIVERY' ? 'PENDING' : 'PENDING',
          customerNotes: dto.customerNotes,
          statusHistory: [
            {
              status: 'PLACED',
              timestamp: new Date().toISOString(),
              note: 'Order placed',
            },
          ],
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                },
              },
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true,
              area: true,
            },
          },
        },
      });

      // Deduct stock for products with inventory tracking
      for (const item of dto.items) {
        const product = products.find((p: any) => p.id === item.productId);
        if (product && product.trackInventory) {
          if (item.variantId) {
            // Update variant stock
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                stockQuantity: { decrement: item.quantity },
              },
            });
          } else {
            // Update product stock
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: { decrement: item.quantity },
              },
            });
          }
        }

        // Increment order count
        await tx.product.update({
          where: { id: item.productId },
          data: {
            orderCount: { increment: item.quantity },
          },
        });
      }

      return newOrder;
    });

    await this.audit.log({
      userId: userId || undefined,
      action: 'CREATE',
      entity: 'Order',
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        storeId: dto.storeId,
        total: order.total,
        customerPhone: dto.customerPhone,
      },
    });

    this.logger.log(
      `Order created: ${order.orderNumber} for store ${dto.storeId}`,
      'OrdersService',
    );

    return order;
  }

  /**
   * Get orders with filters (merchant or admin)
   */
  async getOrders(userId: string, query: OrderQueryDto) {
    const {
      storeId,
      customerPhone,
      status,
      paymentStatus,
      paymentMethod,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    // Get user's merchant ID
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
      include: { stores: true },
    });

    if (!merchant) {
      throw new ForbiddenException('Only merchants can access this endpoint');
    }

    const storeIds = merchant.stores.map((s: any) => s.id);

    const where: any = {
      storeId: { in: storeIds },
    };

    if (storeId && storeIds.includes(storeId)) {
      where.storeId = storeId;
    }

    if (customerPhone) {
      where.customerPhone = customerPhone;
    }

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: true,
                },
              },
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
              },
            },
          },
        },
        store: {
          include: {
            merchant: {
              select: {
                id: true,
                businessName: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check permissions - merchant or customer
    if (userId) {
      const merchant = await this.prisma.merchant.findUnique({
        where: { userId },
      });

      if (merchant && order.store.merchantId === merchant.id) {
        return { ...order, isMerchant: true };
      }
    }

    // For public access, return limited info (customer can track with phone)
    return order;
  }

  /**
   * Get order by order number (PUBLIC - for universal tracking)
   */
  async getOrderByNumber(orderNumber: string, customerPhone?: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
              },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify customer phone if provided (security)
    if (customerPhone && order.customerPhone !== customerPhone) {
      throw new ForbiddenException('Invalid order number or phone number');
    }

    return order;
  }

  /**
   * Update order status (merchant only)
   */
  async updateOrderStatus(
    userId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: {
          include: {
            merchant: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant || order.store.merchantId !== merchant.id) {
      throw new ForbiddenException('You do not own this order');
    }

    // Validate status transition
    this.validateStatusTransition(order.status as any, dto.status as any);

    // Prepare status history update
    const statusHistory = [...(order.statusHistory as any[])];
    if (dto.status) {
      statusHistory.push({
        status: dto.status,
        timestamp: new Date().toISOString(),
        note: dto.merchantNotes || `Status updated to ${dto.status}`,
      });
    }

    // Update timestamps based on status
    const timestamps: any = {};
    if (dto.status === 'ACCEPTED') timestamps.acceptedAt = new Date();
    if (dto.status === 'PREPARING') timestamps.preparingAt = new Date();
    if (dto.status === 'READY_FOR_PICKUP') timestamps.readyAt = new Date();
    if (dto.status === 'DELIVERED') timestamps.deliveredAt = new Date();
    if (dto.status === 'COMPLETED') timestamps.completedAt = new Date();
    if (dto.status === 'CANCELLED') timestamps.cancelledAt = new Date();

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        merchantNotes: dto.merchantNotes,
        trackingUrl: dto.trackingUrl,
        statusHistory,
        ...timestamps,
      },
      include: {
        items: true,
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Order',
      entityId: orderId,
      metadata: {
        oldStatus: order.status,
        newStatus: dto.status,
        orderNumber: order.orderNumber,
      },
    });

    this.logger.log(
      `Order ${order.orderNumber} status updated to ${dto.status}`,
      'OrdersService',
    );

    return updated;
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: string,
    dto: CancelOrderDto,
    userId?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        store: {
          include: {
            merchant: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check if order can be cancelled
    if (['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order with status ${order.status}`);
    }

    // Only merchant or admin can cancel after ACCEPTED
    if (order.status !== 'PLACED' && userId) {
      const merchant = await this.prisma.merchant.findUnique({
        where: { userId },
      });

      if (!merchant || order.store.merchantId !== merchant.id) {
        throw new ForbiddenException(
          'Only merchant can cancel accepted orders',
        );
      }
    }

    // Restore stock in transaction
    await this.prisma.$transaction(async (tx: any) => {
      // Update order status
      const statusHistory = [...(order.statusHistory as any[])];
      statusHistory.push({
        status: 'CANCELLED',
        timestamp: new Date().toISOString(),
        note: dto.cancellationReason || 'Order cancelled',
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: dto.cancellationReason,
          statusHistory,
        },
      });

      // Restore stock
      for (const item of order.items) {
        if (item.product.trackInventory) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                stockQuantity: { increment: item.quantity },
              },
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: { increment: item.quantity },
              },
            });
          }
        }
      }
    });

    await this.audit.log({
      userId: userId || undefined,
      action: 'UPDATE',
      entity: 'Order',
      entityId: orderId,
      metadata: {
        status: 'CANCELLED',
        reason: dto.cancellationReason,
        orderNumber: order.orderNumber,
      },
    });

    this.logger.log(
      `Order ${order.orderNumber} cancelled`,
      'OrdersService',
    );

    return {
      message: 'Order cancelled successfully',
      orderNumber: order.orderNumber,
    };
  }

  /**
   * Get customer orders by phone (public)
   */
  async getCustomerOrders(customerPhone: string) {
    const orders = await this.prisma.order.findMany({
      where: { customerPhone },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent 50 orders
    });

    return orders;
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const prefix = 'ORD';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    const orderNumber = `${prefix}-${timestamp}${random}`;

    // Check uniqueness
    const existing = await this.prisma.order.findUnique({
      where: { orderNumber },
    });

    if (existing) {
      return this.generateOrderNumber(); // Retry
    }

    return orderNumber;
  }

  /**
   * Calculate delivery fee based on option and location
   */
  private calculateDeliveryFee(
    deliveryOption: string,
    deliveryCity?: string,
  ): number {
    if (deliveryOption === 'PICKUP') {
      return 0;
    }

    if (deliveryOption === 'CUSTOMER_ARRANGED') {
      return 0;
    }

    // Simple fee structure for Ghana cities
    const cityFees: Record<string, number> = {
      Accra: 15,
      Kumasi: 15,
      Tema: 20,
      Takoradi: 25,
      Tamale: 30,
      'Cape Coast': 25,
    };

    return cityFees[deliveryCity || ''] || 20; // Default 20 GHS
  }

  /**
   * Validate order status transition
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): void {
    const validTransitions: Record<string, string[]> = {
      PLACED: ['ACCEPTED', 'CANCELLED'],
      ACCEPTED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'CANCELLED'],
      READY_FOR_PICKUP: ['COMPLETED', 'CANCELLED'],
      OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
      DELIVERED: ['COMPLETED', 'DISPUTED'],
      COMPLETED: ['DISPUTED'],
      CANCELLED: [],
      FAILED: ['PLACED'], // Allow retry
      DISPUTED: [],
    };

    if (
      !validTransitions[currentStatus] ||
      !validTransitions[currentStatus].includes(newStatus)
    ) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
