import { BadRequestException } from '@nestjs/common';
import { isUuid } from '../../../../shared/infra/database/uuid.js';

export interface DecodedCursor {
  at: Date;
  id: string;
}

export function encodeCursor(at: Date, id: string): string {
  return Buffer.from(`${at.toISOString()}|${id}`).toString('base64url');
}

export function decodeCursor(raw: string | undefined): DecodedCursor | null {
  if (raw === undefined) return null;

  const [iso, id] = Buffer.from(raw, 'base64url').toString('utf8').split('|');
  const at = new Date(iso ?? '');
  if (!id || !isUuid(id) || Number.isNaN(at.getTime())) {
    throw new BadRequestException('cursor inválido.');
  }
  return { at, id };
}
