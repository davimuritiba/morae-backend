import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

// Única instância do Prisma Client na aplicação (cada instância abre seu
// próprio pool de conexões). Só a camada de infra deve injetá-lo.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      throw new Error('DATABASE_URL não definida.');
    }
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  // Conecta na subida da aplicação, para falhar logo se o banco estiver fora.
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
