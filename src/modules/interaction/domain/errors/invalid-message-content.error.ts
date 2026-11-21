import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidMessageContentError extends DomainError {
  readonly code = 'INVALID_MESSAGE_CONTENT';

  constructor(maxLength: number) {
    super(
      `A mensagem não pode ficar em branco e deve ter no máximo ${maxLength} caracteres.`,
    );
  }
}
