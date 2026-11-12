export interface EmailVerificationMessage {
  to: string;
  name: string;
  token: string;
  expiresAt: Date;
}

// Envia o e-mail de verificação. O caso de uso só entrega os dados; montar o
// link (URL do front-end), o texto e o HTML é responsabilidade da infra.
export abstract class EmailVerificationNotifier {
  abstract sendVerificationEmail(
    message: EmailVerificationMessage,
  ): Promise<void>;
}
