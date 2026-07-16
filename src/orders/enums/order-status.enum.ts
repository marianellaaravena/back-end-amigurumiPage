export enum OrderStatus {
  // Estados principales
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  COMPLETED = 'completed',
  
  // Estados terminales
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export enum DeliveryMode {
  DELIVERY = 'delivery',
  TAKE_AWAY = 'take_away',
  DINE_IN = 'dine_in',
}

// Flujo de estados según modo de entrega
export const StatusFlow = {
  [DeliveryMode.DELIVERY]: [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.COMPLETED,
  ],
  [DeliveryMode.TAKE_AWAY]: [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.COMPLETED,
  ],
  [DeliveryMode.DINE_IN]: [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.COMPLETED,
  ],
};

// Estados desde los que se puede cancelar
export const CancellableStatuses = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.OUT_FOR_DELIVERY,
];

// Estados desde los que se puede rechazar
export const RejectableStatuses = [OrderStatus.PENDING];