// Acesso à API do Mailpit (docker-compose) para os testes conferirem os
// e-mails que a aplicação enviou de verdade.
const MAILPIT_API = process.env['MAILPIT_URL'] ?? 'http://localhost:8025';

export interface MailpitMessage {
  ID: string;
  Subject: string;
  To: { Address: string }[];
}

async function request(path: string, method = 'GET'): Promise<Response> {
  const response = await fetch(`${MAILPIT_API}${path}`, { method });
  if (!response.ok) {
    throw new Error(`Mailpit respondeu ${response.status} em ${path}`);
  }
  return response;
}

export async function clearMailpit(): Promise<void> {
  await request('/api/v1/messages', 'DELETE');
}

export async function listMessages(to?: string): Promise<MailpitMessage[]> {
  const response = await request('/api/v1/messages');
  const { messages } = (await response.json()) as {
    messages: MailpitMessage[];
  };
  return to
    ? messages.filter((m) => m.To.some((r) => r.Address === to))
    : messages;
}

// O envio pode acontecer depois da resposta HTTP (ex.: reenvio em segundo
// plano), então espera até chegarem `count` e-mails para o destinatário.
export async function waitForMessages(
  to: string,
  count: number,
  timeoutMs = 3_000,
): Promise<MailpitMessage[]> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const messages = await listMessages(to);
    if (messages.length >= count) return messages;
    if (Date.now() > deadline) {
      throw new Error(
        `Esperava ${count} e-mail(s) para ${to}, chegaram ${messages.length}.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export async function messageText(id: string): Promise<string> {
  const response = await request(`/api/v1/message/${id}`);
  const { Text } = (await response.json()) as { Text: string };
  return Text;
}

// Extrai o token do link de verificação no texto do e-mail.
export async function verificationTokenFrom(id: string): Promise<string> {
  const match = /verificar-email\?token=([A-Za-z0-9_-]+)/.exec(
    await messageText(id),
  );
  if (!match) {
    throw new Error('Link de verificação não encontrado no e-mail.');
  }
  return match[1];
}
