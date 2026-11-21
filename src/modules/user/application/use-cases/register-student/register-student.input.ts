// Dados crus, como chegam da camada de apresentação. A validação é feita
// pelos value objects e entidades dentro do caso de uso.
export interface RegisterStudentInput {
  name: string;
  email: string;
  cpf: string;
  password: string;
  phone?: string | null;
  enrollmentNumber: string;
  course: string;
  period: number;
  expectedGraduation: Date;
}
