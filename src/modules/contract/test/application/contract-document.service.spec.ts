import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../../shared/infra/database/prisma.service.js';
import { ContractDocumentService } from '../../application/contract-document.service.js';
import type { ContractDocumentStorage } from '../../infra/storage/contract-document-storage.js';

const contractId = '742acb7b-71d3-4f69-8cbd-1da273e57abe';
const documentId = 'c0d44327-2cec-466c-8dcb-ff0b2f6d8534';
const userId = 'bc7363e2-3174-4c48-bf0f-6488e6e741a2';
const storageKey = '21eb8640-12db-45c8-96ab-25badb983239';
const now = new Date('2026-12-07T12:00:00.000Z');

describe('ContractDocumentService', () => {
  let service: ContractDocumentService;
  let rentalContractFindFirst: ReturnType<typeof vi.fn>;
  let documentFindMany: ReturnType<typeof vi.fn>;
  let documentFindFirst: ReturnType<typeof vi.fn>;
  let documentCreate: ReturnType<typeof vi.fn>;
  let store: ReturnType<typeof vi.fn>;
  let read: ReturnType<typeof vi.fn>;
  let remove: ReturnType<typeof vi.fn>;

  const document = {
    id: documentId,
    contractId,
    uploaderId: userId,
    storageKey,
    originalName: 'contrato.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 120,
    documentType: 'SIGNED_CONTRACT' as const,
    createdAt: now,
    uploader: { name: 'Carla' },
  };

  beforeEach(() => {
    rentalContractFindFirst = vi.fn().mockResolvedValue({ id: contractId, status: 'ACTIVE' });
    documentFindMany = vi.fn().mockResolvedValue([document]);
    documentFindFirst = vi.fn().mockResolvedValue(document);
    documentCreate = vi.fn().mockResolvedValue(document);
    store = vi.fn().mockResolvedValue({
      storageKey,
      originalName: 'contrato.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 120,
    });
    read = vi.fn().mockResolvedValue(Buffer.from('%PDF-1.7'));
    remove = vi.fn().mockResolvedValue(undefined);

    const prisma = {
      rentalContract: { findFirst: rentalContractFindFirst },
      contractDocument: {
        findMany: documentFindMany,
        findFirst: documentFindFirst,
        create: documentCreate,
      },
    } as unknown as PrismaService;
    const storage = { store, read, remove } as unknown as ContractDocumentStorage;
    service = new ContractDocumentService(prisma, storage);
  });

  it('stores the file, records its metadata, and lists documents to a participant', async () => {
    const file = {
      buffer: Buffer.from('%PDF-1.7'),
      originalname: 'contrato.pdf',
    } as Express.Multer.File;

    await expect(
      service.upload(contractId, userId, 'SIGNED_CONTRACT', file),
    ).resolves.toMatchObject({
      id: documentId,
      originalName: 'contrato.pdf',
      documentType: 'SIGNED_CONTRACT',
    });
    expect(documentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ contractId, uploaderId: userId, storageKey }),
      }),
    );
    await expect(service.list(contractId, userId)).resolves.toHaveLength(1);
  });

  it('does not store a file when the user is not a contract participant', async () => {
    rentalContractFindFirst.mockResolvedValue(null);

    await expect(
      service.upload(contractId, userId, 'SIGNED_CONTRACT', {} as Express.Multer.File),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(store).not.toHaveBeenCalled();
  });

  it('removes the encrypted file if metadata cannot be persisted', async () => {
    documentCreate.mockRejectedValue(new Error('database unavailable'));
    const file = {
      buffer: Buffer.from('%PDF-1.7'),
      originalname: 'contrato.pdf',
    } as Express.Multer.File;

    await expect(
      service.upload(contractId, userId, 'SIGNED_CONTRACT', file),
    ).rejects.toThrow('database unavailable');
    expect(remove).toHaveBeenCalledWith(storageKey);
  });

  it('downloads only a document belonging to the participant contract', async () => {
    await expect(
      service.download(contractId, documentId, userId),
    ).resolves.toMatchObject({ metadata: { id: documentId }, content: Buffer.from('%PDF-1.7') });
    expect(documentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: documentId,
          contractId,
          contract: { is: { OR: [{ ownerId: userId }, { tenantId: userId }] } },
        }),
      }),
    );
  });

  it('does not read a document unavailable to the current user', async () => {
    documentFindFirst.mockResolvedValue(null);

    await expect(
      service.download(contractId, documentId, userId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(read).not.toHaveBeenCalled();
  });
});
