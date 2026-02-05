import { IsString, IsOptional, IsEnum, IsUrl, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum StoreCategory {
  FASHION = 'FASHION',
  ELECTRONICS = 'ELECTRONICS',
  BEAUTY = 'BEAUTY',
  FOOD = 'FOOD',
  GENERAL_RETAIL = 'GENERAL_RETAIL',
}

export class UpdateStoreDto {
  @ApiPropertyOptional({
    description: 'Store name',
    example: 'Accra Fresh Market',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Store category',
    enum: StoreCategory,
    example: 'FOOD',
  })
  @IsEnum(StoreCategory)
  @IsOptional()
  category?: StoreCategory;

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

  @ApiPropertyOptional({
    description: 'City',
    example: 'Accra',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'Area/neighborhood',
    example: 'Osu',
  })
  @IsString()
  @IsOptional()
  area?: string;

  @ApiPropertyOptional({
    description: 'Store address',
    example: '123 Oxford Street',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Whether store is published',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
