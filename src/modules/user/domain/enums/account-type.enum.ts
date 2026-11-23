export enum AccountType {
  STUDENT_SEEKER = 'STUDENT_SEEKER',
  STUDENT_OFFERER = 'STUDENT_OFFERER',
  PROPERTY_OWNER = 'PROPERTY_OWNER',
  ADMINISTRATOR = 'ADMINISTRATOR',
  OTHER = 'OTHER',
}

export interface AccountProfilePresence {
  student: boolean;
  propertyOwner: boolean;
  administrator: boolean;
}

export function resolveAccountType(profiles: AccountProfilePresence): AccountType {
  if (profiles.administrator) return AccountType.ADMINISTRATOR;
  if (profiles.student && profiles.propertyOwner) return AccountType.STUDENT_OFFERER;
  if (profiles.student) return AccountType.STUDENT_SEEKER;
  if (profiles.propertyOwner) return AccountType.PROPERTY_OWNER;
  return AccountType.OTHER;
}
