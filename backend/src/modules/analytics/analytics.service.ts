import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import {
  AnalyticsQueryDto,
  ProductAnalyticsQueryDto,
  TimeGrouping,
} from './dto/analytics-query.dto';
import { Prisma, OrderStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get sales analytics for a merchant's store
   */
  async getMerchantAnalytics(merchantId: string, query: AnalyticsQueryDto) {
    this.logger.log(`Getting analytics for merchant: ${merchantId}`);

    // Get merchant's stores
    const stores = await this.prisma.store.findMany({
      where: { merchantId },
      select: { id: true },
    });

    if (stores.length === 0) {
      throw new NotFoundException('No stores found for this merchant');
    }

    const storeIds = stores.map((s) => s.id);

    // Build date filter
    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    // Get sales metrics
    const salesMetrics = await this.getSalesMetrics(storeIds, dateFilter);

    // Get product performance
    const topProducts = await this.getTopProducts(storeIds, dateFilter, 5);

    // Get time series data if grouping specified
    let timeSeries = null;
    if (query.groupBy) {
      timeSeries = await this.getTimeSeries(
        storeIds,
        dateFilter,
        query.groupBy,
      );
    }

    return {
      period: {
        startDate: query.startDate || (dateFilter.gte instanceof Date ? dateFilter.gte.toISOString() : String(dateFilter.gte)),
        endDate: query.endDate || (dateFilter.lte instanceof Date ? dateFilter.lte.toISOString() : String(dateFilter.lte)),
      },
      metrics: salesMetrics,
      topProducts,
      timeSeries,
    };
  }

  /**
   * Get store-specific analytics
   */
  async getStoreAnalytics(
    storeId: string,
    merchantId: string,
    query: AnalyticsQueryDto,
  ) {
    this.logger.log(`Getting analytics for store: ${storeId}`);

    // Verify store belongs to merchant
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, merchantId },
    });

    if (!store) {
      throw new NotFoundException('Store not found or access denied');
    }

    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    // Get metrics for this specific store
    const salesMetrics = await this.getSalesMetrics([storeId], dateFilter);
    const topProducts = await this.getTopProducts([storeId], dateFilter, 10);
    const revenueByStatus = await this.getRevenueByStatus([storeId], dateFilter);

    // Get review statistics
    const reviewStats = await this.prisma.review.aggregate({
      where: {
        storeId,
        isPublished: true,
        createdAt: dateFilter,
      },
      _avg: { rating: true },
      _count: true,
    });

    let timeSeries = null;
    if (query.groupBy) {
      timeSeries = await this.getTimeSeries([storeId], dateFilter, query.groupBy);
    }

    return {
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
      },
      period: {
        startDate: query.startDate || (dateFilter.gte instanceof Date ? dateFilter.gte.toISOString() : String(dateFilter.gte)),
        endDate: query.endDate || (dateFilter.lte instanceof Date ? dateFilter.lte.toISOString() : String(dateFilter.lte)),
      },
      metrics: {
        ...salesMetrics,
        reviews: {
          total: reviewStats._count,
          averageRating: reviewStats._avg.rating || 0,
        },
      },
      topProducts,
      revenueByStatus,
      timeSeries,
    };
  }

  /**
   * Get product performance analytics
   */
  async getProductAnalytics(
    merchantId: string,
    query: ProductAnalyticsQueryDto,
  ) {
    this.logger.log(`Getting product analytics for merchant: ${merchantId}`);

    // Get merchant's stores
    const stores = await this.prisma.store.findMany({
      where: { merchantId },
      select: { id: true },
    });

    const storeIds = stores.map((s) => s.id);

    // Get products with order statistics
    const products = await this.prisma.product.findMany({
      where: { storeId: { in: storeIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        stockQuantity: true,
        viewCount: true,
        orderCount: true,
        averageRating: true,
        _count: {
          select: { reviews: true },
        },
      },
      take: query.limit || 20,
      skip: ((query.page || 1) - 1) * (query.limit || 20),
      orderBy: this.getProductOrderBy(query.sortBy),
    });

    // Calculate conversion rate and revenue for each product
    const productsWithMetrics = await Promise.all(
      products.map(async (product) => {
        // Get total revenue from order items
        const revenueData = await this.prisma.orderItem.aggregate({
          where: {
            productId: product.id,
            order: {
              status: {
                in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED],
              },
            },
          },
          _sum: {
            subtotal: true,
          },
        });

        const revenue = revenueData._sum.subtotal || 0;
        const conversionRate =
          product.viewCount > 0
            ? (product.orderCount / product.viewCount) * 100
            : 0;

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          stockQuantity: product.stockQuantity,
          metrics: {
            views: product.viewCount,
            orders: product.orderCount,
            revenue: revenue.toString(),
            conversionRate: parseFloat(conversionRate.toFixed(2)),
            averageRating: product.averageRating || 0,
            reviewCount: product._count.reviews,
          },
        };
      }),
    );

    // Get total count for pagination
    const totalProducts = await this.prisma.product.count({
      where: { storeId: { in: storeIds } },
    });

    return {
      products: productsWithMetrics,
      pagination: {
        page: query.page || 1,
        limit: query.limit || 20,
        total: totalProducts,
        pages: Math.ceil(totalProducts / (query.limit || 20)),
      },
    };
  }

  /**
   * Get platform-wide analytics (Admin only)
   */
  async getPlatformAnalytics(query: AnalyticsQueryDto) {
    this.logger.log('Getting platform analytics');

    const dateFilter = this.buildDateFilter(query.startDate, query.endDate);

    // Get overall platform metrics
    const [
      totalMerchants,
      totalStores,
      totalProducts,
      activeOrders,
      completedOrders,
      totalRevenue,
      totalReviews,
      averagePlatformRating,
    ] = await Promise.all([
      this.prisma.merchant.count({
        where: { status: 'APPROVED' as any, createdAt: dateFilter },
      }),
      this.prisma.store.count({
        where: { createdAt: dateFilter },
      }),
      this.prisma.product.count({
        where: { createdAt: dateFilter },
      }),
      this.prisma.order.count({
        where: {
          status: {
            in: [OrderStatus.PLACED, OrderStatus.ACCEPTED, OrderStatus.PREPARING],
          },
          createdAt: dateFilter,
        },
      }),
      this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] },
          createdAt: dateFilter,
        },
      }),
      this.prisma.order.aggregate({
        where: {
          status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] },
          createdAt: dateFilter,
        },
        _sum: { total: true },
      }),
      this.prisma.review.count({
        where: { isPublished: true, createdAt: dateFilter },
      }),
      this.prisma.review.aggregate({
        where: { isPublished: true, createdAt: dateFilter },
        _avg: { rating: true },
      }),
    ]);

    // Get top performing stores
    const topStores = await this.getTopStores(dateFilter, 10);

    // Get category distribution
    const categoryStats = await this.getCategoryDistribution(dateFilter);

    let timeSeries = null;
    if (query.groupBy) {
      timeSeries = await this.getPlatformTimeSeries(dateFilter, query.groupBy);
    }

    return {
      period: {
        startDate: query.startDate || (dateFilter.gte instanceof Date ? dateFilter.gte.toISOString() : String(dateFilter.gte)),
        endDate: query.endDate || (dateFilter.lte instanceof Date ? dateFilter.lte.toISOString() : String(dateFilter.lte)),
      },
      metrics: {
        merchants: totalMerchants,
        stores: totalStores,
        products: totalProducts,
        orders: {
          active: activeOrders,
          completed: completedOrders,
          total: activeOrders + completedOrders,
        },
        revenue: {
          total: totalRevenue._sum.total?.toString() || '0',
          averageOrderValue:
            completedOrders > 0
              ? (
                  Number(totalRevenue._sum.total) / completedOrders
                ).toFixed(2)
              : '0',
        },
        reviews: {
          total: totalReviews,
          averageRating: averagePlatformRating._avg.rating || 0,
        },
      },
      topStores,
      categoryStats,
      timeSeries,
    };
  }

  // ========== Private Helper Methods ==========

  private buildDateFilter(startDate?: string, endDate?: string): Prisma.DateTimeFilter {
    const filter: Prisma.DateTimeFilter = {};

    if (startDate) {
      filter.gte = new Date(startDate);
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      filter.gte = thirtyDaysAgo;
    }

    if (endDate) {
      filter.lte = new Date(endDate);
    } else {
      filter.lte = new Date();
    }

    return filter;
  }

  private async getSalesMetrics(
    storeIds: string[],
    dateFilter: Prisma.DateTimeFilter,
  ) {
    const [orderStats, revenueData] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        where: {
          storeId: { in: storeIds },
          createdAt: dateFilter,
        },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: {
          storeId: { in: storeIds },
          status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] },
          createdAt: dateFilter,
        },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    const totalOrders = orderStats.reduce((sum, stat) => sum + stat._count, 0);
    const completedOrders = revenueData._count;
    const totalRevenue = revenueData._sum.total || 0;

    return {
      orders: {
        total: totalOrders,
        completed: completedOrders,
        byStatus: orderStats.map((stat) => ({
          status: stat.status,
          count: stat._count,
          revenue: stat._sum.total?.toString() || '0',
        })),
      },
      revenue: {
        total: totalRevenue.toString(),
        averageOrderValue:
          completedOrders > 0
            ? (Number(totalRevenue) / completedOrders).toFixed(2)
            : '0',
      },
    };
  }

  private async getTopProducts(
    storeIds: string[],
    dateFilter: Prisma.DateTimeFilter,
    limit: number,
  ) {
    // Get top products by revenue
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          storeId: { in: storeIds },
          status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] },
          createdAt: dateFilter,
        },
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          subtotal: 'desc',
        },
      },
      take: limit,
    });

    // Get product details
    const productsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            averageRating: true,
          },
        });

        return {
          product,
          metrics: {
            orders: item._count,
            quantitySold: item._sum.quantity || 0,
            revenue: item._sum.subtotal?.toString() || '0',
          },
        };
      }),
    );

    return productsWithDetails;
  }

  private async getRevenueByStatus(
    storeIds: string[],
    dateFilter: Prisma.DateTimeFilter,
  ) {
    const stats = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        storeId: { in: storeIds },
        createdAt: dateFilter,
      },
      _sum: { total: true },
      _count: true,
    });

    return stats.map((stat) => ({
      status: stat.status,
      count: stat._count,
      revenue: stat._sum.total?.toString() || '0',
    }));
  }

  private async getTimeSeries(
    storeIds: string[],
    dateFilter: Prisma.DateTimeFilter,
    grouping: TimeGrouping,
  ) {
    // This is a simplified version - in production, use raw SQL for better performance
    const orders = await this.prisma.order.findMany({
      where: {
        storeId: { in: storeIds },
        status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] },
        createdAt: dateFilter,
      },
      select: {
        createdAt: true,
        total: true,
      },
    });

    // Group by time period
    const grouped = this.groupByTimePeriod(orders, grouping);
    return grouped;
  }

  private async getPlatformTimeSeries(
    dateFilter: Prisma.DateTimeFilter,
    grouping: TimeGrouping,
  ) {
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] },
        createdAt: dateFilter,
      },
      select: {
        createdAt: true,
        total: true,
      },
    });

    return this.groupByTimePeriod(orders, grouping);
  }

  private groupByTimePeriod(
    orders: { createdAt: Date; total: any }[],
    grouping: TimeGrouping,
  ) {
    const grouped = new Map<string, { revenue: number; orders: number }>();

    orders.forEach((order) => {
      const key = this.getTimePeriodKey(order.createdAt, grouping);
      const existing = grouped.get(key) || { revenue: 0, orders: 0 };
      grouped.set(key, {
        revenue: existing.revenue + Number(order.total),
        orders: existing.orders + 1,
      });
    });

    return Array.from(grouped.entries())
      .map(([period, data]) => ({
        period,
        revenue: data.revenue.toString(),
        orders: data.orders,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private getTimePeriodKey(date: Date, grouping: TimeGrouping): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    switch (grouping) {
      case TimeGrouping.DAILY:
        return `${year}-${month}-${day}`;
      case TimeGrouping.WEEKLY:
        const weekNumber = this.getWeekNumber(d);
        return `${year}-W${String(weekNumber).padStart(2, '0')}`;
      case TimeGrouping.MONTHLY:
        return `${year}-${month}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private async getTopStores(dateFilter: Prisma.DateTimeFilter, limit: number) {
    const topStores = await this.prisma.order.groupBy({
      by: ['storeId'],
      where: {
        status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] },
        createdAt: dateFilter,
      },
      _sum: { total: true },
      _count: true,
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: limit,
    });

    const storesWithDetails = await Promise.all(
      topStores.map(async (item) => {
        const store = await this.prisma.store.findUnique({
          where: { id: item.storeId },
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        });

        return {
          store,
          metrics: {
            orders: item._count,
            revenue: item._sum.total?.toString() || '0',
          },
        };
      }),
    );

    return storesWithDetails;
  }

  private async getCategoryDistribution(dateFilter: Prisma.DateTimeFilter) {
    const categories = await this.prisma.store.groupBy({
      by: ['category'],
      where: {
        createdAt: dateFilter,
      },
      _count: true,
    });

    return categories.map((cat) => ({
      category: cat.category,
      storeCount: cat._count,
    }));
  }

  private getProductOrderBy(sortBy?: string): Prisma.ProductOrderByWithRelationInput {
    switch (sortBy) {
      case 'orders':
        return { orderCount: 'desc' };
      case 'views':
        return { viewCount: 'desc' };
      case 'conversion':
        // Approximate conversion by orderCount/viewCount ratio
        return { orderCount: 'desc' };
      case 'revenue':
      default:
        return { orderCount: 'desc' }; // Best approximation without joins
    }
  }
}
