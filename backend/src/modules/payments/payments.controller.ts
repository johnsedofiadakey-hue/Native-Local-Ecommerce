import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { InitializePaymentDto, LinkPaystackAccountDto } from './dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize payment for order' })
  async initializePayment(
    @CurrentUser('id') userId: string,
    @Body() initializeDto: InitializePaymentDto,
  ) {
    return this.paymentsService.initializePayment(userId, initializeDto);
  }

  @Get('verify/:reference')
  @Public()
  @ApiOperation({ summary: 'Verify payment transaction' })
  async verifyPayment(@Param('reference') reference: string) {
    return this.paymentsService.verifyPayment(reference);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack webhook endpoint' })
  async handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.paymentsService.handleWebhook(signature, req.rawBody?.toString() || '');
  }

  @Post('link-account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link merchant Paystack account' })
  async linkPaystackAccount(
    @CurrentUser('id') userId: string,
    @Body() linkDto: LinkPaystackAccountDto,
  ) {
    return this.paymentsService.linkMerchantPaystackAccount(userId, linkDto);
  }

  @Get('banks')
  @Public()
  @ApiOperation({ summary: 'Get list of Ghana banks' })
  async getBanks() {
    return this.paymentsService.getBanks();
  }

  @Get('merchant/account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get merchant Paystack account details' })
  async getMerchantAccount(@CurrentUser('id') userId: string) {
    return this.paymentsService.getMerchantPaystackAccount(userId);
  }
}
