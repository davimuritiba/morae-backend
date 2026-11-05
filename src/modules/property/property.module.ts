import { Module } from '@nestjs/common';
import { PublishPropertyUseCase } from './application/use-cases/publish-property/publish-property.use-case.js';
import { PropertyRepository } from './domain/repositories/property.repository.js';
import { PrismaPropertyRepository } from './infra/persistence/repositories/prisma-property.repository.js';
import { PropertyController } from './presentation/http/controllers/property.controller.js';

@Module({
  providers: [
    PublishPropertyUseCase,
    PrismaPropertyRepository,
    { provide: PropertyRepository, useExisting: PrismaPropertyRepository },
  ],
  controllers: [PropertyController],
  exports: [PublishPropertyUseCase, PropertyRepository],
})
export class PropertyModule {}
