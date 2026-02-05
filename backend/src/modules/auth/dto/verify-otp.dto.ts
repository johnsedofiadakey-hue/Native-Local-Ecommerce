import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VALIDATION_PATTERNS } from '@/common/constants';

export class VerifyOtpDto {
  @ApiProperty({ example: '+233241234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(VALIDATION_PATTERNS.GHANA_PHONE, {
    message: 'Invalid Ghana phone number format',
  })
  phone: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP code must be 6 digits' })
  code: string;

  @ApiProperty({
    example: 'SIGNUP',
    description: 'Purpose of OTP verification',
  })
  @IsString()
  @IsNotEmpty()
  purpose: string;
}
