import { Hasher } from '../../application/ports/hasher.port.js';

// Hash previsível para os testes: "hashed:<senha>".
export class FakeHasher extends Hasher {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hashed:${plain}`);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${plain}`);
  }
}
