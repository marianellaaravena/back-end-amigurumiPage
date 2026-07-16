import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { OrderService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AddItemsDto } from './dto/add-items.dto';
import { UpdateItemsDto } from './dto/update-items.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { OrderStatus, DeliveryMode } from './enums/order-status.enum';
import { QrService } from '../common/qr/qr.service';
import { WhatsAppService } from '../common/whatsapp/whatsapp.service';
import type { Response } from 'express';
import { Res } from '@nestjs/common';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly qrService: QrService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  // ===========================================================================
  // ==================== ENDPOINTS PÚBLICOS (Clientes - Sin Autenticación) ===
  // ===========================================================================

  /**
   * REGISTRAR PEDIDO DESDE EL CARRITO (Angular Público)
   * POST http://localhost:3000/orders
   */
  @Post()
  create(@Body(ValidationPipe) createOrderDto: CreateOrderDto) {
    return this.orderService.createOrder(createOrderDto);
  }

  /**
   * SEGUIMIENTO PÚBLICO DEL CLIENTE (Pantalla del Stepper animado 🧶)
   * GET http://localhost:3000/orders/track/X89A12
   */
  @Get('track/:orderNumber')
  trackOrder(@Param('orderNumber') orderNumber: string) {
    return this.orderService.findByOrderNumber(orderNumber);
  }

  // ===========================================================================
  // ==================== ENDPOINTS PROTEGIDOS (Panel de Gestión Admin) =======
  // ===========================================================================

  /**
   * LISTADO CON FILTROS AVANZADOS DE ADMINISTRACIÓN
   * GET http://localhost:3000/orders?status=pending&search=Maylin
   * Permite filtrar por estados, modos de entrega, rangos de fecha y buscadores de texto.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('status') status?: OrderStatus,
    @Query('deliveryMode') deliveryMode?: DeliveryMode,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.orderService.findAllOrders(
      status,
      deliveryMode,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      search,
    );
  }

  /**
   * ALERTAS DE ACCIONES PENDIENTES
   * GET http://localhost:3000/orders/pending-actions
   */
  @Get('pending-actions')
  @UseGuards(JwtAuthGuard)
  getPendingActions() {
    return this.orderService.getPendingActions();
  }

  /**
   * ESTADÍSTICAS E INDICADORES (Métricas del Panel de Control)
   * GET http://localhost:3000/orders/stats
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats() {
    return this.orderService.getOrderStats();
  }

  /**
   * FILTRAR ÓRDENES POR UN ESTADO ESPECÍFICO
   */
  @Get('status/:status')
  @UseGuards(JwtAuthGuard)
  findByStatus(@Param('status') status: OrderStatus) {
    return this.orderService.findByStatus(status);
  }

  /**
   * OBTENER PEDIDOS RECIENTES
   */
  @Get('recent')
  @UseGuards(JwtAuthGuard)
  getRecentOrders() {
    return this.orderService.getRecentOrders();
  }

  /**
   * BUSCAR PEDIDO COMPLETO POR SU ID INTERNO
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOneOrder(id);
  }

  /**
   * ACTUALIZAR ESTADO DEL PEDIDO (Transición de flujos)
   * PATCH http://localhost:3000/orders/5/status
   * Captura el ID del administrador logueado para guardarlo en la auditoría del historial.
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateStatusDto: UpdateOrderStatusDto,
    @GetUser('id') userId: number,
  ) {
    return this.orderService.updateOrderStatus(id, updateStatusDto, userId);
  }

  /**
   * CONFIRMAR PEDIDO ENTRANTE
   */
  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  confirmOrder(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.orderService.confirmOrder(id, userId);
  }

  /**
   * RECHAZAR PEDIDO DESDE EL COMERCIO (ej: por falta de materiales específicos)
   */
  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  rejectOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @GetUser('id') userId: number,
  ) {
    return this.orderService.rejectOrder(id, reason, userId);
  }

  /**
   * CANCELAR PEDIDO
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @GetUser('id') userId: number,
  ) {
    return this.orderService.cancelOrder(id, reason, userId);
  }

  /**
   * AGREGAR NUEVOS PRODUCTOS A UN PEDIDO PENDIENTE
   * POST http://localhost:3000/orders/5/items
   */
  @Post(':id/items')
  @UseGuards(JwtAuthGuard)
  addItems(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) addItemsDto: AddItemsDto,
    @GetUser('id') userId: number,
  ) {
    return this.orderService.addItemsToOrder(id, addItemsDto, userId);
  }

  /**
   * MODIFICAR CANTIDADES DE PRODUCTOS EN UN PEDIDO PENDIENTE
   */
  @Patch(':id/items')
  @UseGuards(JwtAuthGuard)
  updateItems(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateItemsDto: UpdateItemsDto,
    @GetUser('id') userId: number,
  ) {
    return this.orderService.updateOrderItems(id, updateItemsDto, userId);
  }

  /**
   * QUITAR UN AMIGURUMI ESPECÍFICO DEL DETALLE DE UN PEDIDO PENDIENTE
   * DELETE http://localhost:3000/orders/5/items/12
   */
  @Delete(':orderId/items/:itemId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  removeItem(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @GetUser('id') userId: number,
  ) {
    return this.orderService.removeOrderItem(orderId, itemId, userId);
  }

  // ===========================================================================
  // ==================== ENDPOINTS DE SERVICIOS ADICIONALES (QR / WhatsApp) ===
  // ===========================================================================

  /**
   * GENERAR QR DIRECTO COMO BUFFER DE IMAGEN PNG
   * Responde directamente el archivo binario binario para renderizar nativamente en etiquetas img.
   */
  @Get(':orderNumber/qr')
  async getOrderQR(
    @Param('orderNumber') orderNumber: string,
    @Res() res: Response,
  ) {
    const order = await this.orderService.findByOrderNumber(orderNumber);
    const qrData = order.getQRData();
    const qrCodeBuffer = await this.qrService.generateQRCodeBuffer(qrData);

    res.setHeader('Content-Type', 'image/png');
    res.send(qrCodeBuffer);
  }

  /**
   * GENERAR QR EN FORMATO CADENA BASE64
   */
  @Get(':orderNumber/qr-base64')
  async getOrderQRBase64(@Param('orderNumber') orderNumber: string) {
    const order = await this.orderService.findByOrderNumber(orderNumber);
    const qrData = order.getQRData();
    const qrCode = await this.qrService.generateQRCode(qrData);

    return { qrCode, orderNumber: order.orderNumber };
  }

  /**
   * DISPARAR ALERTAS DE WHATSAPP AL COMERCIO Y AL CLIENTE
   * Delegado por completo a la lógica unificada del OrdersService.
   */
  @Post(':orderNumber/notify-whatsapp')
  async notifyWhatsapp(@Param('orderNumber') orderNumber: string) {
    return this.orderService.notifyWhatsapp(orderNumber);
  }
}