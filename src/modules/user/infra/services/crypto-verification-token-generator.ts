import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  VerificationTokenGenerator,
  type GeneratedVerificationToken,
} from '../../application/ports/verification-token-generator.port.js';

// 32 bytes aleatórios (256 bits): impossível de adivinhar por tentativa.
const TOKEN_BYTES = 32;

@Injectable()
export class CryptoVerificationTokenGenerator extends VerificationTokenGenerator {
  // base64url: cabe no link sem precisar de escape.
  generate(): GeneratedVerificationToken {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    return { token, tokenHash: this.hash(token) };
  }

  // SHA-256 e não Argon2: o token já é aleatório e longo, então um hash
  // rápido e determinístico basta e permite a busca direta no banco. O
  // resultado tem 64 caracteres hex, o tamanho da coluna token_hash.
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
