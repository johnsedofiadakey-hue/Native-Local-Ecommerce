import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { VALIDATION_PATTERNS } from '@/common/constants';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email format' })
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
    example: 'SecurePass123!',
    description:
      'Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(VALIDATION_PATTERNS.PASSWORD_STRONG, {
    message:
      'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @ApiProperty({
    enum: UserRole,
    required: false,
    default: UserRole.CUSTOMER,
    description: 'User role (defaults to CUSTOMER)',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
