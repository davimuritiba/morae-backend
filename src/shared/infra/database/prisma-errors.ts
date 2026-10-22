import type { DomainError } from '../../domain/errors/domain-error.js';
import { Prisma } from './generated/prisma/client.js';

// Nome da constraint UNIQUE violada (ex.: "users_email_key"), ou null se o
// erro não for de unicidade (P2002).
//
// Com driver adapter (@prisma/adapter-pg, Prisma 7.10), o P2002 não traz
// `meta.target`: o nome vem em meta.driverAdapterError.cause.constraint.index.
// `meta.target` fica como alternativa, caso o formato mude.
export function violatedUniqueConstraint(error: unknown): string | null {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return null;
  }

  const adapterError = error.meta?.['driverAdapterError'];
  const cause = isRecord(adapterError) ? adapterError['cause'] : undefined;
  const constraint = isRecord(cause) ? cause['constraint'] : undefined;
  const index = isRecord(constraint) ? constraint['index'] : undefined;
  if (typeof index === 'string') return index;

  const target = error.meta?.['target'];
  return typeof target === 'string' ? target : null;
}

// Relança a violação de unicidade como o erro de domínio correspondente à
// constraint. Qualquer outro erro é relançado como veio.
export function rethrowUniqueViolation(
  error: unknown,
  errorsByConstraint: Record<string, () => DomainError>,
): never {
  const constraint = violatedUniqueConstraint(error);
  const toDomainError = constraint ? errorsByConstraint[constraint] : undefined;
  throw toDomainError ? toDomainError() : error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
