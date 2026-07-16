import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// NOTA: Esta es una implementación simulada para el proyecto.
// Para producción, se usarían APIs reales como Twilio o la API oficial de WhatsApp Business.

@Injectable()
export class WhatsAppService {
  private commercePhone: string;

  constructor(private configService: ConfigService) {
    // Número del comercio (se configura en el archivo .env, si no toma este por defecto)
    this.commercePhone =
      this.configService.get('COMMERCE_WHATSAPP') || '5493888415008';
  }

  /**
   * Alerta 1: Imprime por consola la notificación para la dueña de la tienda (Comercio)
   */
  async sendOrderNotification(
    orderNumber: string,
    customerName: string,
    customerLastName: string,
    orderDetails: string,
    total: number,
  ): Promise<boolean> {
    const message =
      `🧶 *NUEVO PEDIDO - TEJIENDO SUEÑOS* 🧶\n\n` +
      `*Código de Tracking:* ${orderNumber}\n` +
      `*Cliente:* ${customerName} ${customerLastName}\n` +
      `*Total a Abonar:* $${total}\n\n` +
      `📋 *Detalle del amigurumi:*\n${orderDetails}\n\n` +
      `🔗 *Link de Seguimiento:* http://localhost:3000/orders/track/${orderNumber}\n\n` +
      `_Mensaje generado automáticamente por el sistema_`;

    console.log('========================================');
    console.log('📱 SIMULACIÓN: ALERTA WHATSAPP PARA LA TIENDA');
    console.log(`Para: ${this.commercePhone}`);
    console.log('========================================');
    console.log(message);
    console.log('========================================');

    return true;
  }

  /**
   * Alerta 2: Imprime por consola la confirmación que le llegaría al celular del comprador
   */
  async sendOrderConfirmationToCustomer(
    phone: string,
    orderNumber: string,
    total: number,
  ): Promise<boolean> {
    const message =
      `🧶 *TEJIENDO SUEÑOS - PEDIDO RECIBIDO* 🧶\n\n` +
      `¡Hola! Tu pedido *#${orderNumber}* ha sido registrado con éxito.\n` +
      `*Total:* $${total}\n\n` +
      `Podés seguir el avance de tu tejido (Stepper en tiempo real) ingresando acá:\n` +
      `http://localhost:3000/orders/track/${orderNumber}\n\n` +
      `¡Gracias por valorar el trabajo artesanal! 🎉`;

    console.log('========================================');
    console.log('📱 SIMULACIÓN: WHATSAPP ENVIADO AL CLIENTE');
    console.log(`Para: ${phone}`);
    console.log('========================================');
    console.log(message);
    console.log('========================================');

    return true;
  }

  /**
   * URL DINÁMICA: Genera el link directo de API de WhatsApp para el panel de administración
   */
  buildOrderNotificationLink(
    orderNumber: string,
    customerName: string,
    customerLastName: string,
    orderDetails: string,
    total: number,
  ): string {

    const message =
      `*NUEVO PEDIDO - Tejiendo Sueños*\n\n` +
      `*Código:* ${orderNumber}\n` +
      `*Cliente:* ${customerName} ${customerLastName}\n\n` +
      `*Detalle del pedido:*\n${orderDetails}\n\n` +
      `*Total:* $${total}\n\n` +
      `*Seguimiento:* http://localhost:3000/orders/track/${orderNumber}\n\n`;

    return `https://wa.me/${this.commercePhone}?text=${encodeURIComponent(message)}`;
  }

  /**
   * URL DINÁMICA: Genera el link directo para que el admin le mande confirmación manual al cliente
   */
  buildCustomerConfirmationLink(
    phone: string,
    orderNumber: string,
    total: number,
   ): string {

    const message =
      `*¡Gracias por tu compra en Tejiendo Sueños!* 🧶\n\n` +
      `Hemos recibido tu pedido *${orderNumber}*.\n\n` +
      `*Total:* $${total}\n\n` +
      `Podés seguir el estado de tu pedido aquí:\n` +
      `http://localhost:3000/orders/track/${orderNumber}\n\n` +
      `¡Muchas gracias por elegirnos!`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
}