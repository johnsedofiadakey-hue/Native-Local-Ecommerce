import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Common modules
import { CommonModule } from './common/common.module';
import { PrismaService } from './common/services/prisma.service';
import { LoggerService } from './common/services/logger.service';
import { AppController } from './app.controller';

// Guards
import { ThrottlerBehindProxyGuard } from './common/guards/throttler.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

// Filters
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// Interceptors
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { StoresModule } from './modules/stores/stores.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
// import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
// import { DisputesModule } from './modules/disputes/disputes.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Rate limiting - protection against abuse
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000, // Convert to milliseconds
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
      },
    ]),

    // Common utilities
    CommonModule,

    // Feature modules
    AuthModule,
    MerchantsModule,
    PaymentsModule,
    StoresModule,
    ProductsModule,
    OrdersModule,
    ReviewsModule,
    AnalyticsModule,
    AdminModule,
    NotificationsModule,
    // SubscriptionsModule,
    // DisputesModule,
  ],
  controllers: [AppController],
  providers: [
    PrismaService,
    LoggerService,
    // Global guards (order matters: throttle -> jwt -> roles)
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    
    // Global filters
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
