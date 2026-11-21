import type { RegisterStudentOutput } from '../../../application/use-cases/register-student/register-student.output.js';

export interface RegisterStudentResponse {
  userId: string;
  studentId: string;
}

// Define exatamente o que sai na resposta HTTP. Campos novos no output do
// caso de uso só aparecem para o cliente se forem adicionados aqui.
export class RegisterStudentPresenter {
  static toHttp(output: RegisterStudentOutput): RegisterStudentResponse {
    return {
      userId: output.userId,
      studentId: output.studentId,
    };
  }
}
