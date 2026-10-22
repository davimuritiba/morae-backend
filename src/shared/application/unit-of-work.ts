// Executa `work` de forma atômica: ou todas as gravações feitas pelos
// repositórios dentro dele são confirmadas, ou nenhuma é.
export abstract class UnitOfWork {
  abstract run<T>(work: () => Promise<T>): Promise<T>;
}
