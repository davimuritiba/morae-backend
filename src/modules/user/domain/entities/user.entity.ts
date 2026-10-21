import { randomUUID } from 'node:crypto';
import { AccountStatus } from '../enums/account-status.enum.js';
import { InvalidAccountStatusTransitionError } from '../errors/invalid-account-status-transition.error.js';
import type { Cpf } from '../value-objects/cpf.vo.js';
import type { Email } from '../value-objects/email.vo.js';

export interface UserProps {
  name: string;
  email: Email;
  cpf: Cpf;
  passwordHash: string;
  phone: string | null;
  photoUrl: string | null;
  emailVerified: boolean;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProps {
  name: string;
  email: Email;
  cpf: Cpf;
  passwordHash: string;
  phone?: string | null;
  photoUrl?: string | null;
}

export class User {
  private constructor(
    private readonly _id: string,
    private readonly props: UserProps,
  ) {}

  // Novo usuário: gera id e aplica os valores iniciais.
  static create(input: CreateUserProps): User {
    const now = new Date();

    return new User(randomUUID(), {
      name: input.name,
      email: input.email,
      cpf: input.cpf,
      passwordHash: input.passwordHash,
      phone: input.phone ?? null,
      photoUrl: input.photoUrl ?? null,
      emailVerified: false,
      status: AccountStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Usuário já existente (ex.: vindo do banco): reconstrói sem alterar nada.
  static restore(id: string, props: UserProps): User {
    return new User(id, { ...props });
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): Email {
    return this.props.email;
  }

  get cpf(): Cpf {
    return this.props.cpf;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get photoUrl(): string | null {
    return this.props.photoUrl;
  }

  get emailVerified(): boolean {
    return this.props.emailVerified;
  }

  get status(): AccountStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  verifyEmail(): void {
    if (this.props.emailVerified) return;
    this.props.emailVerified = true;
    this.touch();
  }

  suspend(): void {
    this.changeStatus([AccountStatus.ACTIVE], AccountStatus.SUSPENDED);
  }

  reactivate(): void {
    this.changeStatus([AccountStatus.SUSPENDED], AccountStatus.ACTIVE);
  }

  // Desativação é definitiva: não há transição de volta para ACTIVE.
  deactivate(): void {
    this.changeStatus(
      [AccountStatus.ACTIVE, AccountStatus.SUSPENDED],
      AccountStatus.DEACTIVATED,
    );
  }

  private changeStatus(
    allowedFrom: AccountStatus[],
    next: AccountStatus,
  ): void {
    if (!allowedFrom.includes(this.props.status)) {
      throw new InvalidAccountStatusTransitionError(this.props.status, next);
    }
    this.props.status = next;
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
