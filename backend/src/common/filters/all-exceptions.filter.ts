import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../services/logger.service';
import { Prisma } from '@prisma/client';

/**
 * Global exception filter
 * Catches all exceptions and formats them consistently
 * Logs errors for monitoring and debugging
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = undefined;

    // Handle different exception types
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errors = (exceptionResponse as any).errors;
      }
    } 
    // Prisma database errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      
      switch (exception.code) {
        case 'P2002':
          message = 'A record with this value already exists';
          errors = { field: exception.meta?.target };
          break;
        case 'P2025':
          message = 'Record not found';
          status = HttpStatus.NOT_FOUND;
          break;
        case 'P2003':
          message = 'Invalid reference to related record';
          break;
        default:
          message = 'Database operation failed';
      }
    }
    // Generic errors
    else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log error with context
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
      'ExceptionFilter',
    );

    // Security: Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';
    
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: isProduction && status === 500 ? 'Internal server error' : message,
      ...(errors && { errors }),
      ...((!isProduction && exception instanceof Error) && {
        stack: exception.stack,
      }),
    };

    response.status(status).json(errorResponse);
  }
}
