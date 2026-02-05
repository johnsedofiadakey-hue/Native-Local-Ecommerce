import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { LoggerService } from '@/common/services/logger.service';
import { AuditService } from '@/common/services/audit.service';
import { CreateStoreDto, UpdateStoreDto, StoreQueryDto } from './dto';

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create a new store for a merchant
   */
  async createStore(userId: string, dto: CreateStoreDto) {
    // Verify user is a verified merchant
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
      include: {
        stores: true,
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }

    if (merchant.status !== 'VERIFIED') {
      throw new ForbiddenException(
        'Merchant must be verified before creating stores',
      );
    }

    // Check if merchant already has a store with this name
    const existingStore = await this.prisma.store.findFirst({
      where: {
        merchantId: merchant.id,
        name: dto.name,
      },
    });

    if (existingStore) {
      throw new BadRequestException(
        'You already have a store with this name',
      );
    }

    // Create store
    const store = await this.prisma.store.create({
      data: {
        merchantId: merchant.id,
        createdBy: userId,
        name: dto.name,
        slug: this.generateSlug(dto.name),
        category: dto.category,
        description: dto.description,
        logo: dto.logo,
        bannerImage: dto.bannerImage,
        city: dto.city,
        area: dto.area,
        address: dto.address,
        status: 'ACTIVE',
        isPublished: true,
        publishedAt: new Date(),
      },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Store',
      entityId: store.id,
      metadata: { storeName: store.name, category: store.category },
    });

    this.logger.log(
      `Store created: ${store.name} for merchant ${merchant.id}`,
      'StoresService',
    );

    return store;
  }

  /**
   * Get merchant's stores
   */
  async getMerchantStores(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }

    const stores = await this.prisma.store.findMany({
      where: { merchantId: merchant.id },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return stores;
  }

  /**
   * Get single store by ID
   */
  async getStoreById(storeId: string, userId?: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            verificationStatus: true,
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // If user is requesting, check if they own this store
    if (userId) {
      const merchant = await this.prisma.merchant.findUnique({
        where: { userId },
      });

      if (merchant && store.merchantId === merchant.id) {
        return { ...store, isOwner: true };
      }
    }

    // Public view - only show if active
    if (store.status !== 'ACTIVE') {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  /**
   * Get store by slug (public)
   */
  async getStoreBySlug(slug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug },
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!store || store.status !== 'ACTIVE') {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  /**
   * Update store
   */
  async updateStore(userId: string, storeId: string, dto: UpdateStoreDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.merchantId !== merchant.id) {
      throw new ForbiddenException('You do not own this store');
    }

    // Update slug if name changed
    const updateData: any = { ...dto };
    if (dto.name && dto.name !== store.name) {
      updateData.slug = this.generateSlug(dto.name);
    }

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: updateData,
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Store',
      entityId: storeId,
      metadata: dto,
    });

    this.logger.log(`Store updated: ${storeId}`, 'StoresService');

    return updated;
  }

  /**
   * Toggle store published status
   */
  async toggleStoreStatus(userId: string, storeId: string, isPublished: boolean) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.merchantId !== merchant.id) {
      throw new ForbiddenException('You do not own this store');
    }

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: { 
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Store',
      entityId: storeId,
      metadata: { isPublished },
    });

    this.logger.log(
      `Store ${storeId} ${isPublished ? 'published' : 'unpublished'}`,
      'StoresService',
    );

    return updated;
  }

  /**
   * Deactivate store (soft delete)
   */
  async deactivateStore(userId: string, storeId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.merchantId !== merchant.id) {
      throw new ForbiddenException('You do not own this store');
    }

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        status: 'DEACTIVATED',
        isPublished: false,
      },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Store',
      entityId: storeId,
      metadata: { action: 'deactivate' },
    });

    this.logger.log(`Store deactivated: ${storeId}`, 'StoresService');

    return {
      message: 'Store deactivated successfully',
      store: updated,
    };
  }

  /**
   * Browse stores (public) with filters
   */
  async browseStores(query: StoreQueryDto) {
    const { category, city, area, search, status, page = 1, limit = 20 } = query;

    const where: any = {
      status: status || 'ACTIVE', // Default to active stores for public view
      isPublished: true,
    };

    if (category) {
      where.category = category;
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (area) {
      where.area = { contains: area, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        skip,
        take: limit,
        include: {
          merchant: {
            select: {
              id: true,
              businessName: true,
            },
          },
          _count: {
            select: {
              products: true,
            },
          },
        },
        orderBy: [
          { isPublished: 'desc' },
          { viewCount: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.store.count({ where }),
    ]);

    return {
      stores,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get stores by category
   */
  async getStoresByCategory(category: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      this.prisma.store.findMany({
        where: {
          category: category as any,
          status: 'ACTIVE',
        },
        skip,
        take: limit,
        include: {
          merchant: {
            select: {
              id: true,
              businessName: true,
            },
          },
          _count: {
            select: {
              products: true,
            },
          },
        },
        orderBy: [
          { isPublished: 'desc' },
          { viewCount: 'desc' },
        ],
      }),
      this.prisma.store.count({
        where: {
          category: category as any,
          status: 'ACTIVE',
          isPublished: true,
        },
      }),
    ]);

    return {
      stores,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Generate URL-friendly slug from store name
   */
  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Add random suffix to ensure uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${randomSuffix}`;
  }
}
