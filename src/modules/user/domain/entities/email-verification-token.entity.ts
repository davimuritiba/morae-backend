import { randomUUID } from 'node:crypto';
import { InvalidEmailVerificationTokenError } from '../errors/invalid-email-verification-token.error.js';

export interface EmailVerificationTokenProps {
  userId: string;
  // Só o hash do token é guardado. O token em si existe apenas no link
  // enviado por e-mail, então um vazamento do banco não permite usá-lo.
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CreateEmailVerificationTokenProps {
  userId: string;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
}

// Token de uso único que confirma que o usuário controla o e-mail. As regras
// que dependem do horário recebem `now` de fora, para serem testáveis sem
// depender do relógio real.
export class EmailVerificationToken {
  readonly #id: string;
  readonly #props: EmailVerificationTokenProps;

  private constructor(id: string, props: EmailVerificationTokenProps) {
    this.#id = id;
    this.#props = props;
  }

  // Os dados vêm da camada de aplicação, não do usuário: um valor inválido
  // aqui é erro de programação, por isso Error comum e não erro de domínio.
  static create(
    input: CreateEmailVerificationTokenProps,
  ): EmailVerificationToken {
    if (input.userId.length === 0 || input.tokenHash.length === 0) {
      throw new Error('userId e tokenHash são obrigatórios.');
    }
    if (!isValidDate(input.issuedAt) || !isValidDate(input.expiresAt)) {
      throw new Error('issuedAt e expiresAt precisam ser datas válidas.');
    }
    if (input.expiresAt.getTime() <= input.issuedAt.getTime()) {
      throw new Error('expiresAt precisa ser posterior a issuedAt.');
    }

    return new EmailVerificationToken(randomUUID(), {
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: new Date(input.expiresAt.getTime()),
      usedAt: null,
      createdAt: new Date(input.issuedAt.getTime()),
    });
  }

  static restore(
    id: string,
    props: EmailVerificationTokenProps,
  ): EmailVerificationToken {
    return new EmailVerificationToken(id, {
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

  get isUsed(): boolean {
    return this.#props.usedAt !== null;
  }

  // Expira no exato instante de expiresAt.
  isExpired(now: Date): boolean {
    return now.getTime() >= this.#props.expiresAt.getTime();
  }

  isActive(now: Date): boolean {
    return !this.isUsed && !this.isExpired(now);
  }

  // Consome o token. Só funciona uma vez e antes de expirar.
  use(now: Date): void {
    if (!this.isActive(now)) {
      throw new InvalidEmailVerificationTokenError();
    }
    this.#props.usedAt = new Date(now.getTime());
  }
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
