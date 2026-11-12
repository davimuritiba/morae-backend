import type { MailSender } from '../../../../shared/infra/mail/mail-sender.js';
import {
  EmailVerificationNotifier,
  type EmailVerificationMessage,
} from '../../application/ports/email-verification-notifier.port.js';

export interface MailEmailVerificationNotifierOptions {
  // Endereço do front-end, ex.: "https://morae.app". O link enviado é
  // <appWebUrl>/verificar-email?token=...
  appWebUrl: string;
}

// Página do front-end que lê o token da URL e chama a API de confirmação.
const VERIFICATION_PATH = '/verificar-email';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Maceio',
});

// Monta o e-mail de verificação (texto e HTML) e envia pelo MailSender.
export class MailEmailVerificationNotifier extends EmailVerificationNotifier {
  readonly #appWebUrl: URL;

  constructor(
    private readonly mailer: MailSender,
    options: MailEmailVerificationNotifierOptions,
  ) {
    super();
    if (!URL.canParse(options.appWebUrl)) {
      throw new Error('appWebUrl precisa ser uma URL válida.');
    }
    this.#appWebUrl = new URL(options.appWebUrl);
  }

  async sendVerificationEmail(
    message: EmailVerificationMessage,
  ): Promise<void> {
    const link = this.buildLink(message.token);
    const validUntil = dateFormatter.format(message.expiresAt);

    await this.mailer.send({
      to: message.to,
      subject: 'Confirme seu e-mail no Moraê',
      text: [
        `Olá, ${message.name}!`,
        '',
        'Para confirmar seu e-mail no Moraê, acesse o link abaixo:',
        link,
        '',
        `O link vale até ${validUntil} e só pode ser usado uma vez.`,
        'Se você não criou uma conta no Moraê, ignore este e-mail.',
      ].join('\n'),
      html: [
        `<p>Olá, ${escapeHtml(message.name)}!</p>`,
        '<p>Para confirmar seu e-mail no Moraê, clique no botão abaixo:</p>',
        `<p><a href="${escapeHtml(link)}">Confirmar e-mail</a></p>`,
        `<p>Se o botão não funcionar, copie e cole este endereço no navegador:<br>${escapeHtml(link)}</p>`,
        `<p>O link vale até ${validUntil} e só pode ser usado uma vez.</p>`,
        '<p>Se você não criou uma conta no Moraê, ignore este e-mail.</p>',
      ].join('\n'),
    });
  }

  // Preserva um eventual caminho na URL base (ex.: https://site.com/app).
  private buildLink(token: string): string {
    const url = new URL(this.#appWebUrl);
    url.pathname = url.pathname.replace(/\/+$/, '') + VERIFICATION_PATH;
    url.search = '';
    url.searchParams.set('token', token);
    return url.toString();
  }
}

// O nome vem do cadastro do usuário: sem escape, viraria HTML no e-mail.
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
