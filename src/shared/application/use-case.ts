// Contrato comum dos casos de uso. Não depende do Nest: quem registra cada
// caso de uso (e injeta suas dependências) é o *.module.ts do contexto.
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>;
}
