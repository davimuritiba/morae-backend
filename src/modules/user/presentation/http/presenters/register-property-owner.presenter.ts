import type { RegisterPropertyOwnerOutput } from '../../../application/use-cases/register-property-owner/register-property-owner.output.js';

export interface RegisterPropertyOwnerResponse {
  userId: string;
  propertyOwnerId: string;
}

export class RegisterPropertyOwnerPresenter {
  static toHttp(
    output: RegisterPropertyOwnerOutput,
  ): RegisterPropertyOwnerResponse {
    return { userId: output.userId, propertyOwnerId: output.propertyOwnerId };
  }
}
