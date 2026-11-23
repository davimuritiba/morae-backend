import { Module } from '@nestjs/common';
import { ContractDocumentService } from './application/contract-document.service.js';
import { ContractDocumentStorage } from './infra/storage/contract-document-storage.js';
import { ContractDocumentsController } from './presentation/http/controllers/contract-documents.controller.js';

@Module({
  controllers: [ContractDocumentsController],
  providers: [ContractDocumentService, ContractDocumentStorage],
})
export class ContractModule {}