export interface UpdateUserProfileInput {
  userId: string;
  name?: string;
  email?: string;
  cpf?: string;
  phone?: string | null;
}
