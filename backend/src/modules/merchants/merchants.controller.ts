import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MerchantsService } from './merchants.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import {
  CreateMerchantDto,
  UpdateBusinessInfoDto,
  UploadDocumentDto,
  VerifyMerchantDto,
} from './dto';

@ApiTags('Merchants')
@ApiBearerAuth()
@Controller('merchants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post('onboard')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.MERCHANT)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @ApiOperation({ summary: 'Start merchant onboarding process' })
  async startOnboarding(
    @CurrentUser('id') userId: string,
    @Body() createMerchantDto: CreateMerchantDto,
  ) {
    return this.merchantsService.createMerchant(userId, createMerchantDto);
  }

  @Get('profile')
  @Roles(UserRole.MERCHANT)
  @ApiOperation({ summary: 'Get merchant profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.merchantsService.getMerchantByUserId(userId);
  }

  @Patch('profile')
  @Roles(UserRole.MERCHANT)
  @ApiOperation({ summary: 'Update merchant business information' })
  async updateBusinessInfo(
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateBusinessInfoDto,
  ) {
    return this.merchantsService.updateBusinessInfo(userId, updateDto);
  }

  @Post('documents/upload')
  @Roles(UserRole.MERCHANT)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload verification document (Ghana Card, Business Cert)' })
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @Body() uploadDto: UploadDocumentDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|pdf)$/ }),
        ],
      }),
    )
    file: any,
  ) {
    return this.merchantsService.uploadDocument(userId, uploadDto.documentType, file);
  }

  @Get('onboarding-status')
  @Roles(UserRole.MERCHANT)
  @ApiOperation({ summary: 'Check onboarding progress and requirements' })
  async getOnboardingStatus(@CurrentUser('id') userId: string) {
    return this.merchantsService.getOnboardingStatus(userId);
  }

  // Admin endpoints
  @Get('pending')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all pending merchant applications' })
  async getPendingMerchants() {
    return this.merchantsService.getPendingMerchants();
  }

  @Get(':merchantId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MERCHANT)
  @ApiOperation({ summary: 'Get merchant details by ID' })
  async getMerchantById(
    @Param('merchantId') merchantId: string,
    @CurrentUser() user: any,
  ) {
    return this.merchantsService.getMerchantById(merchantId, user);
  }

  @Patch(':merchantId/verify')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve or reject merchant application' })
  async verifyMerchant(
    @Param('merchantId') merchantId: string,
    @CurrentUser('id') adminId: string,
    @Body() verifyDto: VerifyMerchantDto,
  ) {
    return this.merchantsService.verifyMerchant(merchantId, adminId, verifyDto);
  }

  @Patch(':merchantId/suspend')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend merchant account' })
  async suspendMerchant(
    @Param('merchantId') merchantId: string,
    @CurrentUser('id') adminId: string,
    @Body('reason') reason: string,
  ) {
    return this.merchantsService.suspendMerchant(merchantId, adminId, reason);
  }

  @Patch(':merchantId/activate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reactivate suspended merchant' })
  async activateMerchant(
    @Param('merchantId') merchantId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.merchantsService.activateMerchant(merchantId, adminId);
  }
}
