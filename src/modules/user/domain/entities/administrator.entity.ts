import { randomUUID } from 'node:crypto';
import { Permission } from '../enums/permission.enum.js';

export interface AdministratorProps {
  userId: string;
  login: string;
  passwordHash: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAdministratorProps {
  userId: string;
  login: string;
  passwordHash: string;
  permissions?: Permission[];
}

export class Administrator {
  readonly #id: string;
  readonly #props: AdministratorProps;

  private constructor(id: string, props: AdministratorProps) {
    this.#id = id;
    this.#props = props;
  }

  static create(input: CreateAdministratorProps): Administrator {
    const now = new Date();

    return new Administrator(randomUUID(), {
      userId: input.userId,
      login: Administrator.normalizeLogin(input.login),
      passwordHash: input.passwordHash,
      permissions: [...new Set(input.permissions ?? [])],
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(id: string, props: AdministratorProps): Administrator {
    return new Administrator(id, {
      ...props,
      login: Administrator.normalizeLogin(props.login),
      permissions: [...props.permissions],
    });
  }

  get id(): string {
    return this.#id;
  }

  get userId(): string {
    return this.#props.userId;
  }

  get login(): string {
    return this.#props.login;
  }

  get passwordHash(): string {
    return this.#props.passwordHash;
  }

  // Cópia, para que a lista só mude via grant/revoke.
  get permissions(): Permission[] {
    return [...this.#props.permissions];
  }

  get createdAt(): Date {
    return this.#props.createdAt;
  }

  get updatedAt(): Date {
    return this.#props.updatedAt;
  }

  hasPermission(permission: Permission): boolean {
    return this.#props.permissions.includes(permission);
  }

  grantPermission(permission: Permission): void {
    if (this.hasPermission(permission)) return;
    this.#props.permissions.push(permission);
    this.touch();
  }

  revokePermission(permission: Permission): void {
    if (!this.hasPermission(permission)) return;
    this.#props.permissions = this.#props.permissions.filter(
      (p) => p !== permission,
    );
    this.touch();
  }

  private touch(): void {
    this.#props.updatedAt = new Date();
  }

  private static normalizeLogin(login: string): string {
    const normalized = login.trim().toLowerCase();
    if (normalized.length === 0 || normalized.length > 100) {
      throw new Error('Login do administrador invalido.');
    }
    return normalized;
  }
}
