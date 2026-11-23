import { IsEnum } from 'class-validator';
import { ContractDocumentType } from '../../../../../shared/infra/database/generated/prisma/client.js';

export class UploadContractDocumentDto {
  @IsEnum(ContractDocumentType)
  documentType!: ContractDocumentType;
}
