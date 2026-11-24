import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ReportUserNotVerifiedError extends DomainError {
  readonly code = 'REPORT_VERIFICATION_ACCESS_DENIED';

  constructor() {
    super('Confirme seu e-mail e verifique seu perfil para enviar denúncias.');
  }
}
