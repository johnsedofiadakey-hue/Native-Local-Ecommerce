import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'Order ID (must be completed order)', example: 'uuid' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Product ID being reviewed', example: 'uuid' })
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'Rating from 1 to 5',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @ApiPropertyOptional({
    description: 'Review title/headline',
    minLength: 3,
    maxLength: 100,
    example: 'Excellent quality!',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    description: 'Detailed review text',
    minLength: 10,
    maxLength: 1000,
    example: 'The product quality exceeded my expectations. Fast delivery and great customer service.',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  comment?: string;

  @ApiPropertyOptional({
    description: 'Array of image URLs for the review',
    type: [String],
    example: ['https://example.com/image1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: 'Reviewer name (optional, defaults to customer name from order)',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reviewerName?: string;
}
