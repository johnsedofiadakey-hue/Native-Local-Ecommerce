import {
  IsString,
  IsOptional,
  IsEmail,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VALIDATION_PATTERNS } from '@/common/constants';

export class UpdateBusinessInfoDto {
  @ApiProperty({ example: 'Elegant Wear Ghana Ltd', required: false })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(100)
  businessName?: string;

  @ApiProperty({ example: '+233302123456', required: false })
  @IsString()
  @IsOptional()
  @Matches(VALIDATION_PATTERNS.GHANA_PHONE, {
    message: 'Invalid Ghana phone number format',
  })
  primaryPhone?: string;

  @ApiProperty({ example: '+233241234567', required: false })
  @IsString()
  @IsOptional()
  @Matches(VALIDATION_PATTERNS.GHANA_PHONE, {
    message: 'Invalid Ghana phone number format',
  })
  alternativePhone?: string;

  @ApiProperty({ example: 'info@elegantwear.com.gh', required: false })
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

  @ApiProperty({ example: 'GA-123-4567', required: false })
  @IsString()
  @IsOptional()
  digitalAddress?: string;
}
