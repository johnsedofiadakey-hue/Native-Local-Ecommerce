import { IsOptional, IsEnum, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum TimeGrouping {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum MetricType {
  REVENUE = 'REVENUE',
  ORDERS = 'ORDERS',
  PRODUCTS_SOLD = 'PRODUCTS_SOLD',
  AVERAGE_ORDER_VALUE = 'AVERAGE_ORDER_VALUE',
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(TimeGrouping)
  groupBy?: TimeGrouping;

  @IsOptional()
  @IsEnum(MetricType, { each: true })
  metrics?: MetricType[];
}

export class ProductAnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['revenue', 'orders', 'views', 'conversion'])
  sortBy?: string = 'revenue';
}
