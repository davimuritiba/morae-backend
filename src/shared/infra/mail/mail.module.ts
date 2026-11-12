import { Global, Module, type OnModuleDestroy } from '@nestjs/common';
import {
  envBoolean,
  envPositiveInt,
  optionalEnv,
  requireEnv,
} from '../config/env.js';
import { MailSender } from './mail-sender.js';
import { NodemailerMailSender } from './nodemailer-mail-sender.js';

// Global: qualquer módulo injeta o MailSender sem importar este módulo.
@Global()
@Module({
  providers: [
    {
      provide: MailSender,
      useFactory: () =>
        new NodemailerMailSender({
          host: requireEnv('SMTP_HOST'),
          port: envPositiveInt('SMTP_PORT'),
          secure: envBoolean('SMTP_SECURE', false),
          user: optionalEnv('SMTP_USER'),
          password: optionalEnv('SMTP_PASSWORD'),
          from: requireEnv('MAIL_FROM'),
        }),
    },
  ],
  exports: [MailSender],
})
export class MailModule implements OnModuleDestroy {
  constructor(private readonly mailer: MailSender) {}

  onModuleDestroy(): void {
    if (this.mailer instanceof NodemailerMailSender) {
      this.mailer.close();
    }
  }
}
