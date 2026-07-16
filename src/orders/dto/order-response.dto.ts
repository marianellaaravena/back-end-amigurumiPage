import { Order } from '../entities/order.entity';
import { OrderStatus, DeliveryMode } from '../enums/order-status.enum';

export class OrderItemResponseDto {
  id: number;
  productId: number;
  productName: string;
  productDescription?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  notes?: string;

  constructor(item: any) {
    this.id = item.id;
    this.productId = item.productId;
    this.productName = item.productName;
    this.productDescription = item.productDescription;
    this.unitPrice = item.unitPrice;
    this.quantity = item.quantity;
    this.subtotal = item.subtotal;
    this.notes = item.notes;
  }
}

export class OrderResponseDto {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  deliveryMode: DeliveryMode;
  customerName: string;
  customerLastName: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  subtotal: number;
  deliveryCost: number;
  total: number;
  notes?: string;
  estimatedPreparationTime?: number;
  estimatedDeliveryTime?: number;
  totalEstimatedTime?: number;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  preparingAt?: Date;
  readyAt?: Date;
  outForDeliveryAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  rejectedAt?: Date;
  cancellationReason?: string;
  rejectionReason?: string;
  items: OrderItemResponseDto[];
  nextPossibleStatuses: OrderStatus[];
  canBeModified: boolean;
  canBeCancelled: boolean;
  canBeRejected: boolean;
  createdBy?: number;
  lastModifiedBy?: number;

  constructor(order: Order) {
    this.id = order.id;
    this.orderNumber = order.orderNumber;
    this.status = order.status as any;
    this.deliveryMode = order.deliveryMode as any;
    this.customerName = order.customerName;
    this.customerLastName = order.customerLastName;
    this.customerEmail = order.customerEmail || undefined;
    this.customerPhone = order.customerPhone || undefined;
    this.deliveryAddress = order.deliveryAddress || undefined;
    this.subtotal = order.subtotal;
    this.deliveryCost = order.deliveryCost;
    this.total = order.total;
    this.notes = order.notes || undefined;
    this.estimatedPreparationTime = order.estimatedPreparationTime || undefined;
    this.estimatedDeliveryTime = order.estimatedDeliveryTime || undefined;
    this.totalEstimatedTime = order.totalEstimatedTime || undefined;
    this.createdAt = order.createdAt;
    this.updatedAt = order.updatedAt;
    this.confirmedAt = order.confirmedAt || undefined;
    this.preparingAt = order.preparingAt || undefined;
    this.readyAt = order.readyAt || undefined;
    this.outForDeliveryAt = order.outForDeliveryAt || undefined;
    this.completedAt = order.completedAt || undefined;
    this.cancelledAt = order.cancelledAt || undefined;
    this.rejectedAt = order.rejectedAt || undefined;
    this.cancellationReason = order.cancellationReason || undefined;
    this.rejectionReason = order.rejectionReason || undefined;
    this.items = order.items?.map((item) => new OrderItemResponseDto(item)) || [];
    this.nextPossibleStatuses = order.getNextPossibleStatuses();
    this.canBeModified = order.canBeModified();
    this.canBeCancelled = order.canBeCancelled();
    this.canBeRejected = order.canBeRejected();
    this.createdBy = order.createdBy || undefined;
    this.lastModifiedBy = order.lastModifiedBy || undefined;
  }

  
  getQRData(): string {
    const itemsText = this.items
      .map(
        (item) =>
          `• ${item.quantity}x ${item.productName} - $${item.unitPrice} = $${item.subtotal}`,
      )
      .join('\n');

    return `🧶 TEJIENDO SUEÑOS - PEDIDO #${this.orderNumber}\n\n` +
      `👤 Cliente: ${this.customerName} ${this.customerLastName}\n` +
      `📞 Teléfono: ${this.customerPhone || 'No especificado'}\n` +
      `📧 Email: ${this.customerEmail || 'No especificado'}\n` +
      `🚚 Modo: ${this.getDeliveryModeText()}\n` +
      `${this.deliveryAddress ? `📍 Dirección: ${this.deliveryAddress}\n` : ''}` +
      `\n📋 DETALLE DEL PEDIDO:\n${itemsText}\n` +
      `\n💰 Subtotal: $${this.subtotal}\n` +
      `${this.deliveryCost > 0 ? `🚚 Costo de Envío: $${this.deliveryCost}\n` : ''}` +
      `💵 TOTAL: $${this.total}\n` +
      `\n⏱️ Estado Actual: ${this.getStatusText()}\n` +
      `📅 Fecha de Compra: ${new Date(this.createdAt).toLocaleString()}\n\n` +
      `¡Gracias por valorar el trabajo artesanal! 🎉`;
  }

  /**
   * Traduce los modos técnicos del Enum a castellano corporativo para amigurumis
   */
  private getDeliveryModeText(): string {
    const modes = {
      delivery: 'Envío a domicilio',
      take_away: 'Retiro en el local',
      dine_in: 'Punto de encuentro', 
    };
    return modes[this.deliveryMode] || this.deliveryMode;
  }

  /**
   * Traduce los estados técnicos de la bitácora al flujo de tejido y empaque
   */
  private getStatusText(): string {
    const statuses = {
      pending: 'Pendiente de confirmación',
      confirmed: 'Pedido Confirmado',
      preparing: 'Tejiendo / En preparación 🧶',
      ready: 'Listo para retirar / empaquetado',
      out_for_delivery: 'En camino / Reparto',
      completed: 'Entregado / Completado 🎉',
      cancelled: 'Cancelado',
      rejected: 'Rechazado',
    };
    return statuses[this.status] || this.status;
  }
}