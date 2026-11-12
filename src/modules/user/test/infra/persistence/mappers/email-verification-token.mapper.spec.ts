import { EmailVerificationToken } from '../../../../domain/entities/email-verification-token.entity.js';
import { EmailVerificationTokenMapper } from '../../../../infra/persistence/mappers/email-verification-token.mapper.js';

const ISSUED_AT = new Date('2026-11-12T10:00:00.000Z');
const EXPIRES_AT = new Date('2026-11-13T10:00:00.000Z');

describe('EmailVerificationTokenMapper', () => {
  function makeToken(): EmailVerificationToken {
    return EmailVerificationToken.create({
      userId: '0b6f3c1e-8f2a-4c1d-9a51-3f1f2c7d9e10',
      tokenHash: 'a'.repeat(64),
      issuedAt: ISSUED_AT,
      expiresAt: EXPIRES_AT,
    });
  }

  it('converte a entidade na linha da tabela', () => {
    const token = makeToken();

    expect(EmailVerificationTokenMapper.toPersistence(token)).toEqual({
      id: token.id,
      userId: '0b6f3c1e-8f2a-4c1d-9a51-3f1f2c7d9e10',
      tokenHash: 'a'.repeat(64),
      expiresAt: EXPIRES_AT,
      usedAt: null,
      createdAt: ISSUED_AT,
    });
  });

  it('preserva o estado na ida e volta, inclusive o uso', () => {
    const token = makeToken();
    const usedAt = new Date('2026-11-12T11:00:00.000Z');
    token.use(usedAt);

    const restored = EmailVerificationTokenMapper.toDomain(
      EmailVerificationTokenMapper.toPersistence(token),
    );

    expect(restored.id).toBe(token.id);
    expect(restored.userId).toBe(token.userId);
    expect(restored.tokenHash).toBe(token.tokenHash);
    expect(restored.expiresAt).toEqual(EXPIRES_AT);
    expect(restored.createdAt).toEqual(ISSUED_AT);
    expect(restored.usedAt).toEqual(usedAt);
    expect(restored.isUsed).toBe(true);
  });
});
