import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../application/unit-of-work.js';
import { PrismaTransactionContext } from './prisma-transaction-context.js';

// Tudo o que os repositórios gravarem dentro de `work` vai numa única
// transação do banco: se `work` lançar erro, nada é confirmado.
@Injectable()
export class PrismaUnitOfWork extends UnitOfWork {
  constructor(private readonly context: PrismaTransactionContext) {
    super();
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.context.runInTransaction(work);
  }
}
