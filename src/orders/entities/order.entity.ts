import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  OrderStatus,
  DeliveryMode,
  StatusFlow,
  CancellableStatuses,
  RejectableStatuses,
} from '../enums/order-status.enum';
import { OrderItem } from './order-item.entity';
import { User } from '../../users/entities/user.entity';

// Objeto ayudante para transformar strings a números
const numericTransformer = {
  to: (value: number) => value,
  from: (value: string) => parseFloat(value) || 0,
};

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 20, unique: true })
  orderNumber!: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column({
    type: 'enum',
    enum: DeliveryMode,
  })
  deliveryMode!: DeliveryMode;

  // Datos del cliente
  @Column({ length: 100 })
  customerName!: string;

  @Column({ length: 100 })
  customerLastName!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  customerEmail!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customerPhone!: string | null;

  @Column({ type: 'text', nullable: true })
  deliveryAddress!: string | null;

  // Datos económicos
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 , transformer: numericTransformer})
  subtotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  deliveryCost!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  total!: number;

  // Observaciones
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  // Tiempos estimados
  @Column({ nullable: true })
  estimatedPreparationTime!: number; // Tiempo estimado de preparación (min)

  @Column({ nullable: true })
  estimatedDeliveryTime!: number; // Tiempo estimado de delivery (min)

  @Column({ nullable: true })
  totalEstimatedTime!: number; // Tiempo total estimado

  // Fechas importantes del proceso
  @Column({ type: 'datetime', nullable: true })
  confirmedAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  preparingAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  readyAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  outForDeliveryAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  rejectedAt!: Date;

  // Razones de cancelación/rechazo
  @Column({ type: 'text', nullable: true })
  cancellationReason!: string | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason!: string | null;

  // Relaciones con usuarios
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  createdByUser!: User;
  @Column({ nullable: true })
  createdBy!: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'lastModifiedBy' })
  lastModifiedByUser!: User;
  @Column({ nullable: true })
  lastModifiedBy!: number;

  // Relación con delivery (opcional)
  @Column({ nullable: true })
  deliveryPersonId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  // ==================== LÓGICA DE NEGOCIO ====================

  calculateTotal(): void {
    this.total = this.subtotal + this.deliveryCost;
  }

  calculateEstimatedTime(): void {
    this.totalEstimatedTime =
      (this.estimatedPreparationTime || 20) + (this.estimatedDeliveryTime || 0);
  }

  canBeModified(): boolean {
    return [OrderStatus.PENDING].includes(this.status);
  }

  canBeCancelled(): boolean {
    return CancellableStatuses.includes(this.status);
  }

  canBeRejected(): boolean {
    return RejectableStatuses.includes(this.status);
  }

  getNextPossibleStatuses(): OrderStatus[] {
    const flow = StatusFlow[this.deliveryMode];
    const currentIndex = flow.indexOf(this.status);
    if (currentIndex === -1 || currentIndex === flow.length - 1) {
      return [];
    }
    return [flow[currentIndex + 1]];
  }

  updateStatus(newStatus: OrderStatus, userId: number, reason?: string): void {
    // Validar cancelación
    if (newStatus === OrderStatus.CANCELLED) {
      if (!this.canBeCancelled()) {
        throw new Error(`Cannot cancel order in status: ${this.status}`);
      }
      this.cancelledAt = new Date();
      this.cancellationReason = reason || null;
    }
    // Validar rechazo
    else if (newStatus === OrderStatus.REJECTED) {
      if (!this.canBeRejected()) {
        throw new Error(`Cannot reject order in status: ${this.status}`);
      }
      this.rejectedAt = new Date();
      this.rejectionReason = reason || null;
    }
    // Validar flujo normal
    else {
      const nextStatuses = this.getNextPossibleStatuses();
      if (!nextStatuses.includes(newStatus)) {
        const allowedStatuses = [...nextStatuses];
        if (this.canBeCancelled()) allowedStatuses.push(OrderStatus.CANCELLED);
        if (this.canBeRejected()) allowedStatuses.push(OrderStatus.REJECTED);

        throw new Error(
          `Invalid status transition from ${this.status} to ${newStatus}. ` +
            `Allowed: ${allowedStatuses.join(', ')}`,
        );
      }
    }

    // Registrar fecha según estado
    this.recordStatusDate(newStatus);

    this.status = newStatus;
    this.lastModifiedBy = userId;
  }

  private recordStatusDate(status: OrderStatus): void {
    const now = new Date();
    switch (status) {
      case OrderStatus.CONFIRMED:
        this.confirmedAt = now;
        break;
      case OrderStatus.PREPARING:
        this.preparingAt = now;
        break;
      case OrderStatus.READY:
        this.readyAt = now;
        break;
      case OrderStatus.OUT_FOR_DELIVERY:
        this.outForDeliveryAt = now;
        break;
      case OrderStatus.COMPLETED:
        this.completedAt = now;
        break;
    }
  }

  static generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `ORD-${year}${month}${day}-${hours}${minutes}${seconds}${random}`;
  }
}
