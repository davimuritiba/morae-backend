export enum AccountType {
  STUDENT_SEEKER = 'STUDENT_SEEKER',
  STUDENT_OFFERER = 'STUDENT_OFFERER',
  PROPERTY_OWNER = 'PROPERTY_OWNER',
  ADMINISTRATOR = 'ADMINISTRATOR',
  OTHER = 'OTHER',
}

export const STUDENT_ACCOUNT_TYPES: readonly AccountType[] = [
  AccountType.STUDENT_SEEKER,
  AccountType.STUDENT_OFFERER,
];

export const PROPERTY_OWNER_ACCOUNT_TYPES: readonly AccountType[] = [
  AccountType.PROPERTY_OWNER,
  AccountType.STUDENT_OFFERER,
];

// Quem usa o chat: estudantes e proprietários. O estudante abre a conversa
// pelo anúncio e ela é com o dono dele, então o proprietário precisa ler e
// responder. Administradores e contas sem perfil ficam de fora.
export const CHAT_ACCOUNT_TYPES: readonly AccountType[] = [
  AccountType.STUDENT_SEEKER,
  AccountType.STUDENT_OFFERER,
  AccountType.PROPERTY_OWNER,
];

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
