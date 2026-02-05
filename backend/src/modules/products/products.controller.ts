import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles('MERCHANT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to create product in this store' })
  async createProduct(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateProductDto & { storeId: string },
  ) {
    return this.productsService.createProduct(userId, dto.storeId, dto);
  }

  @Get('browse')
  @Public()
  @ApiOperation({ summary: 'Browse all products (public)' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async browseProducts(@Query() query: ProductQueryDto) {
    return this.productsService.browseProducts(query);
  }

  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Get featured products (public)' })
  @ApiResponse({ status: 200, description: 'Featured products retrieved' })
  async getFeaturedProducts(@Query('limit') limit?: number) {
    return this.productsService.getFeaturedProducts(limit);
  }

  @Get('store/:storeId')
  @Public()
  @ApiOperation({ summary: 'Get products by store' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async getStoreProducts(
    @Param('storeId') storeId: string,
    @Query() query: ProductQueryDto,
  ) {
    return this.productsService.getStoreProducts(storeId, query);
  }

  @Get('slug/:storeSlug/:productSlug')
  @Public()
  @ApiOperation({ summary: 'Get product by store slug and product slug' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductBySlug(
    @Param('storeSlug') storeSlug: string,
    @Param('productSlug') productSlug: string,
  ) {
    return this.productsService.getProductBySlug(storeSlug, productSlug);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductById(
    @Param('id') id: string,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.productsService.getProductById(id, userId);
  }

  @Patch(':id')
  @Roles('MERCHANT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to update this product' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProduct(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(userId, id, dto);
  }

  @Patch(':id/stock')
  @Roles('MERCHANT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product stock quantity' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to update this product' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateStock(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() body: { quantity: number; operation?: 'set' | 'increment' | 'decrement' },
  ) {
    return this.productsService.updateStock(
      userId,
      id,
      body.quantity,
      body.operation,
    );
  }

  @Delete(':id')
  @Roles('MERCHANT')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete this product' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async deleteProduct(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.deleteProduct(userId, id);
  }
}
