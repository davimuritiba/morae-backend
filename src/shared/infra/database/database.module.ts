import { Global, Module } from '@nestjs/common';
import { UnitOfWork } from '../../application/unit-of-work.js';
import { PrismaTransactionContext } from './prisma-transaction-context.js';
import { PrismaUnitOfWork } from './prisma-unit-of-work.js';
import { PrismaService } from './prisma.service.js';

// Global: os módulos de contexto injetam o PrismaTransactionContext nos seus
// repositórios e o UnitOfWork nos casos de uso sem precisar importar este
// módulo.
@Global()
@Module({
  providers: [
    PrismaService,
    PrismaTransactionContext,
    { provide: UnitOfWork, useClass: PrismaUnitOfWork },
  ],
  exports: [PrismaService, PrismaTransactionContext, UnitOfWork],
})
export class DatabaseModule {}
