import {
  EmailVerificationNotifier,
  type EmailVerificationMessage,
} from '../../application/ports/email-verification-notifier.port.js';

// Guarda os e-mails "enviados" para os testes inspecionarem. Com
// `failWith`, o próximo envio falha com o erro informado.
export class FakeEmailVerificationNotifier extends EmailVerificationNotifier {
  readonly sent: EmailVerificationMessage[] = [];
  failWith: Error | null = null;

  sendVerificationEmail(message: EmailVerificationMessage): Promise<void> {
    if (this.failWith) {
      const error = this.failWith;
      this.failWith = null;
      return Promise.reject(error);
    }
    this.sent.push(message);
    return Promise.resolve();
  }
}
