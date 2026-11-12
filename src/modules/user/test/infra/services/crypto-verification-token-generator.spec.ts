import { CryptoVerificationTokenGenerator } from '../../../infra/services/crypto-verification-token-generator.js';

describe('CryptoVerificationTokenGenerator', () => {
  const generator = new CryptoVerificationTokenGenerator();

  it('gera token base64url de 32 bytes, seguro para usar no link', () => {
    const { token } = generator.generate();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
  });

  it('gera um token diferente a cada chamada', () => {
    const tokens = new Set(
      Array.from({ length: 100 }, () => generator.generate().token),
    );

    expect(tokens.size).toBe(100);
  });

  it('devolve o hash do próprio token', () => {
    const { token, tokenHash } = generator.generate();

    expect(tokenHash).toBe(generator.hash(token));
    expect(tokenHash).not.toBe(token);
  });

  it('calcula SHA-256 em hexadecimal (64 caracteres, tamanho da coluna)', () => {
    expect(generator.hash('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('é determinístico para o mesmo token', () => {
    expect(generator.hash('token-x')).toBe(generator.hash('token-x'));
    expect(generator.hash('token-x')).not.toBe(generator.hash('token-y'));
  });
});
