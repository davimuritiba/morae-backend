import type { User } from '../../../domain/entities/user.entity.js';
import { AccountType } from '../../../domain/enums/account-type.enum.js';
import type { AccountType as AccountTypeValue } from '../../../domain/enums/account-type.enum.js';
import { CpfAlreadyInUseError } from '../../../domain/errors/cpf-already-in-use.error.js';
import { EmailAlreadyInUseError } from '../../../domain/errors/email-already-in-use.error.js';
import {
  UserRepository,
  type AdminUserPage,
  type AdminUserQuery,
  type AdminUserRecord,
} from '../../../domain/repositories/user.repository.js';
import type { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import type { Email } from '../../../domain/value-objects/email.vo.js';

export class InMemoryUserRepository extends UserRepository {
  // Público para os testes inspecionarem o que foi salvo.
  readonly items: User[] = [];
  readonly accountTypes = new Map<string, AccountTypeValue>();

  findAll(): Promise<User[]> {
    return Promise.resolve([...this.items]);
  }

  findAdminPage(query: AdminUserQuery): Promise<AdminUserPage> {
    const search = query.search?.trim().toLocaleLowerCase('pt-BR') ?? '';
    const matchingUsers = this.items
      .filter((user) => !query.status || user.status === query.status)
      .filter((user) => (
        !search ||
        `${user.name} ${user.email.value}`.toLocaleLowerCase('pt-BR').includes(search)
      ))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    const offset = (query.page - 1) * query.limit;

    return Promise.resolve({
      items: matchingUsers
        .slice(offset, offset + query.limit)
        .map((user) => this.toAdminRecord(user)),
      total: matchingUsers.length,
      page: query.page,
      limit: query.limit,
    });
  }

  findAdminById(id: string): Promise<AdminUserRecord | null> {
    const user = this.items.find((item) => item.id === id);
    return Promise.resolve(user ? this.toAdminRecord(user) : null);
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.items.find((u) => u.id === id) ?? null);
  }

  findByEmail(email: Email): Promise<User | null> {
    return Promise.resolve(
      this.items.find((u) => u.email.equals(email)) ?? null,
    );
  }

  findAccountType(userId: string): Promise<AccountTypeValue> {
    return Promise.resolve(
      this.accountTypes.get(userId) ?? AccountType.STUDENT_SEEKER,
    );
  }

  existsByEmail(email: Email): Promise<boolean> {
    return Promise.resolve(this.items.some((u) => u.email.equals(email)));
  }

  existsByCpf(cpf: Cpf): Promise<boolean> {
    return Promise.resolve(this.items.some((u) => u.cpf.equals(cpf)));
  }

  // Simula as constraints UNIQUE de e-mail e CPF do banco.
  save(user: User): Promise<void> {
    const others = this.items.filter((u) => u.id !== user.id);

    if (others.some((u) => u.email.equals(user.email))) {
      return Promise.reject(new EmailAlreadyInUseError());
    }
    if (others.some((u) => u.cpf.equals(user.cpf))) {
      return Promise.reject(new CpfAlreadyInUseError());
    }

    const index = this.items.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      this.items[index] = user;
    } else {
      this.items.push(user);
    }
    return Promise.resolve();
  }

  private toAdminRecord(user: User): AdminUserRecord {
    return {
      id: user.id,
      name: user.name,
      email: user.email.value,
      phone: user.phone?.value ?? null,
      photoUrl: user.photoUrl?.value ?? null,
      emailVerified: user.emailVerified,
      status: user.status,
      createdAt: user.createdAt,
      student: null,
      propertyOwner: null,
    };
  }
}
