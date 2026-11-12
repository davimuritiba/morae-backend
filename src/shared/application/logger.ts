// Registro de falhas que não devem interromper o fluxo do caso de uso (ex.:
// o e-mail de verificação que não saiu depois de um cadastro já gravado).
export abstract class Logger {
  abstract error(message: string, error?: unknown): void;
}
