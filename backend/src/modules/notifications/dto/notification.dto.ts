import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class SendSmsDto {
  @IsString()
  @IsNotEmpty()
  to: string; // Phone number

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  message: string;

  @IsOptional()
  @IsString()
  sender?: string; // Sender ID (max 11 chars for Hubtel)
}

export class OrderNotificationDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class MerchantAlertDto {
  @IsString()
  @IsNotEmpty()
  merchantId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  message: string;

  @IsOptional()
  @IsString()
  alertType?: string; // 'ORDER', 'PAYMENT', 'REVIEW', 'SYSTEM'
}
