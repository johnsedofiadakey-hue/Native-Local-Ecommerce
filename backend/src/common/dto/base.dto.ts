import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VALIDATION_PATTERNS } from '../constants';

export class PaginationDto {
  @ApiProperty({ required: false, default: 1 })
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  limit?: number = 20;

  @ApiProperty({ required: false })
  sortBy?: string;

  @ApiProperty({ required: false, enum: ['asc', 'desc'] })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class GhanaPhoneDto {
  @ApiProperty({
    description: 'Ghana phone number in format +233XXXXXXXXX',
    example: '+233241234567',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(VALIDATION_PATTERNS.GHANA_PHONE, {
    message: 'Invalid Ghana phone number format',
  })
  phone: string;
}

export class EmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email: string;
}

export class PasswordDto {
  @ApiProperty({
    description:
      'Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character',
    example: 'SecurePass123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(VALIDATION_PATTERNS.PASSWORD_STRONG, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;
}

export class IdParamDto {
  @ApiProperty({ description: 'UUID identifier' })
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class SuccessResponseDto<T = any> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data?: T;

  constructor(message: string, data?: T) {
    this.success = true;
    this.message = message;
    this.data = data;
  }
}

export class ErrorResponseDto {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  path: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  errors?: any;
}
