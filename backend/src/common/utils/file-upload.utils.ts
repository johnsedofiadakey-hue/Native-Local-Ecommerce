import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';

/**
 * File filter for image uploads
 * Validates file type and prevents malicious uploads
 */
export const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  // Allowed MIME types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  // Check MIME type
  if (!allowedMimes.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        'Invalid file type. Only JPG, PNG, GIF, and WEBP images are allowed.',
      ),
      false,
    );
  }

  // Check file extension (double-check against MIME type spoofing)
  const allowedExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
  const originalName = file.originalname.toLowerCase();
  
  if (!allowedExtensions.test(originalName)) {
    return callback(
      new BadRequestException(
        'Invalid file extension. Only .jpg, .jpeg, .png, .gif, and .webp are allowed.',
      ),
      false,
    );
  }

  callback(null, true);
};

/**
 * File size limit: 5MB
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
