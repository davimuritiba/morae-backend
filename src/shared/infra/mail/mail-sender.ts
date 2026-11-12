export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Envio de e-mail genérico, usado pelos adaptadores de infra de cada módulo
// (ex.: o notifier de verificação de e-mail monta o conteúdo e envia por
// aqui). Trocar de SMTP para um provedor com API só exige outra implementação.
export abstract class MailSender {
  abstract send(message: MailMessage): Promise<void>;
}
