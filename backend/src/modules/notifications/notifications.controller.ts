import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SendSmsDto } from './dto/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Send SMS notification (Admin only)
   * @route POST /api/v1/notifications/sms
   */
  @Post('sms')
  @Roles('ADMIN')
  async sendSms(@Body() dto: SendSmsDto) {
    const data = await this.notificationsService.sendSms(dto);

    return {
      success: true,
      message: 'SMS sent successfully',
      data,
    };
  }

  /**
   * Get notification history for current user
   * @route GET /api/v1/notifications/history
   */
  @Get('history')
  async getHistory(@Request() req: any, @Query('limit') limit?: number) {
    const userId = req.user.userId;
    const data = await this.notificationsService.getNotificationHistory(
      userId,
      limit ? parseInt(String(limit)) : 50,
    );

    return {
      success: true,
      message: 'Notification history retrieved successfully',
      data,
    };
  }

  /**
   * Get all notifications (Admin only)
   * @route GET /api/v1/notifications/all
   */
  @Get('all')
  @Roles('ADMIN')
  async getAllNotifications(@Query('limit') limit?: number) {
    const data = await this.notificationsService.getNotificationHistory(
      undefined,
      limit ? parseInt(String(limit)) : 100,
    );

    return {
      success: true,
      message: 'All notifications retrieved successfully',
      data,
    };
  }
}
