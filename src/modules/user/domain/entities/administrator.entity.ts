import { randomUUID } from 'node:crypto';
import { Permission } from '../enums/permission.enum.js';

export interface AdministratorProps {
  userId: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAdministratorProps {
  userId: string;
  permissions?: Permission[];
}

export class Administrator {
  private constructor(
    private readonly _id: string,
    private readonly props: AdministratorProps,
  ) {}

  static create(input: CreateAdministratorProps): Administrator {
    const now = new Date();

    return new Administrator(randomUUID(), {
      userId: input.userId,
      permissions: [...new Set(input.permissions ?? [])],
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(id: string, props: AdministratorProps): Administrator {
    return new Administrator(id, {
      ...props,
      permissions: [...props.permissions],
    });
  }

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this.props.userId;
  }

  // Cópia, para que a lista só mude via grant/revoke.
  get permissions(): Permission[] {
    return [...this.props.permissions];
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  hasPermission(permission: Permission): boolean {
    return this.props.permissions.includes(permission);
  }

  grantPermission(permission: Permission): void {
    if (this.hasPermission(permission)) return;
    this.props.permissions.push(permission);
    this.touch();
  }

  revokePermission(permission: Permission): void {
    if (!this.hasPermission(permission)) return;
    this.props.permissions = this.props.permissions.filter(
      (p) => p !== permission,
    );
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
