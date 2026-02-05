import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum VerificationAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class VerifyMerchantDto {
  @IsEnum(VerificationAction)
  action: VerificationAction;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
