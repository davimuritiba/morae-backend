import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { ContractDocumentService } from '../../../application/contract-document.service.js';
import { UploadContractDocumentDto } from '../dto/upload-contract-document.dto.js';

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

@Controller('rental-contracts/:contractId/documents')
@UseGuards(JwtAuthGuard)
export class ContractDocumentsController {
  constructor(private readonly documents: ContractDocumentService) {}

  @Get()
  list(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.documents.list(contractId, userId);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 } }),
  )
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  upload(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @CurrentUserId() userId: string,
    @Body() input: UploadContractDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.documents.upload(contractId, userId, input.documentType, file);
  }

  @Get(':documentId/download')
  async download(
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUserId() userId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { metadata, content } = await this.documents.download(
      contractId,
      documentId,
      userId,
    );
    const fallbackName = metadata.originalName
      .replace(/[^\x20-\x7e]/g, '_')
      .replace(/["\\;]/g, '_');
    const encodedName = encodeURIComponent(metadata.originalName).replace(
      /['()*]/g,
      (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    response.setHeader('Content-Type', metadata.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Length', content.length);
    return new StreamableFile(content);
  }
}
