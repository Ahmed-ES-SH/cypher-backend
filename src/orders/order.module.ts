import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './schema/order.schema';
import { OrderItem } from './schema/order-item.schema';
import { Payment } from '../payments/schema/payment.schema';
import { OrderService } from './order.service';
import { OrderRepository } from './order.repository';
import { OrderController } from './order.controller';
import { OrdersAdminController } from './orders-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Payment])],
  controllers: [OrderController, OrdersAdminController],
  providers: [OrderService, OrderRepository],
  exports: [OrderService],
})
export class OrderModule {}
