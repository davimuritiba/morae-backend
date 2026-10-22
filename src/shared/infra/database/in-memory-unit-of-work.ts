import { UnitOfWork } from '../../application/unit-of-work.js';

// Para testes e repositórios in-memory: só executa o trabalho, sem rollback.
export class InMemoryUnitOfWork extends UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}
