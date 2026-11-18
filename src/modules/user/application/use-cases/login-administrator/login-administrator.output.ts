import type { Permission } from '../../../domain/enums/permission.enum.js';

export interface LoginAdministratorOutput {
  administratorId: string;
  userId: string;
  login: string;
  permissions: Permission[];
}
