import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST'),
      port: this.configService.get('EMAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASSWORD'),
      },
    });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e74c3c;">¡Bienvenido a Tejiendo Sueños!</h1>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Tu cuenta ha sido creada exitosamente en el sistema de administración de Tejiendo Sueños.</p>
        <p>Ya puedes acceder al panel de administración para gestionar productos, pedidos y más.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #7f8c8d; font-size: 12px;">Este es un correo automático, por favor no responder.</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to,
      subject: 'Bienvenido a Tejiendo Sueños - Cuenta creada',
      html,
    });
  }

  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const verificationUrl = `http://localhost:3000/auth/verify-email?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e74c3c;">Verifica tu correo electrónico</h1>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Gracias por registrarte en Tejiendo Sueños. Por favor, verifica tu dirección de correo electrónico haciendo clic en el siguiente botón:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verificar mi correo
          </a>
        </div>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all;">${verificationUrl}</p>
        <p>Este enlace expirará en 24 horas.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #7f8c8d; font-size: 12px;">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to,
      subject: 'Tejiendo Sueños - Verifica tu correo electrónico',
      html,
    });
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `http://localhost:3000/reset-password?token=${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #e74c3c;">Restablecer contraseña</h1>
        <p>Hola <strong>${name}</strong>,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva contraseña:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Restablecer contraseña
          </a>
        </div>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all;">${resetUrl}</p>
        <p>Este enlace expirará en 1 hora.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #7f8c8d; font-size: 12px;">Si no solicitaste restablecer tu contraseña, puedes ignorar este mensaje.</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM'),
      to,
      subject: 'Tejiendo Sueños - Restablecer contraseña',
      html,
    });
  }
}