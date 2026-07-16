import { Module, Global } from '@nestjs/common';
import { QrService } from './qr/qr.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { EmailService } from './email/email.service';

@Global()
@Module({
  providers: [QrService, WhatsAppService,EmailService],
  exports: [QrService, WhatsAppService,EmailService],
})
export class CommonModule {}

