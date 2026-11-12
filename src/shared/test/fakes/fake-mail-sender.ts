import { MailSender, type MailMessage } from '../../infra/mail/mail-sender.js';

// Guarda os e-mails "enviados" para os testes inspecionarem.
export class FakeMailSender extends MailSender {
  readonly sent: MailMessage[] = [];

  send(message: MailMessage): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }
}
