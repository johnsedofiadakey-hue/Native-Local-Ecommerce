import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkPaystackAccountDto {
  @ApiProperty({
    example: 'GCB Bank',
    description: 'Bank name',
  })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({
    example: 'GCB',
    description: 'Paystack bank code',
  })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Bank account number (10-15 digits)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,15}$/, {
    message: 'Invalid account number format',
  })
  accountNumber: string;
}
