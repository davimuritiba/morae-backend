// Hash de senha. A implementação concreta (argon2, bcrypt) fica na infra.
export abstract class Hasher {
  abstract hash(plain: string): Promise<string>;
  abstract compare(plain: string, hash: string): Promise<boolean>;
}
