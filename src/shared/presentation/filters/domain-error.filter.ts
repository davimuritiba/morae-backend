import {
  Catch,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../../domain/errors/domain-error.js';

export interface DomainErrorResponse {
  statusCode: number;
  code: string;
  message: string;
}

// O domínio não conhece HTTP: o status sai da convenção de nomes do `code`.
// Um erro novo que siga a convenção já cai no status certo sem mexer aqui.
export function statusForDomainError(code: string): HttpStatus {
  if (code === 'INVALID_CREDENTIALS') return HttpStatus.UNAUTHORIZED;
  if (code.endsWith('_NOT_FOUND')) return HttpStatus.NOT_FOUND;
  // Duplicidade e transição de estado inválida conflitam com o que já existe.
  if (code.endsWith('_ALREADY_IN_USE') || code.endsWith('_TRANSITION')) {
    return HttpStatus.CONFLICT;
  }
  // Demais regras de negócio violadas (INVALID_EMAIL, INVALID_CPF...).
  return HttpStatus.UNPROCESSABLE_ENTITY;
}

// Só trata DomainError. Qualquer outro erro segue para o filtro padrão do
// Nest, que responde 500 sem expor detalhes internos.
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = statusForDomainError(error.code);

    const body: DomainErrorResponse = {
      statusCode: status,
      code: error.code,
      message: error.message,
    };
    response.status(status).json(body);
  }
}
