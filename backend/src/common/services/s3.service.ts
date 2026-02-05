import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { LoggerService } from './logger.service';
import { randomUUID } from 'crypto';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET') || '';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  /**
   * Upload file to S3
   * @param file - File buffer
   * @param folder - S3 folder path (e.g., 'merchants/ghana-cards')
   * @param filename - Optional custom filename
   * @returns S3 file URL
   */
  async uploadFile(
    file: any,
    folder: string,
    filename?: string,
  ): Promise<string> {
    const fileExtension = file.originalname.split('.').pop();
    const key = `${folder}/${filename || randomUUID()}.${fileExtension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256',
      });

      await this.s3Client.send(command);

      const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
      
      this.logger.log(
        `File uploaded to S3: ${key}`,
        'S3Service',
      );

      return fileUrl;
    } catch (error) {
      this.logger.error(
        `Failed to upload file to S3: ${error.message}`,
        error.stack,
        'S3Service',
      );
      throw error;
    }
  }

  /**
   * Generate presigned URL for secure file access
   * @param key - S3 object key
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Presigned URL
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL: ${error.message}`,
        error.stack,
        'S3Service',
      );
      throw error;
    }
  }

  /**
   * Extract S3 key from full URL
   * @param url - Full S3 URL
   * @returns S3 object key
   */
  extractKeyFromUrl(url: string): string {
    const urlPattern = new RegExp(
      `https://${this.bucketName}\\.s3\\.${this.region}\\.amazonaws\\.com/(.+)`,
    );
    const match = url.match(urlPattern);
    return match ? match[1] : url;
  }

  /**
   * Check if S3 is properly configured
   */
  isConfigured(): boolean {
    return !!(
      this.bucketName &&
      this.configService.get<string>('AWS_ACCESS_KEY_ID') &&
      this.configService.get<string>('AWS_SECRET_ACCESS_KEY')
    );
  }
}
