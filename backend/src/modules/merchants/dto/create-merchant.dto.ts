import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VALIDATION_PATTERNS } from '@/common/constants';

export class CreateMerchantDto {
  @ApiProperty({ example: 'Elegant Wear Ghana Ltd' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  businessName: string;

  @ApiProperty({
    example: 'CS123456789',
    required: false,
    description: 'Ghana business registration number',
  })
  @IsString()
  @IsOptional()
  businessRegistration?: string;

  @ApiProperty({
    example: 'GHA-123456789-0',
    description: 'Ghana Card number of business owner',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^GHA-\d{9}-\d$/, { message: 'Invalid Ghana Card format' })
  ghanaCardNumber: string;

  @ApiProperty({
    example: '+233302123456',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(VALIDATION_PATTERNS.GHANA_PHONE, {
    message: 'Invalid Ghana phone number format',
  })
  primaryPhone: string;

  @ApiProperty({
    example: '+233241234567',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(VALIDATION_PATTERNS.GHANA_PHONE, {
    message: 'Invalid Ghana phone number format',
  })
  alternativePhone?: string;

  @ApiProperty({
    example: 'info@elegantwear.com.gh',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  businessEmail?: string;

  @ApiProperty({ example: 'Accra', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'Osu', required: false })
  @IsString()
  @IsOptional()
  area?: string;

  @ApiProperty({ example: '123 Oxford Street', required: false })
  @IsString()
  @IsOptional()
  streetAddress?: string;

  @ApiProperty({ example: 'GA-123-4567', required: false, description: 'Ghana Post GPS' })
  @IsString()
  @IsOptional()
  digitalAddress?: string;
}
