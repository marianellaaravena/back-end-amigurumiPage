import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './orders.controller';
import { OrderService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Product } from '../products/product.entity';
import { QrService } from '../common/qr/qr.service';
import { WhatsAppService } from '../common/whatsapp/whatsapp.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderStatusHistory, Product]),
  ],
  controllers: [OrderController],
  providers: [OrderService, QrService, WhatsAppService],
  exports: [OrderService],
})
export class OrdersModule {}
