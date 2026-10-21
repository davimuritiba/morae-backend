import type { User } from '../entities/user.entity.js';
import type { Cpf } from '../value-objects/cpf.vo.js';
import type { Email } from '../value-objects/email.vo.js';

export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: Email): Promise<User | null>;
  abstract existsByEmailOrCpf(email: Email, cpf: Cpf): Promise<boolean>;
  abstract save(user: User): Promise<void>;
}
