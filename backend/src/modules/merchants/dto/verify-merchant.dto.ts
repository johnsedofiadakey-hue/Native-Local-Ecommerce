import { IsBoolean, IsString, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMerchantDto {
  @ApiProperty({
    example: true,
    description: 'Whether to approve or reject the merchant',
  })
  @IsBoolean()
  approved: boolean;

  @ApiProperty({
    example: 'Ghana Card details could not be verified',
    required: false,
    description: 'Reason for rejection (required if approved=false)',
  })
  @ValidateIf((o) => !o.approved)
  @IsString()
  rejectionReason?: string;
}
