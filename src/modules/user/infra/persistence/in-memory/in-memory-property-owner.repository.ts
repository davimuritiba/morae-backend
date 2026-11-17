import type { PropertyOwner } from '../../../domain/entities/property-owner.entity.js';
import { PropertyOwnerRepository } from '../../../domain/repositories/property-owner.repository.js';

export class InMemoryPropertyOwnerRepository extends PropertyOwnerRepository {
  readonly items: PropertyOwner[] = [];

  findById(id: string): Promise<PropertyOwner | null> {
    return Promise.resolve(this.items.find((owner) => owner.id === id) ?? null);
  }

  findByUserId(userId: string): Promise<PropertyOwner | null> {
    return Promise.resolve(
      this.items.find((owner) => owner.userId === userId) ?? null,
    );
  }

  save(propertyOwner: PropertyOwner): Promise<void> {
    const index = this.items.findIndex((owner) => owner.id === propertyOwner.id);
    if (index >= 0) this.items[index] = propertyOwner;
    else this.items.push(propertyOwner);
    return Promise.resolve();
  }
}
