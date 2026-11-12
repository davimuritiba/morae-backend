import {
  VerificationTokenGenerator,
  type GeneratedVerificationToken,
} from '../../application/ports/verification-token-generator.port.js';

// Tokens previsíveis para os testes: "token-1", "token-2"... com hash
// "hash:<token>".
export class FakeVerificationTokenGenerator extends VerificationTokenGenerator {
  #count = 0;

  generate(): GeneratedVerificationToken {
    this.#count += 1;
    const token = `token-${this.#count}`;
    return { token, tokenHash: this.hash(token) };
  }

  hash(token: string): string {
    return `hash:${token}`;
  }
}
