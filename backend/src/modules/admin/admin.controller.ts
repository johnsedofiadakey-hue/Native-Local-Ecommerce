import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { VerifyMerchantDto } from './dto/verify-merchant.dto';
import { EnforcementActionDto } from './dto/enforcement-action.dto';
import { MerchantQueryDto, UserQueryDto } from './dto/admin-query.dto';
import { UpdateConfigDto } from './dto/update-config.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get admin dashboard statistics
   * @route GET /api/v1/admin/dashboard
   */
  @Get('dashboard')
  async getDashboard() {
    const data = await this.adminService.getDashboardStats();

    return {
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data,
    };
  }

  /**
   * Get all merchants with filtering
   * @route GET /api/v1/admin/merchants
   */
  @Get('merchants')
  async getMerchants(@Query() query: MerchantQueryDto) {
    const data = await this.adminService.getMerchants(query);

    return {
      success: true,
      message: 'Merchants retrieved successfully',
      data,
    };
  }

  /**
   * Get single merchant details
   * @route GET /api/v1/admin/merchants/:id
   */
  @Get('merchants/:id')
  async getMerchant(@Param('id') id: string) {
    const data = await this.adminService.getMerchant(id);

    return {
      success: true,
      message: 'Merchant retrieved successfully',
      data,
    };
  }

  /**
   * Verify (approve/reject) merchant application
   * @route POST /api/v1/admin/merchants/:id/verify
   */
  @Post('merchants/:id/verify')
  async verifyMerchant(
    @Param('id') id: string,
    @Body() dto: VerifyMerchantDto,
    @Request() req: any,
  ) {
    const adminId = req.user.userId;
    const data = await this.adminService.verifyMerchant(id, dto, adminId);

    return {
      success: true,
      message: `Merchant ${dto.action.toLowerCase()}d successfully`,
      data,
    };
  }

  /**
   * Execute enforcement action
   * @route POST /api/v1/admin/enforcement
   */
  @Post('enforcement')
  async executeEnforcement(
    @Body() dto: EnforcementActionDto,
    @Request() req: any,
  ) {
    const adminId = req.user.userId;
    const data = await this.adminService.executeEnforcementAction(dto, adminId);

    return {
      success: true,
      message: 'Enforcement action executed successfully',
      data,
    };
  }

  /**
   * Get all users with filtering
   * @route GET /api/v1/admin/users
   */
  @Get('users')
  async getUsers(@Query() query: UserQueryDto) {
    const data = await this.adminService.getUsers(query);

    return {
      success: true,
      message: 'Users retrieved successfully',
      data,
    };
  }

  /**
   * Get platform configuration
   * @route GET /api/v1/admin/config
   */
  @Get('config')
  async getConfig() {
    const data = await this.adminService.getConfig();

    return {
      success: true,
      message: 'Configuration retrieved successfully',
      data,
    };
  }

  /**
   * Update platform configuration
   * @route PATCH /api/v1/admin/config
   */
  @Patch('config')
  async updateConfig(@Body() dto: UpdateConfigDto, @Request() req: any) {
    const adminId = req.user.userId;
    const data = await this.adminService.updateConfig(dto, adminId);

    return {
      success: true,
      message: 'Configuration updated successfully',
      data,
    };
  }

  /**
   * Get audit logs
   * @route GET /api/v1/admin/audit-logs
   */
  @Get('audit-logs')
  async getAuditLogs(
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('limit') limit?: number,
  ) {
    const data = await this.adminService.getAuditLogs(
      resourceType,
      resourceId,
      limit,
    );

    return {
      success: true,
      message: 'Audit logs retrieved successfully',
      data,
    };
  }
}
