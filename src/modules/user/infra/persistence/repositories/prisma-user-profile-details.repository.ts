import { Injectable } from '@nestjs/common';
import type { UserProfileDetails as PrismaUserProfileDetails } from '../../../../../shared/infra/database/generated/prisma/client.js';
import { PrismaTransactionContext } from '../../../../../shared/infra/database/prisma-transaction-context.js';
import { isUuid } from '../../../../../shared/infra/database/uuid.js';
import {
  UserProfileDetails,
  type UserProfileDetailsData,
} from '../../../domain/entities/user-profile-details.entity.js';
import type {
  CampusDistance,
  DesiredRoommates,
  Gender,
  PreferredHousingType,
  RoommateGender,
} from '../../../domain/enums/profile-details.enum.js';
import { UserProfileDetailsRepository } from '../../../domain/repositories/user-profile-details.repository.js';

@Injectable()
export class PrismaUserProfileDetailsRepository extends UserProfileDetailsRepository {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async findByUserId(userId: string): Promise<UserProfileDetails | null> {
    if (!isUuid(userId)) return null;
    const row = await this.db.client.userProfileDetails.findUnique({ where: { userId } });
    return row ? toDomain(row) : null;
  }

  async save(details: UserProfileDetails): Promise<void> {
    const data = { ...details.data, updatedAt: details.updatedAt };
    await this.db.client.userProfileDetails.upsert({
      where: { userId: details.userId },
      create: { userId: details.userId, ...data },
      update: data,
    });
  }
}

export function profileDetailsToDomain(row: PrismaUserProfileDetails): UserProfileDetails {
  return toDomain(row);
}

function toDomain(row: PrismaUserProfileDetails): UserProfileDetails {
  const data: UserProfileDetailsData = {
    bio: row.bio,
    birthDate: row.birthDate,
    gender: row.gender as Gender | null,
    country: row.country,
    state: row.state,
    city: row.city,
    neighborhood: row.neighborhood,
    postalCode: row.postalCode,
    address: row.address,
    university: row.university,
    campus: row.campus,
    housingType: row.housingType as PreferredHousingType | null,
    maxBudget: row.maxBudget === null ? null : Number(row.maxBudget),
    campusDistance: row.campusDistance as CampusDistance | null,
    preferredNeighborhoods: row.preferredNeighborhoods,
    desiredRoommates: row.desiredRoommates as DesiredRoommates | null,
    roommateGender: row.roommateGender as RoommateGender | null,
  };
  return UserProfileDetails.restore(row.userId, data, row.updatedAt);
}
