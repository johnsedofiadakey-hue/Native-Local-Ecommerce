import {
  IsString,
  IsNotEmpty,
  IsEmail,
  Matches,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VALIDATION_PATTERNS } from '@/common/constants';

export class InitializePaymentDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Order ID to pay for',
  })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+233241234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(VALIDATION_PATTERNS.GHANA_PHONE, {
    message: 'Invalid Ghana phone number format',
  })
  phone: string;

  @ApiProperty({
    example: 'https://mystore.com/payment/callback',
    required: false,
  })
  @IsString()
  @IsOptional()
  callbackUrl?: string;
}
