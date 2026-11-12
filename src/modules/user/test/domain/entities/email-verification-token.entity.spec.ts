import {
  EmailVerificationToken,
  type CreateEmailVerificationTokenProps,
} from '../../../domain/entities/email-verification-token.entity.js';
import { InvalidEmailVerificationTokenError } from '../../../domain/errors/invalid-email-verification-token.error.js';

const ISSUED_AT = new Date('2026-11-12T10:00:00.000Z');
const EXPIRES_AT = new Date('2026-11-13T10:00:00.000Z'); // 24 h depois

function makeInput(
  overrides: Partial<CreateEmailVerificationTokenProps> = {},
): CreateEmailVerificationTokenProps {
  return {
    userId: '0b6f3c1e-8f2a-4c1d-9a51-3f1f2c7d9e10',
    tokenHash: 'hash-secreto-do-token',
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
    ...overrides,
  };
}

function minutesAfter(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

describe('EmailVerificationToken', () => {
  describe('create', () => {
    it('nasce ativo, sem uso e com as datas informadas', () => {
      const token = EmailVerificationToken.create(makeInput());

      expect(token.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(token.userId).toBe('0b6f3c1e-8f2a-4c1d-9a51-3f1f2c7d9e10');
      expect(token.tokenHash).toBe('hash-secreto-do-token');
      expect(token.createdAt).toEqual(ISSUED_AT);
      expect(token.expiresAt).toEqual(EXPIRES_AT);
      expect(token.usedAt).toBeNull();
      expect(token.isUsed).toBe(false);
      expect(token.isActive(ISSUED_AT)).toBe(true);
    });

    it('copia as datas recebidas', () => {
      const expiresAt = new Date(EXPIRES_AT);
      const token = EmailVerificationToken.create(makeInput({ expiresAt }));

      expiresAt.setFullYear(2099);

      expect(token.expiresAt).toEqual(EXPIRES_AT);
    });

    it.each([
      ['expiração igual à emissão', { expiresAt: ISSUED_AT }],
      [
        'expiração antes da emissão',
        { expiresAt: minutesAfter(ISSUED_AT, -1) },
      ],
      ['data inválida', { expiresAt: new Date('não é data') }],
      ['userId vazio', { userId: '' }],
      ['tokenHash vazio', { tokenHash: '' }],
    ])('recusa %s', (_case, overrides) => {
      expect(() =>
        EmailVerificationToken.create(makeInput(overrides)),
      ).toThrow();
    });
  });

  describe('expiração', () => {
    const token = EmailVerificationToken.create(makeInput());

    it('é válido até um instante antes de expiresAt', () => {
      expect(token.isExpired(minutesAfter(EXPIRES_AT, -1))).toBe(false);
    });

    it('expira exatamente em expiresAt', () => {
      expect(token.isExpired(EXPIRES_AT)).toBe(true);
      expect(token.isActive(EXPIRES_AT)).toBe(false);
    });
  });

  describe('use', () => {
    it('marca o token como usado no instante informado', () => {
      const token = EmailVerificationToken.create(makeInput());
      const now = minutesAfter(ISSUED_AT, 30);

      token.use(now);

      expect(token.isUsed).toBe(true);
      expect(token.usedAt).toEqual(now);
      expect(token.isActive(now)).toBe(false);
    });

    it('não pode ser usado duas vezes', () => {
      const token = EmailVerificationToken.create(makeInput());
      const firstUse = minutesAfter(ISSUED_AT, 30);
      token.use(firstUse);

      expect(() => token.use(minutesAfter(ISSUED_AT, 31))).toThrow(
        InvalidEmailVerificationTokenError,
      );
      expect(token.usedAt).toEqual(firstUse);
    });

    it('não pode ser usado depois de expirar', () => {
      const token = EmailVerificationToken.create(makeInput());

      expect(() => token.use(EXPIRES_AT)).toThrow(
        InvalidEmailVerificationTokenError,
      );
      expect(token.isUsed).toBe(false);
    });
  });

  describe('restore', () => {
    it('reconstrói o token com o estado salvo', () => {
      const usedAt = minutesAfter(ISSUED_AT, 10);

      const token = EmailVerificationToken.restore('id-salvo', {
        userId: 'user-1',
        tokenHash: 'hash',
        expiresAt: EXPIRES_AT,
        usedAt,
        createdAt: ISSUED_AT,
      });

      expect(token.id).toBe('id-salvo');
      expect(token.usedAt).toEqual(usedAt);
      expect(token.isUsed).toBe(true);
      expect(() => token.use(minutesAfter(ISSUED_AT, 20))).toThrow(
        InvalidEmailVerificationTokenError,
      );
    });
  });

  it('não expõe o hash ao ser serializado', () => {
    const token = EmailVerificationToken.create(makeInput());

    expect(JSON.stringify(token)).not.toContain('hash-secreto-do-token');
  });
});
