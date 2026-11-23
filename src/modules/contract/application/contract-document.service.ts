import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../shared/infra/database/prisma.service.js';
import { ContractDocumentStorage } from '../infra/storage/contract-document-storage.js';
import type { ContractDocumentType } from '../../../shared/infra/database/generated/prisma/client.js';

const DOCUMENT_UPLOADABLE_STATUSES = ['PENDING', 'ACTIVE', 'TERMINATED'];

@Injectable()
export class ContractDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ContractDocumentStorage,
  ) {}

  async list(contractId: string, userId: string) {
    await this.findParticipantContract(contractId, userId);
    const documents = await this.prisma.contractDocument.findMany({
      where: { contractId },
      include: { uploader: { select: { name: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return documents.map((document) => this.toResponse(document));
  }

  async upload(
    contractId: string,
    userId: string,
    documentType: ContractDocumentType,
    file: Express.Multer.File | undefined,
  ) {
    const contract = await this.findParticipantContract(contractId, userId);
    if (!DOCUMENT_UPLOADABLE_STATUSES.includes(contract.status)) {
      throw new ConflictException('Não é possível adicionar documentos a um contrato recusado.');
    }
    if (!file) throw new BadRequestException('Selecione um documento para enviar.');

    const stored = await this.storage.store(file);
    try {
      const document = await this.prisma.contractDocument.create({
        data: {
          id: randomUUID(),
          contractId,
          uploaderId: userId,
          storageKey: stored.storageKey,
          originalName: stored.originalName,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          documentType,
        },
        include: { uploader: { select: { name: true } } },
      });
      return this.toResponse(document);
    } catch (error) {
      try {
        await this.storage.remove(stored.storageKey);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Falha ao registrar o documento e limpar o arquivo criptografado.',
        );
      }
      throw error;
    }
  }

  async download(contractId: string, documentId: string, userId: string) {
    const document = await this.prisma.contractDocument.findFirst({
      where: {
        id: documentId,
        contractId,
        contract: {
          is: { OR: [{ ownerId: userId }, { tenantId: userId }] },
        },
      },
      include: { uploader: { select: { name: true } } },
    });
    if (!document) throw new NotFoundException('Documento não encontrado.');

    return {
      metadata: this.toResponse(document),
      content: await this.storage.read(document.storageKey),
    };
  }

  private async findParticipantContract(contractId: string, userId: string) {
    const contract = await this.prisma.rentalContract.findFirst({
      where: {
        id: contractId,
        OR: [{ ownerId: userId }, { tenantId: userId }],
      },
      select: { id: true, status: true },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado.');
    return contract;
  }

  private toResponse(document: {
    id: string;
    contractId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    documentType: ContractDocumentType;
    createdAt: Date;
    uploader: { name: string };
  }) {
    return {
      id: document.id,
      contractId: document.contractId,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      documentType: document.documentType,
      createdAt: document.createdAt.toISOString(),
      uploadedByName: document.uploader.name,
    };
  }
}
