
export class RegisterStudentDto {
  name: string;

  email: string;

  cpf: string;

  password: string;

  phone?: string | null;

  enrollmentNumber: string;

  course: string;

  period: number;

  expectedGraduation: string;
}
