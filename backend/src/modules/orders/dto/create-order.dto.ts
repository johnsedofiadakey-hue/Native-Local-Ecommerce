import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Local enums matching Prisma schema
enum DeliveryOption {
  PICKUP = 'PICKUP',
  MERCHANT_DELIVERY = 'MERCHANT_DELIVERY',
  CUSTOMER_ARRANGED = 'CUSTOMER_ARRANGED',
}

enum PaymentMethod {
  MOBILE_MONEY = 'MOBILE_MONEY',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
}

export class CreateOrderItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: 'Product variant ID (if applicable)' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ description: 'Quantity to order', minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Store ID to order from' })
  @IsString()
  storeId: string;

  // Customer Information (No account required)
  @ApiProperty({ description: 'Customer full name', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  customerName: string;

  @ApiProperty({ description: 'Customer phone number (Ghana format)', example: '0244123456' })
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  customerPhone: string;

  @ApiPropertyOptional({ description: 'Customer email address' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  // Order Items
  @ApiProperty({
    description: 'Array of order items',
    type: [CreateOrderItemDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  // Delivery Information
  @ApiProperty({
    description: 'Delivery option',
    enum: DeliveryOption,
  })
  @IsEnum(DeliveryOption)
  deliveryOption: DeliveryOption;

  @ApiPropertyOptional({ description: 'Delivery address (required for MERCHANT_DELIVERY)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Delivery city (required for MERCHANT_DELIVERY)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deliveryCity?: string;

  @ApiPropertyOptional({ description: 'Delivery area/neighborhood' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deliveryArea?: string;

  @ApiPropertyOptional({ description: 'Delivery instructions or notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryNotes?: string;

  // Payment Information
  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'Customer notes or special requests' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNotes?: string;

  @ApiPropertyOptional({ description: 'Discount code or coupon' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  discountCode?: string;
}
