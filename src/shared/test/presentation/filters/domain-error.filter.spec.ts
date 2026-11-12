import { HttpStatus, type ArgumentsHost } from '@nestjs/common';
import { DomainError } from '../../../domain/errors/domain-error.js';
import {
  DomainErrorFilter,
  statusForDomainError,
} from '../../../presentation/filters/domain-error.filter.js';

class FakeDomainError extends DomainError {
  constructor(readonly code: string) {
    super(`mensagem de ${code}`);
  }
}

function makeHost() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('DomainErrorFilter', () => {
  it.each([
    ['EMAIL_ALREADY_IN_USE', HttpStatus.CONFLICT],
    ['CPF_ALREADY_IN_USE', HttpStatus.CONFLICT],
    ['ENROLLMENT_NUMBER_ALREADY_IN_USE', HttpStatus.CONFLICT],
    ['INVALID_ACCOUNT_STATUS_TRANSITION', HttpStatus.CONFLICT],
    ['INVALID_VERIFICATION_TRANSITION', HttpStatus.CONFLICT],
    ['USER_NOT_FOUND', HttpStatus.NOT_FOUND],
    ['INVALID_CREDENTIALS', HttpStatus.UNAUTHORIZED],
    ['INVALID_EMAIL', HttpStatus.UNPROCESSABLE_ENTITY],
    ['INVALID_CPF', HttpStatus.UNPROCESSABLE_ENTITY],
    ['INVALID_PASSWORD', HttpStatus.UNPROCESSABLE_ENTITY],
  ])('%s → %i', (code, expected) => {
    expect(statusForDomainError(code)).toBe(expected);
  });

  it('responde com status, code e message do erro', () => {
    const { host, status, json } = makeHost();

    new DomainErrorFilter().catch(
      new FakeDomainError('EMAIL_ALREADY_IN_USE'),
      host,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      code: 'EMAIL_ALREADY_IN_USE',
      message: 'mensagem de EMAIL_ALREADY_IN_USE',
    });
  });
});
