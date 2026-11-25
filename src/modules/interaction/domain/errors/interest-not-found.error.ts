import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InterestNotFoundError extends DomainError {
  readonly code = 'INTEREST_NOT_FOUND';

  constructor() {
<<<<<<< HEAD
    super('Manifestação de interesse não encontrada.');
=======
    super('A manifestação de interesse não foi encontrada.');
>>>>>>> d7b741c (fix(interests): listar manifestações para anunciantes)
  }
}
