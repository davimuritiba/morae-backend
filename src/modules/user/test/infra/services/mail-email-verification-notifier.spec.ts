import { FakeMailSender } from '../../../../../shared/test/fakes/fake-mail-sender.js';
import type { EmailVerificationMessage } from '../../../application/ports/email-verification-notifier.port.js';
import { MailEmailVerificationNotifier } from '../../../infra/services/mail-email-verification-notifier.js';

function makeMessage(
  overrides: Partial<EmailVerificationMessage> = {},
): EmailVerificationMessage {
  return {
    to: 'maria@ufal.br',
    name: 'Maria Silva',
    token: 'abc_DEF-123',
    // 10:00 UTC = 07:00 em Maceió
    expiresAt: new Date('2026-11-13T10:00:00.000Z'),
    ...overrides,
  };
}

describe('MailEmailVerificationNotifier', () => {
  let mailer: FakeMailSender;

  beforeEach(() => {
    mailer = new FakeMailSender();
  });

  function notifier(appWebUrl = 'https://morae.app') {
    return new MailEmailVerificationNotifier(mailer, { appWebUrl });
  }

  it('envia para o usuário com assunto, texto e HTML', async () => {
    await notifier().sendVerificationEmail(makeMessage());

    expect(mailer.sent).toHaveLength(1);
    const [mail] = mailer.sent;
    expect(mail.to).toBe('maria@ufal.br');
    expect(mail.subject).toBe('Confirme seu e-mail no Moraê');
    expect(mail.text).toContain('Olá, Maria Silva!');
    expect(mail.html).toContain('<p>Olá, Maria Silva!</p>');
  });

  it('inclui o link do front-end com o token', async () => {
    await notifier().sendVerificationEmail(makeMessage());

    const link = 'https://morae.app/verificar-email?token=abc_DEF-123';
    expect(mailer.sent[0].text).toContain(link);
    expect(mailer.sent[0].html).toContain(`href="${link}"`);
  });

  it.each([
    ['https://morae.app/', 'https://morae.app/verificar-email'],
    ['https://site.com/morae', 'https://site.com/morae/verificar-email'],
    ['http://localhost:5173', 'http://localhost:5173/verificar-email'],
  ])('monta o link a partir de %s', async (appWebUrl, expected) => {
    await notifier(appWebUrl).sendVerificationEmail(makeMessage());

    expect(mailer.sent[0].text).toContain(`${expected}?token=abc_DEF-123`);
  });

  it('codifica caracteres especiais do token na URL', async () => {
    await notifier().sendVerificationEmail(makeMessage({ token: 'a+b/c=d' }));

    expect(mailer.sent[0].text).toContain('?token=a%2Bb%2Fc%3Dd');
  });

  it('informa a validade no horário de Maceió', async () => {
    await notifier().sendVerificationEmail(makeMessage());

    expect(mailer.sent[0].text).toContain('13/11/2026');
    expect(mailer.sent[0].text).toContain('07:00');
  });

  it('escapa o nome no HTML', async () => {
    await notifier().sendVerificationEmail(
      makeMessage({ name: '<script>alert("x")</script>' }),
    );

    const { html } = mailer.sent[0];
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });

  it('recusa endereço de front-end inválido', () => {
    expect(() => notifier('não é url')).toThrow();
  });
});
