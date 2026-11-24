import { BadRequestException } from '@nestjs/common';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PublicImageDirectory } from '../../../infra/media/public-image-directory.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('PublicImageDirectory', () => {
  let root: string;
  const users = new PublicImageDirectory('users');

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'morae-uploads-'));
    process.env.UPLOADS_DIR = root;
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
    delete process.env.UPLOADS_DIR;
  });

  it('grava em UPLOADS_DIR/<pasta> e apaga só o que gravou', async () => {
    const [url] = await users.save([{ buffer: PNG, mimetype: 'image/png', size: PNG.length }]);

    expect(url).toMatch(/^\/uploads\/users\/[0-9a-f-]{36}\.png$/);
    expect(users.isStoredUrl(url)).toBe(true);
    const path = join(root, 'users', url.split('/').pop()!);
    await expect(access(path)).resolves.toBeUndefined();

    await users.remove([url, 'https://cdn.exemplo.com/foto.png', '/uploads/users/../segredo.png']);
    await expect(access(path)).rejects.toThrow();
  });

  it.each([
    'https://cdn.exemplo.com/foto.png',
    '/uploads/listings/0b7e2f4c-9a1d-4c3e-8f5a-2d6b7c8e9f01.png',
    '/uploads/users/../0b7e2f4c-9a1d-4c3e-8f5a-2d6b7c8e9f01.png',
    '/uploads/users/0b7e2f4c-9a1d-4c3e-8f5a-2d6b7c8e9f01.svg',
  ])('não reconhece %j como arquivo da pasta', (url) => {
    expect(users.isStoredUrl(url)).toBe(false);
  });

  it('rejeita arquivo maior que 5 MB', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    await expect(
      users.save([{ buffer: big, mimetype: 'image/png', size: big.length }]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita conteúdo que não bate com o tipo informado', async () => {
    await expect(
      users.save([{ buffer: Buffer.from('<svg/>'), mimetype: 'image/png', size: 6 }]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
