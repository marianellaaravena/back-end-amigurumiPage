import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Product } from '../products/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AddItemsDto } from './dto/add-items.dto';
import { UpdateItemsDto } from './dto/update-items.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrderStatus, DeliveryMode } from './enums/order-status.enum';
import { QrService } from '../common/qr/qr.service';
import { WhatsAppService } from '../common/whatsapp/whatsapp.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory)
    private statusHistoryRepository: Repository<OrderStatusHistory>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private qrService: QrService,
    private whatsappService: WhatsAppService,
  ) {}

  // ==================== CLIENTE: Crear pedido ====================
  async createOrder(createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    const {
      items,
      deliveryMode,
      customerName,
      customerLastName,
      deliveryAddress,
      notes,
      estimatedPreparationTime,
    } = createOrderDto;

    // Validar dirección si es delivery
    if (deliveryMode === DeliveryMode.DELIVERY && !deliveryAddress) {
      throw new BadRequestException(
        'Delivery address is required for delivery mode',
      );
    }

    // Obtener productos
    const productIds = items.map((item) => item.productId);
    const products = await this.productRepository.findBy({
      id: In(productIds),
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    // Verificar stock
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(
          `Product with ID ${item.productId} not found`,
        );
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product: ${product.name}. Available: ${product.stock}`,
        );
      }
    }

    // Crear pedido
    const order = new Order();
    order.orderNumber = Order.generateOrderNumber();
    order.deliveryMode = deliveryMode;
    order.customerName = customerName;
    order.customerLastName = customerLastName;
    order.customerEmail = createOrderDto.customerEmail ?? null;
    order.customerPhone = createOrderDto.customerPhone ?? null;
    order.deliveryAddress = deliveryAddress ?? null;
    order.notes = notes ?? null;
    order.status = OrderStatus.PENDING;
    order.subtotal = 0;
    order.deliveryCost = 0;
    order.total = 0;
    order.estimatedPreparationTime = estimatedPreparationTime || 20;
    order.estimatedDeliveryTime =
      deliveryMode === DeliveryMode.DELIVERY ? 30 : 0;
    order.calculateEstimatedTime();

    const savedOrder = await this.orderRepository.save(order);

    // Crear items y actualizar stock
    let subtotal = 0;
    const orderItems: OrderItem[] = [];

    for (const itemDto of items) {
      const product = products.find((p) => p.id === itemDto.productId)!;

      const orderItem = OrderItem.create(
        product,
        itemDto.quantity,
        itemDto.notes,
      );

      orderItem.order = savedOrder;
      orderItems.push(orderItem);

      subtotal += orderItem.subtotal;

      // Actualizar stock (reservar stock)
      product.stock -= itemDto.quantity;
      await this.productRepository.save(product);
    }

    await this.orderItemRepository.save(orderItems);

    // Actualizar totales del pedido
    savedOrder.subtotal = subtotal;
    savedOrder.calculateTotal();
    savedOrder.items = orderItems;

    const finalOrder = await this.orderRepository.save(savedOrder);

    // Generar QR (opcional - se puede llamar por separado)
    const qrData = new OrderResponseDto(finalOrder).getQRData();
    const qrCode = await this.qrService.generateQRCode(qrData);

    // Enviar notificación por WhatsApp al comercio
    const orderDetails = finalOrder.items.map(item => 
      `${item.quantity}x ${item.productName} - $${item.unitPrice}`
    ).join('\n');

    await this.whatsappService.sendOrderNotification(
      finalOrder.orderNumber,
      finalOrder.customerName,
      finalOrder.customerLastName,
      orderDetails,
      finalOrder.total
    );

    // Si el cliente dejó teléfono, enviar confirmación
    if (finalOrder.customerPhone) {
      await this.whatsappService.sendOrderConfirmationToCustomer(
        finalOrder.customerPhone,
        finalOrder.orderNumber,
        finalOrder.total
      );
    }

    // Registrar historial
    await this.recordStatusHistory(
      finalOrder.id,
      null,
      OrderStatus.PENDING,
      null,
      'Pedido creado por el cliente',
    );

    return new OrderResponseDto(finalOrder);
  }

  // ==================== ADMIN: Listar todos los pedidos ====================
  async findAllOrders(
    status?: OrderStatus,
    deliveryMode?: DeliveryMode,
    startDate?: Date,
    endDate?: Date,
    search?: string,
  ): Promise<OrderResponseDto[]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.createdAt', 'DESC');

    if (status) {
      query.andWhere('order.status = :status', { status });
    }
    if (deliveryMode) {
      query.andWhere('order.deliveryMode = :deliveryMode', { deliveryMode });
    }
    if (startDate) {
      query.andWhere('order.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('order.createdAt <= :endDate', { endDate });
    }
    if (search) {
      query.andWhere(
        '(order.orderNumber LIKE :search OR order.customerName LIKE :search OR order.customerLastName LIKE :search OR order.customerEmail LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const orders = await query.getMany();
    return orders.map((order) => new OrderResponseDto(order));
  }

  // ==================== ADMIN: Obtener pedidos por estado ====================
  async findByStatus(status: OrderStatus): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.find({
      where: { status },
      relations: { items: true },
      order: { createdAt: 'ASC' },
    });
    return orders.map((order) => new OrderResponseDto(order));
  }

  // ==================== ADMIN: Obtener pedidos pendientes de acción ====================
  async getPendingActions(): Promise<{
    pendingConfirmation: OrderResponseDto[];
    inPreparation: OrderResponseDto[];
    readyForPickup: OrderResponseDto[];
    outForDelivery: OrderResponseDto[];
  }> {
    const [pendingConfirmation, inPreparation, readyForPickup, outForDelivery] =
      await Promise.all([
        this.findByStatus(OrderStatus.PENDING),
        this.findByStatus(OrderStatus.PREPARING),
        this.findByStatus(OrderStatus.READY),
        this.findByStatus(OrderStatus.OUT_FOR_DELIVERY),
      ]);

    return {
      pendingConfirmation,
      inPreparation,
      readyForPickup,
      outForDelivery,
    };
  }

  // ==================== ADMIN/CLIENTE: Obtener pedido por ID ====================
  async findOneOrder(id: number): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return new OrderResponseDto(order);
  }

  // ==================== CLIENTE: Obtener por número de orden ====================
  async findByOrderNumber(orderNumber: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with number ${orderNumber} not found`);
    }

    return new OrderResponseDto(order);
  }

  // ==================== ADMIN: Cambiar estado del pedido ====================
  async updateOrderStatus(
    id: number,
    updateStatusDto: UpdateOrderStatusDto,
    userId: number,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const previousStatus = order.status;
    const newStatus = updateStatusDto.status;

    // Validar y ejecutar cambio de estado
    order.updateStatus(newStatus, userId, updateStatusDto.reason);

    // Actualizar tiempo estimado si se proporcionó
    if (updateStatusDto.estimatedTime) {
      if (newStatus === OrderStatus.PREPARING) {
        order.estimatedPreparationTime = updateStatusDto.estimatedTime;
      } else if (newStatus === OrderStatus.OUT_FOR_DELIVERY) {
        order.estimatedDeliveryTime = updateStatusDto.estimatedTime;
      }
      order.calculateEstimatedTime();
    }

    // Si es cancelación o rechazo, restaurar stock
    if (
      (newStatus === OrderStatus.CANCELLED ||
        newStatus === OrderStatus.REJECTED) &&
      previousStatus !== OrderStatus.CANCELLED &&
      previousStatus !== OrderStatus.REJECTED
    ) {
      for (const item of order.items) {
        const product = await this.productRepository.findOne({
          where: { id: item.productId },
        });
        if (product) {
          product.stock += item.quantity;
          await this.productRepository.save(product);
        }
      }
    }

    const updatedOrder = await this.orderRepository.save(order);

    // Registrar historial
    await this.recordStatusHistory(
      order.id,
      previousStatus,
      newStatus,
      userId,
      updateStatusDto.reason || `Estado cambiado a ${newStatus}`,
    );

    return new OrderResponseDto(updatedOrder);
  }

  // ==================== ADMIN: Confirmar pedido ====================
  async confirmOrder(id: number, userId: number): Promise<OrderResponseDto> {
    return this.updateOrderStatus(
      id,
      { status: OrderStatus.CONFIRMED },
      userId,
    );
  }

  // ==================== ADMIN: Rechazar pedido ====================
  async rejectOrder(
    id: number,
    reason: string,
    userId: number,
  ): Promise<OrderResponseDto> {
    return this.updateOrderStatus(
      id,
      { status: OrderStatus.REJECTED, reason },
      userId,
    );
  }

  // ==================== ADMIN: Cancelar pedido ====================
  async cancelOrder(
    id: number,
    reason: string,
    userId: number,
  ): Promise<OrderResponseDto> {
    return this.updateOrderStatus(
      id,
      { status: OrderStatus.CANCELLED, reason },
      userId,
    );
  }

  // ==================== ADMIN: Agregar items al pedido ====================
  async addItemsToOrder(
    id: number,
    addItemsDto: AddItemsDto,
    userId: number,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (!order.canBeModified()) {
      throw new BadRequestException(
        `Cannot modify order in status: ${order.status}. Only PENDING orders can be modified.`,
      );
    }

    // Obtener productos
    const productIds = addItemsDto.items.map((item) => item.productId);
    const products = await this.productRepository.findBy({
      id: In(productIds),
    });

    // Verificar stock
    for (const item of addItemsDto.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new BadRequestException(
          `Product with ID ${item.productId} not found`,
        );
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product: ${product.name}`,
        );
      }
    }

    // Agregar items
    let additionalSubtotal = 0;
    const newItems: OrderItem[] = [];

    for (const itemDto of addItemsDto.items) {
      const product = products.find((p) => p.id === itemDto.productId)!;

      // Verificar si el producto ya existe en el pedido
      const existingItem = order.items.find(
        (i) => i.productId === itemDto.productId,
      );

      if (existingItem) {
        const oldSubtotal = existingItem.subtotal;
        existingItem.updateQuantity(existingItem.quantity + itemDto.quantity);
        await this.orderItemRepository.save(existingItem);
        additionalSubtotal += existingItem.subtotal - oldSubtotal;
      } else {
        const orderItem = OrderItem.create(
          product,
          itemDto.quantity,
          itemDto.notes,
        );
        orderItem.order = order;
        newItems.push(orderItem);
        additionalSubtotal += orderItem.subtotal;
      }

      // Actualizar stock
      product.stock -= itemDto.quantity;
      await this.productRepository.save(product);
    }

    if (newItems.length > 0) {
      await this.orderItemRepository.save(newItems);
      // AGREGA EL ITEM EDITAR
      order.items.push(...newItems);
    }

    // Actualizar totales
    //order.subtotal += additionalSubtotal;
    order.subtotal = order.items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    order.calculateTotal();
    order.lastModifiedBy = userId;

    const updatedOrder = await this.orderRepository.save(order);

    await this.recordStatusHistory(
      order.id,
      order.status,
      order.status,
      userId,
      `Se agregaron ${addItemsDto.items.length} producto(s) al pedido`,
    );

    
    return new OrderResponseDto(updatedOrder);
  }

  // ==================== ADMIN: Modificar cantidades ====================
  async updateOrderItems(
    id: number,
    updateItemsDto: UpdateItemsDto,
    userId: number,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (!order.canBeModified()) {
      throw new BadRequestException(
        `Cannot modify order in status: ${order.status}. Only PENDING orders can be modified.`,
      );
    }

    let subtotalChange = 0;

    for (const updateItem of updateItemsDto.items) {
      const orderItem = order.items.find(
        (item) => item.id === updateItem.itemId,
      );
      if (!orderItem) {
        throw new NotFoundException(
          `Item with ID ${updateItem.itemId} not found in this order`,
        );
      }

      const oldQuantity = orderItem.quantity;
      const quantityDiff = updateItem.quantity - oldQuantity;

      if (quantityDiff !== 0) {
        // Actualizar stock
        const product = await this.productRepository.findOne({
          where: { id: orderItem.productId },
        });
        if (product) {
          const newStock = product.stock - quantityDiff;
          if (newStock < 0) {
            throw new BadRequestException(
              `Insufficient stock for product: ${product.name}`,
            );
          }
          product.stock -= quantityDiff;
          await this.productRepository.save(product);
        }

        // Actualizar item
        const oldSubtotal = orderItem.subtotal;
        orderItem.updateQuantity(updateItem.quantity);
        await this.orderItemRepository.save(orderItem);

        subtotalChange += orderItem.subtotal - oldSubtotal;
      }
    }

    // Actualizar totales
   //order.subtotal += subtotalChange;
    order.subtotal = order.items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    order.calculateTotal();
    order.lastModifiedBy = userId;

    const updatedOrder = await this.orderRepository.save(order);

    await this.recordStatusHistory(
      order.id,
      order.status,
      order.status,
      userId,
      `Se modificaron cantidades de ${updateItemsDto.items.length} producto(s)`,
    );

    return new OrderResponseDto(updatedOrder);
  }

  // ==================== ADMIN: Eliminar item del pedido ====================
  async removeOrderItem(
    orderId: number,
    itemId: number,
    userId: number,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (!order.canBeModified()) {
      throw new BadRequestException(
        `Cannot modify order in status: ${order.status}. Only PENDING orders can be modified.`,
      );
    }

    const orderItem = order.items.find((item) => item.id === itemId);
    if (!orderItem) {
      throw new NotFoundException(
        `Item with ID ${itemId} not found in this order`,
      );
    }

    // Restaurar stock
    const product = await this.productRepository.findOne({
      where: { id: orderItem.productId },
    });
    if (product) {
      product.stock += orderItem.quantity;
      await this.productRepository.save(product);
    }

    // Actualizar subtotal
    //order.subtotal -= orderItem.subtotal;
    order.items = order.items.filter(i => i.id !== itemId);
    order.subtotal = order.items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    order.calculateTotal();

    // Eliminar item
    await this.orderItemRepository.remove(orderItem);
    order.lastModifiedBy = userId;

    
    const updatedOrder = await this.orderRepository.save(order);

    await this.recordStatusHistory(
      order.id,
      order.status,
      order.status,
      userId,
      `Se eliminó el producto: ${orderItem.productName}`,
    );

    return new OrderResponseDto(updatedOrder);
  }

  // ==================== ESTADÍSTICAS ====================
  async getOrderStats(): Promise<any> {
    const [
      totalOrders,
      pending,
      confirmed,
      preparing,
      ready,
      outForDelivery,
      completed,
      cancelled,
      rejected,
    ] = await Promise.all([
      this.orderRepository.count(),
      this.orderRepository.count({ where: { status: OrderStatus.PENDING } }),
      this.orderRepository.count({ where: { status: OrderStatus.CONFIRMED } }),
      this.orderRepository.count({ where: { status: OrderStatus.PREPARING } }),
      this.orderRepository.count({ where: { status: OrderStatus.READY } }),
      this.orderRepository.count({
        where: { status: OrderStatus.OUT_FOR_DELIVERY },
      }),
      this.orderRepository.count({ where: { status: OrderStatus.COMPLETED } }),
      this.orderRepository.count({ where: { status: OrderStatus.CANCELLED } }),
      this.orderRepository.count({ where: { status: OrderStatus.REJECTED } }),
    ]);

    const totalRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .getRawOne();

    return {
      totalOrders,
      pending,
      confirmed,
      preparing,
      ready,
      outForDelivery,
      completed,
      cancelled,
      rejected,
      totalRevenue: totalRevenue?.total || 0,
    };
  }

  // ==================== HELPER: Registrar historial ====================
  private async recordStatusHistory(
    orderId: number,
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
    userId: number | null,
    notes?: string,
  ): Promise<void> {
    const history = new OrderStatusHistory();
    history.orderId = orderId;
    history.fromStatus = fromStatus as OrderStatus;
    history.toStatus = toStatus;
    history.changedBy = userId as number;
    history.notes = notes as string;
    await this.statusHistoryRepository.save(history);
  }

  // ================= AGREGADO ====================
  
  async getRecentOrders(): Promise<Order[]> {
    return this.orderRepository.find({
      order: {
        createdAt: 'DESC'
      },
      take: 5,
    });
  }

  // ================= METODO NUEVO WHASTAPP =====================
  async notifyWhatsapp(orderNumber: string) {
    const order = await this.findByOrderNumber(orderNumber);

    const details = order.items
      .map(i => `${i.quantity}x ${i.productName} - $${i.unitPrice}`)
      .join('\n');

    return {
      url: this.whatsappService.buildOrderNotificationLink(
        order.orderNumber,
        order.customerName,
        order.customerLastName,
        details,
        order.total,
      ),
    };
  }

}
