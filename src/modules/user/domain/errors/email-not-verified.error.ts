import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

// Só é lançado depois que a senha confere: quem não sabe a senha continua
// recebendo INVALID_CREDENTIALS e não descobre se o e-mail está cadastrado.
export class EmailNotVerifiedError extends DomainError {
  readonly code = 'EMAIL_NOT_VERIFIED';

  constructor() {
    super(
      'Confirme seu e-mail antes de entrar. Use o link que enviamos para o seu endereço.',
    );
  }
}
