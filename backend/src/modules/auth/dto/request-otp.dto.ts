import { IsString, IsNotEmpty, Matches, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VALIDATION_PATTERNS } from '@/common/constants';

export enum OtpPurpose {
  SIGNUP = 'SIGNUP',
  LOGIN = 'LOGIN',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PHONE_VERIFICATION = 'PHONE_VERIFICATION',
}

export class RequestOtpDto {
  @ApiProperty({ example: '+233241234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(VALIDATION_PATTERNS.GHANA_PHONE, {
    message: 'Invalid Ghana phone number format',
  })
  phone: string;

  @ApiProperty({
    enum: OtpPurpose,
    example: OtpPurpose.SIGNUP,
    description: 'Purpose of OTP request',
  })
  @IsEnum(OtpPurpose)
  @IsNotEmpty()
  purpose: string;
}
