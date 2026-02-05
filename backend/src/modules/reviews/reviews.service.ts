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
  CreateReviewDto,
  UpdateReviewDto,
  ReviewQueryDto,
} from './dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create a review for a completed order
   */
  async createReview(dto: CreateReviewDto, customerPhone?: string) {
    // Validate order exists and is completed/delivered
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: {
          where: { productId: dto.productId },
        },
        store: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify order contains the product
    if (order.items.length === 0) {
      throw new BadRequestException('Product not found in this order');
    }

    // Only allow reviews for completed or delivered orders
    if (!['COMPLETED', 'DELIVERED'].includes(order.status)) {
      throw new BadRequestException(
        'Can only review completed or delivered orders',
      );
    }

    // Verify customer phone matches order (security)
    if (customerPhone && order.customerPhone !== customerPhone) {
      throw new ForbiddenException('Not authorized to review this order');
    }

    // Check if review already exists
    const existing = await this.prisma.review.findUnique({
      where: {
        orderId_productId: {
          orderId: dto.orderId,
          productId: dto.productId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You have already reviewed this product from this order',
      );
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        orderId: dto.orderId,
        productId: dto.productId,
        storeId: order.storeId,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        images: dto.images || [],
        reviewerName: dto.reviewerName || order.customerName,
        reviewerPhone: order.customerPhone,
        verifiedPurchase: true,
      },
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
    });

    // Update product average rating
    await this.updateProductRating(dto.productId);

    await this.audit.log({
      userId: undefined,
      action: 'CREATE',
      entity: 'Review',
      entityId: review.id,
      metadata: {
        productId: dto.productId,
        rating: dto.rating,
        orderId: dto.orderId,
      },
    });

    this.logger.log(
      `Review created for product ${dto.productId}`,
      'ReviewsService',
    );

    return review;
  }

  /**
   * Get reviews with filters
   */
  async getReviews(query: ReviewQueryDto) {
    const {
      productId,
      storeId,
      minRating,
      verifiedPurchase,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const where: any = {
      isPublished: true,
    };

    if (productId) {
      where.productId = productId;
    }

    if (storeId) {
      where.storeId = storeId;
    }

    if (minRating) {
      where.rating = { gte: minRating };
    }

    if (verifiedPurchase !== undefined) {
      where.verifiedPurchase = verifiedPurchase;
    }

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
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
      this.prisma.review.count({ where }),
    ]);

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get reviews for a specific product with stats
   */
  async getProductReviews(productId: string, query: ReviewQueryDto) {
    const reviewsData = await this.getReviews({ ...query, productId });

    // Calculate rating distribution
    const ratingCounts = await this.prisma.review.groupBy({
      by: ['rating'],
      where: {
        productId,
        isPublished: true,
      },
      _count: {
        rating: true,
      },
    });

    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratingCounts.forEach((item: any) => {
      distribution[item.rating] = item._count.rating;
    });

    // Calculate average rating
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { averageRating: true },
    });

    return {
      ...reviewsData,
      stats: {
        averageRating: product?.averageRating || 0,
        totalReviews: reviewsData.pagination.total,
        ratingDistribution: distribution,
      },
    };
  }

  /**
   * Get reviews for a store
   */
  async getStoreReviews(storeId: string, query: ReviewQueryDto) {
    const reviewsData = await this.getReviews({ ...query, storeId });

    // Calculate store average rating
    const avgResult = await this.prisma.review.aggregate({
      where: {
        storeId,
        isPublished: true,
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      ...reviewsData,
      stats: {
        averageRating: avgResult._avg.rating || 0,
        totalReviews: avgResult._count.id,
      },
    };
  }

  /**
   * Update review (only by the reviewer)
   */
  async updateReview(
    reviewId: string,
    dto: UpdateReviewDto,
    customerPhone: string,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Verify ownership
    if (review.reviewerPhone !== customerPhone) {
      throw new ForbiddenException('Not authorized to update this review');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        ...dto,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Recalculate product rating if rating changed
    if (dto.rating && dto.rating !== review.rating) {
      await this.updateProductRating(review.productId);
    }

    await this.audit.log({
      userId: undefined,
      action: 'UPDATE',
      entity: 'Review',
      entityId: reviewId,
      metadata: dto,
    });

    this.logger.log(`Review updated: ${reviewId}`, 'ReviewsService');

    return updated;
  }

  /**
   * Delete review (only by the reviewer)
   */
  async deleteReview(reviewId: string, customerPhone: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Verify ownership
    if (review.reviewerPhone !== customerPhone) {
      throw new ForbiddenException('Not authorized to delete this review');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    // Recalculate product rating
    await this.updateProductRating(review.productId);

    await this.audit.log({
      userId: undefined,
      action: 'DELETE',
      entity: 'Review',
      entityId: reviewId,
      metadata: { productId: review.productId },
    });

    this.logger.log(`Review deleted: ${reviewId}`, 'ReviewsService');

    return {
      message: 'Review deleted successfully',
    };
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        helpfulCount: { increment: 1 },
      },
    });

    return {
      message: 'Marked as helpful',
    };
  }

  /**
   * Update product average rating
   */
  private async updateProductRating(productId: string): Promise<void> {
    const result = await this.prisma.review.aggregate({
      where: {
        productId,
        isPublished: true,
      },
      _avg: {
        rating: true,
      },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        averageRating: result._avg.rating || null,
      },
    });
  }

  /**
   * Get review by ID
   */
  async getReviewById(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
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

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }
}
