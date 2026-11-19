import type { MailSender } from '../../../../shared/infra/mail/mail-sender.js';
import {
  PasswordResetNotifier,
  type PasswordResetMessage,
} from '../../application/ports/password-reset-notifier.port.js';

export interface MailPasswordResetNotifierOptions {
  appWebUrl: string;
}

const RESET_PATH = '/redefinir-senha';
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Maceio',
});

export class MailPasswordResetNotifier extends PasswordResetNotifier {
  readonly #appWebUrl: URL;

  constructor(
    private readonly mailer: MailSender,
    options: MailPasswordResetNotifierOptions,
  ) {
    super();
    if (!URL.canParse(options.appWebUrl)) {
      throw new Error('appWebUrl precisa ser uma URL válida.');
    }
    this.#appWebUrl = new URL(options.appWebUrl);
  }

  async sendPasswordResetEmail(message: PasswordResetMessage): Promise<void> {
    const link = this.buildLink(message.token);
    const validUntil = dateFormatter.format(message.expiresAt);

    await this.mailer.send({
      to: message.to,
      subject: 'Redefina sua senha no Moraê',
      text: [
        `Olá, ${message.name}!`,
        '',
        'Para escolher uma nova senha no Moraê, acesse o link abaixo:',
        link,
        '',
        `O link vale até ${validUntil} e só pode ser usado uma vez.`,
        'Se você não solicitou a recuperação de senha, ignore este e-mail.',
      ].join('\n'),
      html: [
        `<p>Olá, ${escapeHtml(message.name)}!</p>`,
        '<p>Para escolher uma nova senha no Moraê, clique no botão abaixo:</p>',
        `<p><a href="${escapeHtml(link)}">Redefinir senha</a></p>`,
        `<p>Se o botão não funcionar, copie e cole este endereço no navegador:<br>${escapeHtml(link)}</p>`,
        `<p>O link vale até ${validUntil} e só pode ser usado uma vez.</p>`,
        '<p>Se você não solicitou a recuperação de senha, ignore este e-mail.</p>',
      ].join('\n'),
    });
  }

  private buildLink(token: string): string {
    const url = new URL(this.#appWebUrl);
    url.pathname = url.pathname.replace(/\/+$/, '') + RESET_PATH;
    url.search = '';
    url.searchParams.set('token', token);
    return url.toString();
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
