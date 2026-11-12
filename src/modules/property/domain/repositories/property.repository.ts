import type { Property } from '../entities/property.entity.js';

export abstract class PropertyRepository {
  abstract findById(id: string): Promise<Property | null>;
  abstract save(property: Property): Promise<void>;
}
