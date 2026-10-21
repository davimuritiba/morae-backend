// Base dos erros de regra de negócio. Não conhece HTTP: a camada de
// apresentação traduz o `code` para o status adequado.
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
