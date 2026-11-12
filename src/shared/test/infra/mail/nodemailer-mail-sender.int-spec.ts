import { NodemailerMailSender } from '../../../infra/mail/nodemailer-mail-sender.js';

// Envia de verdade para o Mailpit do docker-compose e confere pela API dele.
const MAILPIT_API = process.env['MAILPIT_URL'] ?? 'http://localhost:8025';

interface MailpitSummary {
  ID: string;
  Subject: string;
  From: { Address: string; Name: string };
  To: { Address: string }[];
}

interface MailpitMessage {
  Text: string;
  HTML: string;
}

async function mailpit<T>(path: string, method = 'GET'): Promise<T> {
  const response = await fetch(`${MAILPIT_API}${path}`, { method });
  if (!response.ok) {
    throw new Error(`Mailpit respondeu ${response.status} em ${path}`);
  }
  return (method === 'DELETE' ? undefined : await response.json()) as T;
}

describe('NodemailerMailSender (integração com Mailpit)', () => {
  const sender = new NodemailerMailSender({
    host: process.env['SMTP_HOST'] ?? 'localhost',
    port: Number(process.env['SMTP_PORT'] ?? 1025),
    secure: false,
    from: 'Moraê <nao-responda@morae.local>',
  });

  beforeEach(async () => {
    await mailpit('/api/v1/messages', 'DELETE');
  });

  afterAll(() => {
    sender.close();
  });

  it('entrega o e-mail com remetente, destinatário, texto e HTML', async () => {
    await sender.send({
      to: 'maria@ufal.br',
      subject: 'Confirme seu e-mail no Moraê',
      text: 'Olá, Maria!',
      html: '<p>Olá, <strong>Maria</strong>!</p>',
    });

    const { messages } = await mailpit<{ messages: MailpitSummary[] }>(
      '/api/v1/messages',
    );
    expect(messages).toHaveLength(1);
    const [summary] = messages;
    expect(summary.Subject).toBe('Confirme seu e-mail no Moraê');
    expect(summary.From).toEqual({
      Address: 'nao-responda@morae.local',
      Name: 'Moraê',
    });
    expect(summary.To.map((to) => to.Address)).toEqual(['maria@ufal.br']);

    const message = await mailpit<MailpitMessage>(
      `/api/v1/message/${summary.ID}`,
    );
    expect(message.Text.trim()).toBe('Olá, Maria!');
    expect(message.HTML).toContain('<strong>Maria</strong>');
  });
});
