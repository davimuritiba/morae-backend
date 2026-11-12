export interface GeneratedVerificationToken {
  // Vai no link do e-mail e nunca é gravado.
  token: string;
  // É o que fica no banco.
  tokenHash: string;
}

// Gera tokens aleatórios e calcula o hash deles. O hash precisa ser
// determinístico: ao confirmar, o token do link é transformado no mesmo hash
// para ser encontrado no banco.
export abstract class VerificationTokenGenerator {
  abstract generate(): GeneratedVerificationToken;
  abstract hash(token: string): string;
}
