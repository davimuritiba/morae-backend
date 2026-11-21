export interface RegisterPropertyOwnerInput {
  name: string;
  email: string;
  cpf: string;
  password: string;
  phone?: string | null;
}
