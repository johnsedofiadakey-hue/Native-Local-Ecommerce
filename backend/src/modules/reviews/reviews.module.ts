import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { CommonModule } from '@/common/common.module';
import { OrdersModule } from '@/modules/orders/orders.module';

@Module({
  imports: [CommonModule, OrdersModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
