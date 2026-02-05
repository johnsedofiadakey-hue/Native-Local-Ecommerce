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
import { ReviewsService } from './reviews.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewQueryDto,
} from './dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('Reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a review (requires completed order)' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Order not completed or already reviewed' })
  async createReview(
    @Body() dto: CreateReviewDto,
    @Query('phone') customerPhone?: string,
  ) {
    return this.reviewsService.createReview(dto, customerPhone);
  }

  @Get('product/:productId')
  @Public()
  @ApiOperation({ summary: 'Get reviews for a product with statistics' })
  @ApiResponse({ status: 200, description: 'Product reviews retrieved' })
  async getProductReviews(
    @Param('productId') productId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.getProductReviews(productId, query);
  }

  @Get('store/:storeId')
  @Public()
  @ApiOperation({ summary: 'Get reviews for a store' })
  @ApiResponse({ status: 200, description: 'Store reviews retrieved' })
  async getStoreReviews(
    @Param('storeId') storeId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.getStoreReviews(storeId, query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get review by ID' })
  @ApiResponse({ status: 200, description: 'Review retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async getReviewById(@Param('id') id: string) {
    return this.reviewsService.getReviewById(id);
  }

  @Patch(':id')
  @Public()
  @ApiOperation({ summary: 'Update own review' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to update this review' })
  async updateReview(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @Query('phone') customerPhone: string,
  ) {
    if (!customerPhone) {
      throw new Error('Customer phone is required for verification');
    }
    return this.reviewsService.updateReview(id, dto, customerPhone);
  }

  @Delete(':id')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own review' })
  @ApiResponse({ status: 204, description: 'Review deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete this review' })
  async deleteReview(
    @Param('id') id: string,
    @Query('phone') customerPhone: string,
  ) {
    if (!customerPhone) {
      throw new Error('Customer phone is required for verification');
    }
    return this.reviewsService.deleteReview(id, customerPhone);
  }

  @Post(':id/helpful')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark review as helpful' })
  @ApiResponse({ status: 200, description: 'Marked as helpful' })
  async markHelpful(@Param('id') id: string) {
    return this.reviewsService.markHelpful(id);
  }
}
