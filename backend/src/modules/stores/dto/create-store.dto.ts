import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum StoreCategory {
  FASHION = 'FASHION',
  ELECTRONICS = 'ELECTRONICS',
  BEAUTY = 'BEAUTY',
  FOOD = 'FOOD',
  GENERAL_RETAIL = 'GENERAL_RETAIL',
}

export class CreateStoreDto {
  @ApiProperty({
    description: 'Store name',
    example: 'Accra Fresh Market',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Store category',
    enum: StoreCategory,
    example: 'FOOD',
  })
  @IsEnum(StoreCategory)
  @IsNotEmpty()
  category: StoreCategory;

  @ApiPropertyOptional({
    description: 'Store description',
    example: 'Fresh local produce and groceries delivered daily',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Store logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsUrl()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional({
    description: 'Store banner image URL',
    example: 'https://example.com/banner.png',
  })
  @IsUrl()
  @IsOptional()
  bannerImage?: string;

  @ApiProperty({
    description: 'City',
    example: 'Accra',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'Area/neighborhood',
    example: 'Osu',
  })
  @IsString()
  @IsNotEmpty()
  area: string;

  @ApiPropertyOptional({
    description: 'Physical address',
    example: '123 Oxford Street',
  })
  @IsString()
  @IsOptional()
  address?: string;
}
