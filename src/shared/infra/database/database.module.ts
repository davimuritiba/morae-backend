import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// Global: os módulos de contexto injetam o PrismaService nos seus
// repositórios sem precisar importar este módulo.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
