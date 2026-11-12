import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import type { Prisma } from './generated/prisma/client.js';
import { PrismaService } from './prisma.service.js';

// Guarda a transação em andamento no contexto da chamada assíncrona.
// Os repositórios pegam o cliente por aqui: dentro de runInTransaction()
// recebem o da transação; fora, o PrismaService normal. Assim eles participam
// da mesma transação sem receber nenhum parâmetro extra.
@Injectable()
export class PrismaTransactionContext {
  readonly #storage = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(private readonly prisma: PrismaService) {}

  get client(): Prisma.TransactionClient {
    return this.#storage.getStore() ?? this.prisma;
  }

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    // Já dentro de uma transação: participa dela em vez de abrir outra
    // (o Prisma não suporta transações interativas aninhadas).
    if (this.#storage.getStore()) {
      return work();
    }

    return this.prisma.$transaction((tx) => this.#storage.run(tx, work));
  }
}
