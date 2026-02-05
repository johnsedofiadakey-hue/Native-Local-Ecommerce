import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  OrderQueryDto,
} from './dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new order (no login required)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid order data or insufficient stock' })
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.ordersService.createOrder(dto, userId);
  }

  @Get()
  @Roles('MERCHANT', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get orders (merchant or admin)' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async getOrders(
    @CurrentUser('userId') userId: string,
    @Query() query: OrderQueryDto,
  ) {
    return this.ordersService.getOrders(userId, query);
  }

  @Get('track/:orderNumber')
  @Public()
  @ApiOperation({ summary: 'Track order by number (public - universal tracking)' })
  @ApiResponse({ status: 200, description: 'Order details retrieved' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async trackOrder(
    @Param('orderNumber') orderNumber: string,
    @Query('phone') customerPhone?: string,
  ) {
    return this.ordersService.getOrderByNumber(orderNumber, customerPhone);
  }

  @Get('customer/:phone')
  @Public()
  @ApiOperation({ summary: 'Get all orders for a customer by phone (public)' })
  @ApiResponse({ status: 200, description: 'Customer orders retrieved' })
  async getCustomerOrders(@Param('phone') customerPhone: string) {
    return this.ordersService.getCustomerOrders(customerPhone);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(
    @Param('id') id: string,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.ordersService.getOrderById(id, userId);
  }

  @Patch(':id/status')
  @Roles('MERCHANT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status (merchant only)' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to update this order' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async updateOrderStatus(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(userId, id, dto);
  }

  @Post(':id/cancel')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel order (customer before accepted, merchant anytime)' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  async cancelOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser('userId') userId?: string,
  ) {
    return this.ordersService.cancelOrder(id, dto, userId);
  }
}
