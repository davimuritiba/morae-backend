import { VerificationStatus } from '../../../domain/enums/verification-status.enum.js';
import type { VerificationStatus as PrismaVerificationStatus } from '../generated/prisma/client.js';

// Tabelas explícitas nos dois sentidos: se um enum ganhar um valor que o
// outro não tem, o TypeScript acusa erro aqui.
export const verificationStatusToPrisma: Record<
  VerificationStatus,
  PrismaVerificationStatus
> = {
  [VerificationStatus.PENDING]: 'PENDING',
  [VerificationStatus.VERIFIED]: 'VERIFIED',
  [VerificationStatus.REJECTED]: 'REJECTED',
};

export const verificationStatusToDomain: Record<
  PrismaVerificationStatus,
  VerificationStatus
> = {
  PENDING: VerificationStatus.PENDING,
  VERIFIED: VerificationStatus.VERIFIED,
  REJECTED: VerificationStatus.REJECTED,
};
