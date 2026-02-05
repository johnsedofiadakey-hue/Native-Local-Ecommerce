import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { LoggerService } from '@/common/services/logger.service';
import { AuditService } from '@/common/services/audit.service';
import { S3Service } from '@/common/services/s3.service';
import { MerchantStatus, UserRole } from '@prisma/client';

// Local DocumentType enum since Prisma isn't exporting it
enum DocumentType {
  GHANA_CARD_FRONT = 'GHANA_CARD_FRONT',
  GHANA_CARD_BACK = 'GHANA_CARD_BACK',
  BUSINESS_CERTIFICATE = 'BUSINESS_CERTIFICATE',
  PROFILE_PHOTO = 'PROFILE_PHOTO',
}
import {
  CreateMerchantDto,
  UpdateBusinessInfoDto,
  UpdateBankDetailsDto,
  VerifyMerchantDto,
} from './dto';

@Injectable()
export class MerchantsService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private audit: AuditService,
    private s3: S3Service,
  ) {}

  /**
   * Create new merchant profile during onboarding
   */
  async createMerchant(userId: string, dto: CreateMerchantDto) {
    // Check if user exists and has MERCHANT role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.MERCHANT) {
      throw new BadRequestException('User must have MERCHANT role');
    }

    // Check if merchant profile already exists
    const existing = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('Merchant profile already exists');
    }

    // Create merchant profile
    const merchant = await this.prisma.merchant.create({
      data: {
        userId,
        businessName: dto.businessName,
        businessRegistration: dto.businessRegistration,
        ghanaCardNumber: dto.ghanaCardNumber,
        primaryPhone: dto.primaryPhone,
        alternativePhone: dto.alternativePhone,
        businessEmail: dto.businessEmail,
        city: dto.city,
        area: dto.area,
        streetAddress: dto.streetAddress,
        digitalAddress: dto.digitalAddress,
        status: MerchantStatus.PENDING_SETUP,
        verificationStatus: 'NOT_SUBMITTED' as any,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    await this.audit.log({
      userId,
      action: 'MERCHANT_ONBOARDING_STARTED',
      entity: 'Merchant',
      entityId: merchant.id,
      metadata: { businessName: dto.businessName },
    });

    this.logger.log(
      `Merchant onboarding started for user ${userId}: ${dto.businessName}`,
      'MerchantsService',
    );

    return {
      merchant,
      message: 'Merchant profile created. Please upload verification documents.',
    };
  }

  /**
   * Get merchant by user ID
   */
  async getMerchantByUserId(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        paystackAccount: true,
        stores: {
          where: { isPublished: true },
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }

    return merchant;
  }

  /**
   * Get merchant by ID (with access control)
   */
  async getMerchantById(merchantId: string, user: any) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        paystackAccount: true,
        stores: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // Access control: merchants can only view their own profile, admins can view all
    if (
      user.role === UserRole.MERCHANT &&
      merchant.userId !== user.id
    ) {
      throw new ForbiddenException('Access denied');
    }

    return merchant;
  }

  /**
   * Update merchant business information
   */
  async updateBusinessInfo(userId: string, dto: UpdateBusinessInfoDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }

    const updated = await this.prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        businessName: dto.businessName,
        primaryPhone: dto.primaryPhone,
        alternativePhone: dto.alternativePhone,
        businessEmail: dto.businessEmail,
        city: dto.city,
        area: dto.area,
        streetAddress: dto.streetAddress,
        digitalAddress: dto.digitalAddress,
      },
    });

    await this.audit.log({
      userId,
      action: 'MERCHANT_PROFILE_UPDATED',
      entity: 'Merchant',
      entityId: merchant.id,
      metadata: dto,
    });

    return updated;
  }

  /**
   * Upload verification document to S3
   */
  async uploadDocument(
    userId: string,
    documentType: DocumentType,
    file: any,
  ) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }

    // Check S3 configuration
    if (!this.s3.isConfigured()) {
      throw new BadRequestException(
        'Document upload service not configured. Please contact support.',
      );
    }

    // Upload to S3
    const folder = `merchants/${merchant.id}/documents`;
    const filename = `${documentType.toLowerCase()}-${Date.now()}`;
    const documentUrl = await this.s3.uploadFile(file, folder, filename);

    // Update merchant with document URL based on type
    const updateData: any = {};
    if (documentType === DocumentType.GHANA_CARD_FRONT) {
      updateData.ghanaCardFrontUrl = documentUrl;
    } else if (documentType === DocumentType.GHANA_CARD_BACK) {
      updateData.ghanaCardBackUrl = documentUrl;
    } else if (documentType === DocumentType.BUSINESS_CERTIFICATE) {
      updateData.businessCertificateUrl = documentUrl;
    }

    const updated = await this.prisma.merchant.update({
      where: { id: merchant.id },
      data: updateData,
    });

    await this.audit.log({
      userId,
      action: 'MERCHANT_DOCUMENT_UPLOADED',
      entity: 'Merchant',
      entityId: merchant.id,
      metadata: { documentType, fileName: file.originalname },
    });

    this.logger.log(
      `Document uploaded for merchant ${merchant.id}: ${documentType}`,
      'MerchantsService',
    );

    return {
      documentType,
      documentUrl,
      message: 'Document uploaded successfully',
    };
  }

  /**
   * Get onboarding status and missing requirements
   */
  async getOnboardingStatus(userId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
      include: {
        paystackAccount: true,
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant profile not found');
    }

    const requirements = {
      businessInfoComplete: !!(
        merchant.businessName &&
        merchant.primaryPhone &&
        merchant.city
      ),
      ghanaCardUploaded: !!(
        merchant.ghanaCardFrontUrl && merchant.ghanaCardBackUrl
      ),
      paystackLinked: !!merchant.paystackAccount,
    };

    const completionPercentage = Math.round(
      (Object.values(requirements).filter(Boolean).length /
        Object.values(requirements).length) *
        100,
    );

    return {
      merchant: {
        id: merchant.id,
        status: merchant.status,
        verifiedAt: merchant.verifiedAt,
        verificationNotes: merchant.verificationNotes,
      },
      requirements,
      completionPercentage,
      canSubmitForReview:
        requirements.businessInfoComplete &&
        requirements.ghanaCardUploaded,
    };
  }

  /**
   * Get all pending merchant applications (admin)
   */
  async getPendingMerchants() {
    const merchants = await this.prisma.merchant.findMany({
      where: {
        verificationStatus: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return merchants;
  }

  /**
   * Verify merchant application (admin)
   */
  async verifyMerchant(merchantId: string, adminId: string, dto: VerifyMerchantDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const updateData: any = {
      verificationStatus: dto.approved ? 'VERIFIED' : 'REJECTED',
      status: dto.approved ? MerchantStatus.VERIFIED : MerchantStatus.PENDING_SETUP,
      verifiedAt: dto.approved ? new Date() : null,
      verifiedBy: adminId,
      verificationNotes: dto.approved ? null : dto.rejectionReason,
    };

    const updated = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: updateData,
    });

    await this.audit.log({
      userId: adminId,
      action: dto.approved ? 'MERCHANT_APPROVED' : 'MERCHANT_REJECTED',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: { reason: dto.rejectionReason },
    });

    this.logger.log(
      `Merchant ${merchantId} ${dto.approved ? 'approved' : 'rejected'} by admin ${adminId}`,
      'MerchantsService',
    );

    return {
      merchant: updated,
      message: dto.approved
        ? 'Merchant approved successfully'
        : 'Merchant application rejected',
    };
  }
  /**
   * Suspend merchant account (admin)
   */
  async suspendMerchant(merchantId: string, adminId: string, reason: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const updated = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        status: MerchantStatus.SUSPENDED,
        verificationNotes: reason,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'MERCHANT_SUSPENDED',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: { reason },
    });

    return {
      merchant: updated,
      message: 'Merchant suspended successfully',
    };
  }

  /**
   * Reactivate suspended merchant (admin)
   */
  async activateMerchant(merchantId: string, adminId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const updated = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        status: MerchantStatus.VERIFIED,
        verificationNotes: null,
      },
    });

    await this.audit.log({
      userId: adminId,
      action: 'MERCHANT_ACTIVATED',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: {},
    });

    return {
      merchant: updated,
      message: 'Merchant reactivated successfully',
    };
  }
}
