import type { UserProfileDetailsInput } from '../../../domain/entities/user-profile-details.entity.js';
export interface RegisterPropertyOwnerInput {
  name: string;
  email: string;
  cpf: string;
  password: string;
  phone?: string | null;
  // Dados pessoais e preferências de moradia (todos opcionais).
  profileDetails?: UserProfileDetailsInput;
}
