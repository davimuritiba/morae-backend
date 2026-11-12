import * as nodemailer from 'nodemailer';
import { MailSender, type MailMessage } from './mail-sender.js';

export interface SmtpOptions {
  host: string;
  port: number;
  // true para TLS direto (porta 465); false para STARTTLS ou sem TLS (Mailpit).
  secure: boolean;
  user?: string;
  password?: string;
  // Remetente, ex.: "Moraê <nao-responda@morae.local>".
  from: string;
}

// Envia por SMTP. Em desenvolvimento aponta para o Mailpit do docker-compose;
// em produção, para o SMTP do provedor escolhido.
export class NodemailerMailSender extends MailSender {
  readonly #transporter: nodemailer.Transporter;
  readonly #from: string;

  constructor(options: SmtpOptions) {
    super();
    this.#from = options.from;
    this.#transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: options.user
        ? { user: options.user, pass: options.password }
        : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.#transporter.sendMail({ from: this.#from, ...message });
  }

  // Fecha as conexões abertas com o servidor SMTP.
  close(): void {
    this.#transporter.close();
  }
}
