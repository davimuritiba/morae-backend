import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../../../shared/infra/database/prisma-transaction-context.js';
import { isUuid } from '../../../../../shared/infra/database/uuid.js';
import {
  verificationStatusToDomain,
  verificationStatusToPrisma,
} from '../../../../../shared/infra/database/mappers/verification-status.mapper.js';
import { PropertyOwner } from '../../../domain/entities/property-owner.entity.js';
import { PropertyOwnerRepository } from '../../../domain/repositories/property-owner.repository.js';

@Injectable()
export class PrismaPropertyOwnerRepository extends PropertyOwnerRepository {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async findById(id: string): Promise<PropertyOwner | null> {
    if (!isUuid(id)) return null;
    const row = await this.db.client.propertyOwner.findUnique({
      where: { id },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<PropertyOwner | null> {
    if (!isUuid(userId)) return null;
    const row = await this.db.client.propertyOwner.findUnique({
      where: { userId },
    });
    return row ? this.toDomain(row) : null;
  }

  async save(owner: PropertyOwner): Promise<void> {
    const data = {
      id: owner.id,
      userId: owner.userId,
      verificationStatus: verificationStatusToPrisma[owner.verificationStatus],
      createdAt: owner.createdAt,
      updatedAt: owner.updatedAt,
    };
    await this.db.client.propertyOwner.upsert({
      where: { id: owner.id },
      create: data,
      update: data,
    });
  }

  private toDomain(row: {
    id: string;
    userId: string;
    verificationStatus: keyof typeof verificationStatusToDomain;
    createdAt: Date;
    updatedAt: Date;
  }): PropertyOwner {
    return PropertyOwner.restore(row.id, {
      userId: row.userId,
      verificationStatus: verificationStatusToDomain[row.verificationStatus],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
