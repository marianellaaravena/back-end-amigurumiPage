import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { User } from '../../users/entities/user.entity';
import { OrderStatus } from '../enums/order-status.enum';

@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order!: Order;
  @Column()
  orderId!: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    nullable: true,
  })
  fromStatus!: OrderStatus | null;

  @Column({
    type: 'enum',
    enum: OrderStatus,
  })
  toStatus!: OrderStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changedBy' })
  changedByUser!: User;
  @Column({ nullable: true })
  changedBy!: number | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn()
  changedAt!: Date;
}
