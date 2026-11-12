import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import type { Property } from '../../../domain/entities/property.entity.js';
import { PropertyRepository } from '../../../domain/repositories/property.repository.js';
import { PropertyMapper } from '../mappers/property.mapper.js';

@Injectable()
export class PrismaPropertyRepository extends PropertyRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Property | null> {
    const row = await this.prisma.property.findUnique({
      where: { id },
      include: { residence: true, cohabitants: true, listings: { include: { media: true }, orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    return row ? PropertyMapper.toDomain(row) : null;
  }

  async save(property: Property): Promise<void> {
    await this.prisma.property.create({ data: PropertyMapper.toPersistence(property) });
  }
}
