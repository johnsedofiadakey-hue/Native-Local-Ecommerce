import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { LoggerService } from '@/common/services/logger.service';
import { AuditService } from '@/common/services/audit.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create a new product in a store
   */
  async createProduct(userId: string, storeId: string, dto: CreateProductDto) {
    // Verify user owns the store
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        merchant: true,
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant || store.merchantId !== merchant.id) {
      throw new ForbiddenException('You do not own this store');
    }

    if (store.status !== 'ACTIVE') {
      throw new BadRequestException('Store must be active to add products');
    }

    // Generate unique slug
    const slug = await this.generateUniqueSlug(storeId, dto.name);

    // Create product
    const product = await this.prisma.product.create({
      data: {
        storeId,
        name: dto.name,
        slug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        costPrice: dto.costPrice,
        sku: dto.sku,
        trackInventory: dto.trackInventory || false,
        stockQuantity: dto.stockQuantity,
        lowStockThreshold: dto.lowStockThreshold,
        images: dto.images || [],
        thumbnail: dto.thumbnail,
        isAvailable: dto.isAvailable !== undefined ? dto.isAvailable : true,
        isFeatured: dto.isFeatured || false,
        specs: dto.specs || {},
        ingredients: dto.ingredients,
        prepTime: dto.prepTime,
        warranty: dto.warranty,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Product',
      entityId: product.id,
      metadata: { productName: product.name, storeId, price: product.price },
    });

    this.logger.log(
      `Product created: ${product.name} in store ${storeId}`,
      'ProductsService',
    );

    return product;
  }

  /**
   * Get products by store
   */
  async getStoreProducts(storeId: string, query: ProductQueryDto) {
    const {
      search,
      isAvailable,
      isFeatured,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const where: any = { storeId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
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
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Browse products (public)
   */
  async browseProducts(query: ProductQueryDto) {
    const {
      storeId,
      search,
      isAvailable = true,
      isFeatured,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const where: any = {
      isAvailable,
      store: {
        status: 'ACTIVE',
        isPublished: true,
      },
    };

    if (storeId) {
      where.storeId = storeId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
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
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string, userId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
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
        variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Increment view count
    await this.prisma.product.update({
      where: { id: productId },
      data: { viewCount: { increment: 1 } },
    });

    // Check if user owns this product
    if (userId && product.store.merchant.userId === userId) {
      return { ...product, isOwner: true };
    }

    // Public view - only show if available and store is active
    if (!product.isAvailable || product.store.status !== 'ACTIVE') {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(storeSlug: string, productSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug: productSlug,
        store: {
          slug: storeSlug,
          status: 'ACTIVE',
          isPublished: true,
        },
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            area: true,
          },
        },
        variants: true,
      },
    });

    if (!product || !product.isAvailable) {
      throw new NotFoundException('Product not found');
    }

    // Increment view count
    await this.prisma.product.update({
      where: { id: product.id },
      data: { viewCount: { increment: 1 } },
    });

    return product;
  }

  /**
   * Update product
   */
  async updateProduct(
    userId: string,
    productId: string,
    dto: UpdateProductDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: {
          include: {
            merchant: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant || product.store.merchantId !== merchant.id) {
      throw new ForbiddenException('You do not own this product');
    }

    // Update slug if name changed
    const updateData: any = { ...dto };
    if (dto.name && dto.name !== product.name) {
      updateData.slug = await this.generateUniqueSlug(
        product.storeId,
        dto.name,
      );
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Product',
      entityId: productId,
      metadata: dto,
    });

    this.logger.log(`Product updated: ${productId}`, 'ProductsService');

    return updated;
  }

  /**
   * Delete product
   */
  async deleteProduct(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: {
          include: {
            merchant: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant || product.store.merchantId !== merchant.id) {
      throw new ForbiddenException('You do not own this product');
    }

    await this.prisma.product.delete({
      where: { id: productId },
    });

    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'Product',
      entityId: productId,
      metadata: { productName: product.name },
    });

    this.logger.log(`Product deleted: ${productId}`, 'ProductsService');

    return {
      message: 'Product deleted successfully',
    };
  }

  /**
   * Update stock quantity
   */
  async updateStock(
    userId: string,
    productId: string,
    quantity: number,
    operation: 'set' | 'increment' | 'decrement' = 'set',
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        store: {
          include: {
            merchant: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant || product.store.merchantId !== merchant.id) {
      throw new ForbiddenException('You do not own this product');
    }

    if (!product.trackInventory) {
      throw new BadRequestException(
        'Product does not track inventory',
      );
    }

    let newQuantity: number;
    if (operation === 'set') {
      newQuantity = quantity;
    } else if (operation === 'increment') {
      newQuantity = (product.stockQuantity || 0) + quantity;
    } else {
      newQuantity = Math.max(0, (product.stockQuantity || 0) - quantity);
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: newQuantity },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Product',
      entityId: productId,
      metadata: { 
        operation, 
        quantity, 
        oldStock: product.stockQuantity,
        newStock: newQuantity,
      },
    });

    return updated;
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit = 12) {
    const products = await this.prisma.product.findMany({
      where: {
        isFeatured: true,
        isAvailable: true,
        store: {
          status: 'ACTIVE',
          isPublished: true,
        },
      },
      take: limit,
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
          },
        },
      },
      orderBy: {
        viewCount: 'desc',
      },
    });

    return products;
  }

  /**
   * Generate unique slug for product
   */
  private async generateUniqueSlug(storeId: string, name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.product.findFirst({
        where: { storeId, slug },
      });

      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
}
