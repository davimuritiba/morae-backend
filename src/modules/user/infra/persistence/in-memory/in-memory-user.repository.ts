import type { User } from '../../../domain/entities/user.entity.js';
import { CpfAlreadyInUseError } from '../../../domain/errors/cpf-already-in-use.error.js';
import { EmailAlreadyInUseError } from '../../../domain/errors/email-already-in-use.error.js';
import { UserRepository } from '../../../domain/repositories/user.repository.js';
import type { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import type { Email } from '../../../domain/value-objects/email.vo.js';

export class InMemoryUserRepository extends UserRepository {
  // Público para os testes inspecionarem o que foi salvo.
  readonly items: User[] = [];

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.items.find((u) => u.id === id) ?? null);
  }

  findByEmail(email: Email): Promise<User | null> {
    return Promise.resolve(
      this.items.find((u) => u.email.equals(email)) ?? null,
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
}
