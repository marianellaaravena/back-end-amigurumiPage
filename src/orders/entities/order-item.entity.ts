import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../products/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'orderId' })
  order!: Order;
  @Column()
  orderId!: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product!: Product;
  @Column()
  productId!: number;

  @Column({ length: 200 })
  productName!: string;

  @Column({ type: 'text', nullable: true })
  productDescription!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number;

  @Column()
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  calculateSubtotal(): void {
    this.subtotal = this.unitPrice * this.quantity;
  }

  updateQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    this.quantity = newQuantity;
    this.calculateSubtotal();
  }

  static create(product: Product, quantity: number, notes?: string): OrderItem {
    const item = new OrderItem();
    item.productId = product.id;
    item.productName = product.name;
    item.productDescription = product.description || '';
    item.unitPrice = product.price;
    item.quantity = quantity;
    item.notes = notes || '';
    item.calculateSubtotal();
    return item;
  }
}
