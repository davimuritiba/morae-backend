import type { RegistrationFieldAvailability } from '../registration-field-availability.js';

export interface CheckRegistrationAvailabilityOutput {
  cpf?: RegistrationFieldAvailability;
  email?: RegistrationFieldAvailability;
  enrollmentNumber?: RegistrationFieldAvailability;
}
