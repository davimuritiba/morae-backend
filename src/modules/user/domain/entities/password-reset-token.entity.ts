import { randomUUID } from 'node:crypto';
import { InvalidPasswordResetTokenError } from '../errors/invalid-password-reset-token.error.js';

export interface PasswordResetTokenProps {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CreatePasswordResetTokenProps {
  userId: string;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
}

export class PasswordResetToken {
  readonly #id: string;
  readonly #props: PasswordResetTokenProps;

  private constructor(id: string, props: PasswordResetTokenProps) {
    this.#id = id;
    this.#props = props;
  }

  static create(input: CreatePasswordResetTokenProps): PasswordResetToken {
    if (input.userId.length === 0 || input.tokenHash.length === 0) {
      throw new Error('userId e tokenHash são obrigatórios.');
    }
    if (!isValidDate(input.issuedAt) || !isValidDate(input.expiresAt)) {
      throw new Error('issuedAt e expiresAt precisam ser datas válidas.');
    }
    if (input.expiresAt.getTime() <= input.issuedAt.getTime()) {
      throw new Error('expiresAt precisa ser posterior a issuedAt.');
    }

    return new PasswordResetToken(randomUUID(), {
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: new Date(input.expiresAt.getTime()),
      usedAt: null,
      createdAt: new Date(input.issuedAt.getTime()),
    });
  }

  static restore(
    id: string,
    props: PasswordResetTokenProps,
  ): PasswordResetToken {
    return new PasswordResetToken(id, {
      ...props,
      expiresAt: new Date(props.expiresAt.getTime()),
      usedAt: props.usedAt ? new Date(props.usedAt.getTime()) : null,
      createdAt: new Date(props.createdAt.getTime()),
    });
  }

  get id(): string {
    return this.#id;
  }

  get userId(): string {
    return this.#props.userId;
  }

  get tokenHash(): string {
    return this.#props.tokenHash;
  }

  get expiresAt(): Date {
    return this.#props.expiresAt;
  }

  get usedAt(): Date | null {
    return this.#props.usedAt;
  }

  get createdAt(): Date {
    return this.#props.createdAt;
  }

  isActive(now: Date): boolean {
    return (
      this.#props.usedAt === null &&
      now.getTime() < this.#props.expiresAt.getTime()
    );
  }

  use(now: Date): void {
    if (!this.isActive(now)) {
      throw new InvalidPasswordResetTokenError();
    }
    this.#props.usedAt = new Date(now.getTime());
  }
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
