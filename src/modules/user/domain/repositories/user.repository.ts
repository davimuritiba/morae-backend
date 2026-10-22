import type { User } from '../entities/user.entity.js';
import type { Cpf } from '../value-objects/cpf.vo.js';
import type { Email } from '../value-objects/email.vo.js';

export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: Email): Promise<User | null>;
  // Separados para o caso de uso saber qual erro lançar.
  abstract existsByEmail(email: Email): Promise<boolean>;
  abstract existsByCpf(cpf: Cpf): Promise<boolean>;
  // As checagens existsBy* não bastam: duas requisições simultâneas passam
  // por elas juntas. A implementação deve ter e-mail e CPF únicos no banco
  // (constraint UNIQUE) e converter a violação em EmailAlreadyInUseError ou
  // CpfAlreadyInUseError.
  abstract save(user: User): Promise<void>;
}
