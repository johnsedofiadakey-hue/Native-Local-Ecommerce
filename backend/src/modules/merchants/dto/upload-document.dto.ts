import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum DocumentType {
  GHANA_CARD_FRONT = 'GHANA_CARD_FRONT',
  GHANA_CARD_BACK = 'GHANA_CARD_BACK',
  BUSINESS_CERTIFICATE = 'BUSINESS_CERTIFICATE',
  PROFILE_PHOTO = 'PROFILE_PHOTO',
}

export class UploadDocumentDto {
  @ApiProperty({
    enum: DocumentType,
    example: DocumentType.GHANA_CARD_FRONT,
    description: 'Type of document being uploaded',
  })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  documentType: DocumentType;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Document file (JPG, PNG, or PDF - max 5MB)',
  })
  file: any;
}
