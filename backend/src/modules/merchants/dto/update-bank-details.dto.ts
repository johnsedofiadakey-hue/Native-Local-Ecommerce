import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VALIDATION_PATTERNS } from '@/common/constants';

enum MobileMoneyProvider {
  MTN = 'MTN',
  VODAFONE = 'VODAFONE',
  AIRTELTIGO = 'AIRTELTIGO',
}

export class UpdateBankDetailsDto {
  @ApiProperty({
    example: 'GCB Bank',
    required: false,
    description: 'Bank name for direct transfers',
  })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiProperty({
    example: '1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{10,15}$/, { message: 'Invalid bank account number' })
  bankAccountNumber?: string;

  @ApiProperty({
    example: 'Elegant Wear Ghana Ltd',
    required: false,
  })
  @IsString()
  @IsOptional()
  bankAccountName?: string;

  @ApiProperty({
    example: 'MTN',
    enum: MobileMoneyProvider,
    required: false,
    description: 'Mobile money provider for settlements',
  })
  @IsEnum(MobileMoneyProvider)
  @IsOptional()
  mobileMoney?: MobileMoneyProvider;

  @ApiProperty({
    example: '+233241234567',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(VALIDATION_PATTERNS.GHANA_PHONE, {
    message: 'Invalid Ghana phone number format',
  })
  mobileMoneyNumber?: string;

  @ApiProperty({
    example: 'Kwame Mensah',
    required: false,
  })
  @IsString()
  @IsOptional()
  mobileMoneyName?: string;
}
