import type { Property } from '../../../domain/entities/property.entity.js';
import { PropertyRepository } from '../../../domain/repositories/property.repository.js';

export class InMemoryPropertyRepository extends PropertyRepository {
  readonly items: Property[] = [];

  findById(id: string): Promise<Property | null> {
    return Promise.resolve(this.items.find((property) => property.id === id) ?? null);
  }

  save(property: Property): Promise<void> {
    const index = this.items.findIndex((item) => item.id === property.id);
    if (index >= 0) this.items[index] = property;
    else this.items.push(property);
    return Promise.resolve();
  }
}
