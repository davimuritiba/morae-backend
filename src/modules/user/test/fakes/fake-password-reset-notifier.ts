import {
  PasswordResetNotifier,
  type PasswordResetMessage,
} from '../../application/ports/password-reset-notifier.port.js';

export class FakePasswordResetNotifier extends PasswordResetNotifier {
  readonly sent: PasswordResetMessage[] = [];
  failWith: Error | null = null;

  sendPasswordResetEmail(message: PasswordResetMessage): Promise<void> {
    if (this.failWith) {
      const error = this.failWith;
      this.failWith = null;
      return Promise.reject(error);
    }
    this.sent.push(message);
    return Promise.resolve();
  }
}
