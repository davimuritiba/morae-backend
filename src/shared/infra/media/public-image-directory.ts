import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { BadRequestException } from '@nestjs/common';

// Imagens enviadas pelos usuários ficam no disco, em UPLOADS_DIR/<pasta>, e
// são servidas publicamente em /uploads/<pasta>/<arquivo> (ver main.ts). O
// banco guarda só esse caminho.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type PublicImageFolder = 'listings' | 'users';

export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const STORED_FILENAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

// Lido a cada uso (e não no carregamento do módulo) para os testes poderem
// apontar UPLOADS_DIR para uma pasta temporária.
export function getPublicUploadsRoot(): string {
  return resolve(process.env.UPLOADS_DIR?.trim() || join(process.cwd(), 'uploads'));
}

// Confere o tipo pelo conteúdo do arquivo, não só pelo MIME informado pelo
// navegador, que o cliente controla.
export function detectImageExtension(file: UploadedImage): 'jpg' | 'png' | 'webp' | null {
  const { buffer, mimetype } = file;
  if (
    mimetype === 'image/jpeg' &&
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) return 'jpg';

  if (
    mimetype === 'image/png' &&
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return 'png';

  if (
    mimetype === 'image/webp' &&
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) return 'webp';

  return null;
}

export class PublicImageDirectory {
  constructor(readonly folder: PublicImageFolder) {}

  get path(): string {
    return join(getPublicUploadsRoot(), this.folder);
  }

  get urlPrefix(): string {
    return `/uploads/${this.folder}/`;
  }

  // true só para arquivos que esta pasta gravou. URLs externas (ex.: foto do
  // Google ou dados de demonstração) nunca viram caminho no disco.
  isStoredUrl(url: string): boolean {
    return url.startsWith(this.urlPrefix) && STORED_FILENAME.test(url.slice(this.urlPrefix.length));
  }

  // Valida todos os arquivos antes de gravar qualquer um; se uma gravação
  // falhar, apaga o que já tinha sido gravado.
  async save(files: UploadedImage[]): Promise<string[]> {
    const extensions = files.map((file) => {
      if (file.size > MAX_IMAGE_BYTES || file.buffer.length > MAX_IMAGE_BYTES) {
        throw new BadRequestException('Cada foto deve ter no máximo 5 MB.');
      }
      const extension = detectImageExtension(file);
      if (!extension) {
        throw new BadRequestException('Use somente imagens JPEG, PNG ou WEBP válidas.');
      }
      return extension;
    });

    const directory = this.path;
    await mkdir(directory, { recursive: true });

    const urls: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        const filename = `${randomUUID()}.${extensions[index]}`;
        await writeFile(join(directory, filename), file.buffer, { flag: 'wx' });
        urls.push(`${this.urlPrefix}${filename}`);
      }
    } catch (error) {
      try {
        await this.remove(urls);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Falha ao salvar as fotos e limpar os arquivos temporários.',
        );
      }
      throw error;
    }
    return urls;
  }

  // Ignora URLs que não são arquivos desta pasta.
  async remove(urls: string[]): Promise<void> {
    await Promise.all(
      urls
        .filter((url) => this.isStoredUrl(url))
        .map((url) => rm(join(this.path, url.slice(this.urlPrefix.length)), { force: true })),
    );
  }
}
