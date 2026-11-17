import type {
  Administrator as PrismaAdministrator,
  Permission as PrismaPermission,
} from '../../../../../shared/infra/database/generated/prisma/client.js';
import { Administrator } from '../../../domain/entities/administrator.entity.js';
import { Permission } from '../../../domain/enums/permission.enum.js';

const permissionToPrisma: Record<Permission, PrismaPermission> = {
  [Permission.VERIFY_DOCUMENTS]: 'VERIFY_DOCUMENTS',
  [Permission.MODERATE_LISTINGS]: 'MODERATE_LISTINGS',
  [Permission.MANAGE_USERS]: 'MANAGE_USERS',
  [Permission.VIEW_REPORTS]: 'VIEW_REPORTS',
};

const permissionToDomain: Record<PrismaPermission, Permission> = {
  VERIFY_DOCUMENTS: Permission.VERIFY_DOCUMENTS,
  MODERATE_LISTINGS: Permission.MODERATE_LISTINGS,
  MANAGE_USERS: Permission.MANAGE_USERS,
  VIEW_REPORTS: Permission.VIEW_REPORTS,
};

export class AdministratorMapper {
  static toDomain(raw: PrismaAdministrator): Administrator {
    return Administrator.restore(raw.id, {
      userId: raw.userId,
      login: raw.login,
      passwordHash: raw.passwordHash,
      permissions: raw.permissions.map(
        (permission) => permissionToDomain[permission],
      ),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(
    administrator: Administrator,
  ): PrismaAdministrator {
    return {
      id: administrator.id,
      userId: administrator.userId,
      login: administrator.login,
      passwordHash: administrator.passwordHash,
      permissions: administrator.permissions.map(
        (permission) => permissionToPrisma[permission],
      ),
      createdAt: administrator.createdAt,
      updatedAt: administrator.updatedAt,
    };
  }
}
