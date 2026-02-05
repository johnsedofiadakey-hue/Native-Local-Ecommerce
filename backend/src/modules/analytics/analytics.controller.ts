import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsQueryDto,
  ProductAnalyticsQueryDto,
} from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get merchant's overall analytics
   * @route GET /api/v1/analytics/merchant
   */
  @Get('merchant')
  @Roles('MERCHANT')
  async getMerchantAnalytics(
    @Request() req: any,
    @Query() query: AnalyticsQueryDto,
  ) {
    const merchantId = req.user.merchantId;
    const data = await this.analyticsService.getMerchantAnalytics(
      merchantId,
      query,
    );

    return {
      success: true,
      message: 'Merchant analytics retrieved successfully',
      data,
    };
  }

  /**
   * Get specific store analytics (merchant must own store)
   * @route GET /api/v1/analytics/store/:storeId
   */
  @Get('store/:storeId')
  @Roles('MERCHANT')
  async getStoreAnalytics(
    @Param('storeId') storeId: string,
    @Request() req: any,
    @Query() query: AnalyticsQueryDto,
  ) {
    const merchantId = req.user.merchantId;
    const data = await this.analyticsService.getStoreAnalytics(
      storeId,
      merchantId,
      query,
    );

    return {
      success: true,
      message: 'Store analytics retrieved successfully',
      data,
    };
  }

  /**
   * Get product performance analytics
   * @route GET /api/v1/analytics/products
   */
  @Get('products')
  @Roles('MERCHANT')
  async getProductAnalytics(
    @Request() req: any,
    @Query() query: ProductAnalyticsQueryDto,
  ) {
    const merchantId = req.user.merchantId;
    const data = await this.analyticsService.getProductAnalytics(
      merchantId,
      query,
    );

    return {
      success: true,
      message: 'Product analytics retrieved successfully',
      data,
    };
  }

  /**
   * Get platform-wide analytics (Admin only)
   * @route GET /api/v1/analytics/platform
   */
  @Get('platform')
  @Roles('ADMIN')
  async getPlatformAnalytics(@Query() query: AnalyticsQueryDto) {
    const data = await this.analyticsService.getPlatformAnalytics(query);

    return {
      success: true,
      message: 'Platform analytics retrieved successfully',
      data,
    };
  }
}
