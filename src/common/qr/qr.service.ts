import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
/**
 * Este servicio no maneja persistencia (BD) ni controladores propios.
 * Funciona como una herramienta de apoyo para que otros servicios 
 * puedan generar imágenes QR para el seguimiento de los pedidos.
 */
@Injectable()
export class QrService {
  //Genera un QR en formato DataURL (String en Base64 ideal para usar en etiquetas <img> de HTML).
  async generateQRCode(data: string): Promise<string> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      return qrCodeDataUrl;
    } catch (error) {
      throw new Error(`Error generating QR code: ${error.message}`);
    }
  }
// Genera un QR en formato Buffer binario crudo.
  async generateQRCodeBuffer(data: string): Promise<Buffer> {
    return await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    });
  }
}
