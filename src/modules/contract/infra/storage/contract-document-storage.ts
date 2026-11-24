import { randomBytes, randomUUID, createCipheriv, createDecipheriv } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { getPublicUploadsRoot } from '../../../../shared/infra/media/public-image-directory.js';

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ENVELOPE_MAGIC = Buffer.from('MORAEDOC1');
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export interface StoredContractDocument {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

function documentMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 5 && buffer.toString('ascii', 0, 5) === '%PDF-') {
    return 'application/pdf';
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  return null;
}

function safeOriginalName(originalName: string): string {
  const filename = (originalName.split(/[\\/]/).pop() ?? '')
    .split('')
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 0x20 || code === 0x7f || '<>:"/\\|?*'.includes(character)
        ? '_'
        : character;
    })
    .join('')
    .trim()
    .slice(0, 180);
  return filename || 'documento';
}

function encryptionKey(): Buffer {
  const configured = process.env.CONTRACT_DOCUMENTS_ENCRYPTION_KEY?.trim();
  if (!configured) {
    throw new ServiceUnavailableException(
      'O armazenamento seguro de documentos não está configurado.',
    );
  }
  const key = Buffer.from(configured, 'base64');
  if (key.length !== 32) {
    throw new ServiceUnavailableException(
      'A chave de criptografia de documentos precisa conter 32 bytes em base64.',
    );
  }
  return key;
}

function privateDirectory(): string {
  const directory = resolve(
    process.env.CONTRACT_DOCUMENTS_DIR?.trim() || join(process.cwd(), 'private-documents'),
  );
  const publicDirectory = resolve(getPublicUploadsRoot());
  const normalizedDirectory =
    process.platform === 'win32' ? directory.toLowerCase() : directory;
  const normalizedPublicDirectory =
    process.platform === 'win32' ? publicDirectory.toLowerCase() : publicDirectory;
  const relativeToPublic = relative(normalizedPublicDirectory, normalizedDirectory);
  if (
    relativeToPublic === '' ||
    (relativeToPublic !== '..' &&
      !relativeToPublic.startsWith(`..${sep}`) &&
      !isAbsolute(relativeToPublic))
  ) {
    throw new Error('O diretório de documentos privados não pode estar em uploads públicos.');
  }
  return directory;
}

@Injectable()
export class ContractDocumentStorage {
  async store(file: Express.Multer.File): Promise<StoredContractDocument> {
    if (!file?.buffer?.length || file.buffer.length > MAX_DOCUMENT_BYTES) {
      throw new BadRequestException('O documento deve ter entre 1 byte e 10 MB.');
    }

    const mimeType = documentMimeType(file.buffer);
    if (!mimeType) {
      throw new BadRequestException('Envie um documento PDF, PNG ou JPEG válido.');
    }

    const key = encryptionKey();
    const storageKey = randomUUID();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(file.buffer), cipher.final()]);
    const envelope = Buffer.concat([
      ENVELOPE_MAGIC,
      iv,
      cipher.getAuthTag(),
      encrypted,
    ]);
    const directory = privateDirectory();
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(join(directory, storageKey), envelope, {
      flag: 'wx',
      mode: 0o600,
    });

    return {
      storageKey,
      originalName: safeOriginalName(file.originalname || 'documento'),
      mimeType,
      sizeBytes: file.buffer.length,
    };
  }

  async read(storageKey: string): Promise<Buffer> {
    const key = encryptionKey();
    const fileKey = this.validateStorageKey(storageKey);
    const envelope = await readFile(join(privateDirectory(), fileKey));
    const headerSize = ENVELOPE_MAGIC.length + IV_BYTES + AUTH_TAG_BYTES;
    if (
      envelope.length < headerSize ||
      !envelope.subarray(0, ENVELOPE_MAGIC.length).equals(ENVELOPE_MAGIC)
    ) {
      throw new Error('O documento armazenado possui um formato inválido.');
    }

    const ivStart = ENVELOPE_MAGIC.length;
    const tagStart = ivStart + IV_BYTES;
    const cipherStart = tagStart + AUTH_TAG_BYTES;
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      envelope.subarray(ivStart, tagStart),
    );
    decipher.setAuthTag(envelope.subarray(tagStart, cipherStart));
    return Buffer.concat([
      decipher.update(envelope.subarray(cipherStart)),
      decipher.final(),
    ]);
  }

  async remove(storageKey: string): Promise<void> {
    const fileKey = this.validateStorageKey(storageKey);
    await rm(join(privateDirectory(), fileKey), { force: true });
  }

  private validateStorageKey(storageKey: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storageKey)) {
      throw new BadRequestException('Identificador de arquivo inválido.');
    }
    return storageKey;
  }
}
