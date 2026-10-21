import type { VerificationStatus } from '../enums/verification-status.enum.js';
import { DomainError } from './domain-error.js';

export class InvalidVerificationTransitionError extends DomainError {
  readonly code = 'INVALID_VERIFICATION_TRANSITION';

  constructor(from: VerificationStatus, to: VerificationStatus) {
    super(`Não é possível alterar a verificação de ${from} para ${to}.`);
  }
}
