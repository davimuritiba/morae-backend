import { Argon2Hasher } from '../../../infra/services/argon2-hasher.js';

// Lê os parâmetros gravados no hash: "$argon2id$v=19$m=19456,p=1,t=2$..."
function hashParams(hash: string): Record<string, string> {
  const params = hash.split('$')[3] ?? '';
  return Object.fromEntries(params.split(',').map((pair) => pair.split('=')));
}

describe('Argon2Hasher', () => {
  const hasher = new Argon2Hasher();

  it('gera hash Argon2id com os parâmetros do OWASP', async () => {
    const hash = await hasher.hash('senha-segura-123');

    expect(hash.startsWith('$argon2id$v=19$')).toBe(true);
    expect(hashParams(hash)).toEqual({ m: '19456', t: '2', p: '1' });
  });

  it('não guarda a senha no hash', async () => {
    const hash = await hasher.hash('senha-segura-123');

    expect(hash).not.toContain('senha-segura-123');
  });

  it('gera hashes diferentes para a mesma senha (salt aleatório)', async () => {
    const [first, second] = await Promise.all([
      hasher.hash('senha-segura-123'),
      hasher.hash('senha-segura-123'),
    ]);

    expect(first).not.toBe(second);
    expect(await hasher.compare('senha-segura-123', first)).toBe(true);
    expect(await hasher.compare('senha-segura-123', second)).toBe(true);
  });

  it('confere a senha correta e recusa a errada', async () => {
    const hash = await hasher.hash('senha-segura-123');

    expect(await hasher.compare('senha-segura-123', hash)).toBe(true);
    expect(await hasher.compare('senha-segura-124', hash)).toBe(false);
    expect(await hasher.compare('', hash)).toBe(false);
  });

  it('considera espaços e acentos parte da senha', async () => {
    const hash = await hasher.hash(' minha senha é longa ');

    expect(await hasher.compare(' minha senha é longa ', hash)).toBe(true);
    expect(await hasher.compare('minha senha é longa', hash)).toBe(false);
    expect(await hasher.compare(' minha senha e longa ', hash)).toBe(false);
  });

  it('diferencia senhas longas que só mudam no fim (sem o limite de 72 bytes do bcrypt)', async () => {
    const prefix = 'a'.repeat(100);
    const hash = await hasher.hash(`${prefix}1`);

    expect(await hasher.compare(`${prefix}1`, hash)).toBe(true);
    expect(await hasher.compare(`${prefix}2`, hash)).toBe(false);
  });

  it.each([
    'hashed:senha-segura-123',
    '$2b$10$abcdefghijklmnopqrstuuJ9bS3zZ1q9hQwYV3n7x8yQ0m1oX2K',
    '',
  ])('recusa hash que não é Argon2 sem lançar erro: %j', async (hash) => {
    await expect(hasher.compare('senha-segura-123', hash)).resolves.toBe(false);
  });
});
