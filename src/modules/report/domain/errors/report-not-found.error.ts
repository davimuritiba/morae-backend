import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ReportNotFoundError extends DomainError {
  readonly code = 'REPORT_NOT_FOUND';

  constructor() {
    super('Denúncia não encontrada.');
  }
}
