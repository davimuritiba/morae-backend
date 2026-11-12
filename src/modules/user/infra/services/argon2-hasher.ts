import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Hasher } from '../../application/ports/hasher.port.js';

// Parâmetros mínimos do OWASP (Password Storage Cheat Sheet) para Argon2id:
// 19 MiB de memória, 2 iterações, 1 grau de paralelismo. Ficam gravados no
// próprio hash ($argon2id$v=19$m=19456,t=2,p=1$...), então aumentá-los no
// futuro não invalida os hashes já salvos.
export const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024, // KiB
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class Argon2Hasher extends Hasher {
  // O salt é gerado pela biblioteca a cada chamada e vai dentro do hash.
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON2_OPTIONS);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    // Hash de outro formato nunca confere. Sem esta checagem, a biblioteca
    // lançaria erro e o login responderia 500 em vez de "senha incorreta".
    if (!hash.startsWith('$argon2')) {
      return Promise.resolve(false);
    }
    return argon2.verify(hash, plain);
  }
}
