import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaService } from './common/services/prisma.service';
import { LoggerService } from './common/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);
  const prismaService = app.get(PrismaService);

  // Security - Helmet middleware
  app.use(helmet());

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGIN'),
    credentials: configService.get('CORS_CREDENTIALS') === 'true',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Global validation pipe with strict rules
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Throw error on non-whitelisted properties
      transform: true, // Auto-transform payloads to DTO types
      transformOptions: {
        enableImplicitConversion: false, // Require explicit type conversion
      },
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }),
  );

  // Global prefix for API routes
  app.setGlobalPrefix('api/v1');

  // Swagger Documentation (only in development)
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Ghana Commerce Platform API')
      .setDescription(
        'Multi-merchant commerce platform API - Direct-to-merchant payments, universal order tracking, strict verification',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication', 'User authentication and session management')
      .addTag('Merchants', 'Merchant onboarding and management')
      .addTag('Stores', 'Store creation and management')
      .addTag('Products', 'Product and inventory management')
      .addTag('Orders', 'Order processing and tracking')
      .addTag('Payments', 'Paystack payment integration')
      .addTag('Subscriptions', 'Merchant subscription management')
      .addTag('Disputes', 'Dispute resolution and enforcement')
      .addTag('Admin', 'Administrative controls and overrides')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log('Swagger documentation available at /api/docs', 'Bootstrap');
  }

  // Prisma shutdown hooks using process events
  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await app.close();
    process.exit(0);
  });

  // Start server
  const port = configService.get<number>('PORT', 3001);
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Ghana Commerce Platform API running on port ${port}`, 'Bootstrap');
  logger.log(`📝 Environment: ${configService.get('NODE_ENV')}`, 'Bootstrap');
  logger.log(`🔒 Security: RBAC, Rate Limiting, Audit Logging ENABLED`, 'Bootstrap');
  
  if (configService.get('NODE_ENV') !== 'production') {
    logger.log(`📚 API Docs: http://localhost:${port}/api/docs`, 'Bootstrap');
  }
}

bootstrap();
