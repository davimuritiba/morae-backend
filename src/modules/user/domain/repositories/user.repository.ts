import type { User } from '../entities/user.entity.js';
import type { AccountStatus } from '../enums/account-status.enum.js';
import type { AccountType } from '../enums/account-type.enum.js';
import type { Cpf } from '../value-objects/cpf.vo.js';
import type { Email } from '../value-objects/email.vo.js';

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  emailVerified: boolean;
  status: AccountStatus;
  createdAt: Date;
  student: {
    course: string;
    period: number;
    verificationStatus: string;
  } | null;
  propertyOwner: {
    verificationStatus: string;
  } | null;
}

export interface AdminUserQuery {
  search?: string;
  status?: AccountStatus;
  page: number;
  limit: number;
}

export interface AdminUserPage {
  items: AdminUserRecord[];
  total: number;
  page: number;
  limit: number;
}

export abstract class UserRepository {
  abstract findAll(): Promise<User[]>;
  abstract findAdminPage(query: AdminUserQuery): Promise<AdminUserPage>;
  abstract findAdminById(id: string): Promise<AdminUserRecord | null>;
  abstract findById(id: string): Promise<User | null>;
  abstract findAccountStatusById(userId: string): Promise<AccountStatus | null>;
  abstract findByEmail(email: Email): Promise<User | null>;
  abstract findIdByEmail(email: Email): Promise<string | null>;
  abstract findAccountType(userId: string): Promise<AccountType>;
  // Separados para o caso de uso saber qual erro lançar.
  abstract existsByEmail(email: Email): Promise<boolean>;
  abstract existsByCpf(cpf: Cpf): Promise<boolean>;
  // As checagens existsBy* não bastam: duas requisições simultâneas passam
  // por elas juntas. A implementação deve ter e-mail e CPF únicos no banco
  // (constraint UNIQUE) e converter a violação em EmailAlreadyInUseError ou
  // CpfAlreadyInUseError.
  abstract save(user: User): Promise<void>;
}
