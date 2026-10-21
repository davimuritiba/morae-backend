import type { PropertyOwner } from '../entities/property-owner.entity.js';

export abstract class PropertyOwnerRepository {
  abstract findById(id: string): Promise<PropertyOwner | null>;
  abstract findByUserId(userId: string): Promise<PropertyOwner | null>;
  abstract save(propertyOwner: PropertyOwner): Promise<void>;
}
