import { FakeMailSender } from '../../../../../shared/test/fakes/fake-mail-sender.js';
import type { PasswordResetMessage } from '../../../application/ports/password-reset-notifier.port.js';
import { MailPasswordResetNotifier } from '../../../infra/services/mail-password-reset-notifier.js';

const MESSAGE: PasswordResetMessage = {
  to: 'maria@ufal.br',
  name: 'Maria Silva',
  token: 'abc_DEF-123',
  expiresAt: new Date('2026-11-20T10:00:00.000Z'),
};

describe('MailPasswordResetNotifier', () => {
  const mailer = new FakeMailSender();
  const notifier = new MailPasswordResetNotifier(mailer, {
    appWebUrl: 'https://morae.app',
  });

  beforeEach(() => {
    mailer.sent.splice(0);
  });

  it('sends a reset link with a URL-encoded token', async () => {
    await notifier.sendPasswordResetEmail({
      ...MESSAGE,
      token: 'a+b/c=d',
    });

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe(MESSAGE.to);
    expect(mailer.sent[0].subject).toBe('Redefina sua senha no Moraê');
    expect(mailer.sent[0].text).toContain(
      'https://morae.app/redefinir-senha?token=a%2Bb%2Fc%3Dd',
    );
    expect(mailer.sent[0].html).toContain('Redefinir senha');
  });

  it('escapes the account name in the HTML email', async () => {
    await notifier.sendPasswordResetEmail({
      ...MESSAGE,
      name: '<script>alert("x")</script>',
    });

    expect(mailer.sent[0].html).not.toContain('<script>');
    expect(mailer.sent[0].html).toContain(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });
});
