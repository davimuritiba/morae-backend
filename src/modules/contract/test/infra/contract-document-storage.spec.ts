import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('ContractDocumentStorage', () => {
  let directory: string;
  let storage: import('../../infra/storage/contract-document-storage.js').ContractDocumentStorage;
  let originalDirectory: string | undefined;
  let originalKey: string | undefined;

  beforeEach(async () => {
    originalDirectory = process.env.CONTRACT_DOCUMENTS_DIR;
    originalKey = process.env.CONTRACT_DOCUMENTS_ENCRYPTION_KEY;
    directory = await mkdtemp(join(tmpdir(), 'morae-contract-documents-'));
    process.env.CONTRACT_DOCUMENTS_DIR = directory;
    process.env.CONTRACT_DOCUMENTS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    const { ContractDocumentStorage } = await import(
      '../../infra/storage/contract-document-storage.js'
    );
    storage = new ContractDocumentStorage();
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
    if (originalDirectory === undefined) delete process.env.CONTRACT_DOCUMENTS_DIR;
    else process.env.CONTRACT_DOCUMENTS_DIR = originalDirectory;
    if (originalKey === undefined) delete process.env.CONTRACT_DOCUMENTS_ENCRYPTION_KEY;
    else process.env.CONTRACT_DOCUMENTS_ENCRYPTION_KEY = originalKey;
  });

  it('encrypts uploaded PDF bytes and recovers the original document', async () => {
    const bytes = Buffer.from('%PDF-1.7\nprivate contract content\n%%EOF');
    const document = await storage.store({
      buffer: bytes,
      size: bytes.length,
      mimetype: 'application/pdf',
      originalname: '../../contrato assinado.pdf',
    } as Express.Multer.File);

    expect(document).toMatchObject({
      originalName: 'contrato assinado.pdf',
      mimeType: 'application/pdf',
      sizeBytes: bytes.length,
    });
    const encrypted = await readFile(join(directory, document.storageKey));
    expect(encrypted.includes(Buffer.from('private contract content'))).toBe(false);
    await expect(storage.read(document.storageKey)).resolves.toEqual(bytes);
    await storage.remove(document.storageKey);
  });

  it('rejects fake file contents even when the MIME type claims PDF', async () => {
    await expect(storage.store({
      buffer: Buffer.from('not a PDF'),
      size: 9,
      mimetype: 'application/pdf',
      originalname: 'contrato.pdf',
    } as Express.Multer.File)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fails closed when the encryption key is missing', async () => {
    delete process.env.CONTRACT_DOCUMENTS_ENCRYPTION_KEY;
    const bytes = Buffer.from('%PDF-1.7\ncontract');

    await expect(storage.store({
      buffer: bytes,
      size: bytes.length,
      mimetype: 'application/pdf',
      originalname: 'contrato.pdf',
    } as Express.Multer.File)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
