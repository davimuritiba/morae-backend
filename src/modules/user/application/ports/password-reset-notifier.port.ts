export interface PasswordResetMessage {
  to: string;
  name: string;
  token: string;
  expiresAt: Date;
}

export abstract class PasswordResetNotifier {
  abstract sendPasswordResetEmail(message: PasswordResetMessage): Promise<void>;
}
