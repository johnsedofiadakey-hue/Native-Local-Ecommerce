import { IsEnum, IsString, IsOptional, MaxLength, IsUUID } from 'class-validator';

export enum EnforcementActionType {
  SUSPEND_MERCHANT = 'SUSPEND_MERCHANT',
  UNSUSPEND_MERCHANT = 'UNSUSPEND_MERCHANT',
  BAN_MERCHANT = 'BAN_MERCHANT',
  DISABLE_STORE = 'DISABLE_STORE',
  ENABLE_STORE = 'ENABLE_STORE',
  REMOVE_PRODUCT = 'REMOVE_PRODUCT',
}

export class EnforcementActionDto {
  @IsEnum(EnforcementActionType)
  actionType: EnforcementActionType;

  @IsUUID()
  targetId: string; // merchantId, storeId, or productId

  @IsString()
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
