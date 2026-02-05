import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsNumber, 
  IsBoolean, 
  IsArray, 
  IsUrl,
  Min, 
  MaxLength,
  MinLength 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Premium Cotton T-Shirt',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Short description',
    example: 'Comfortable 100% cotton t-shirt',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  shortDescription?: string;

  @ApiPropertyOptional({
    description: 'Full product description',
    example: 'High-quality cotton t-shirt perfect for everyday wear...',
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'Product price in GHS',
    example: 45.00,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Compare at price (original price before discount)',
    example: 60.00,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({
    description: 'Cost price (for profit calculation)',
    example: 25.00,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({
    description: 'SKU (Stock Keeping Unit)',
    example: 'TSH-BLK-M',
  })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({
    description: 'Whether to track inventory',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  trackInventory?: boolean;

  @ApiPropertyOptional({
    description: 'Stock quantity',
    example: 100,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({
    description: 'Low stock alert threshold',
    example: 10,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({
    description: 'Product images',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    type: [String],
  })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({
    description: 'Thumbnail image URL',
    example: 'https://example.com/thumb.jpg',
  })
  @IsUrl()
  @IsOptional()
  thumbnail?: string;

  @ApiPropertyOptional({
    description: 'Whether product is available',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Whether product is featured',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Product specifications (JSON)',
    example: { size: 'Medium', color: 'Black', material: 'Cotton' },
  })
  @IsOptional()
  specs?: any;

  @ApiPropertyOptional({
    description: 'Ingredients (for food/beauty products)',
    example: { main: ['Cotton', 'Polyester'], allergens: [] },
  })
  @IsOptional()
  ingredients?: any;

  @ApiPropertyOptional({
    description: 'Preparation time in minutes (for food)',
    example: 15,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  prepTime?: number;

  @ApiPropertyOptional({
    description: 'Warranty information',
    example: '1 year manufacturer warranty',
  })
  @IsString()
  @IsOptional()
  warranty?: string;

  @ApiPropertyOptional({
    description: 'Meta title for SEO',
    example: 'Premium Cotton T-Shirt - Buy Online',
  })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'Meta description for SEO',
    example: 'Shop our premium cotton t-shirts. Comfortable, durable, and stylish.',
  })
  @IsString()
  @IsOptional()
  metaDescription?: string;
}
