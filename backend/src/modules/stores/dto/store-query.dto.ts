import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

enum StoreCategory {
  FASHION = 'FASHION',
  ELECTRONICS = 'ELECTRONICS',
  BEAUTY = 'BEAUTY',
  FOOD = 'FOOD',
  GENERAL_RETAIL = 'GENERAL_RETAIL',
}

enum StoreStatus {
  DRAFT = 'DRAFT',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export class StoreQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: StoreCategory,
    example: 'FOOD',
  })
  @IsEnum(StoreCategory)
  @IsOptional()
  category?: StoreCategory;

  @ApiPropertyOptional({
    description: 'Filter by city',
    example: 'Accra',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter by area',
    example: 'Osu',
  })
  @IsString()
  @IsOptional()
  area?: string;

  @ApiPropertyOptional({
    description: 'Search by store name',
    example: 'market',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: StoreStatus,
    example: 'ACTIVE',
  })
  @IsEnum(StoreStatus)
  @IsOptional()
  status?: StoreStatus;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
