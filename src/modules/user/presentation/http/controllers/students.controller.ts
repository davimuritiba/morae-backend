import { Body, Controller, Post } from '@nestjs/common';
import { RegisterStudentUseCase } from '../../../application/use-cases/register-student/register-student.use-case.js';
import { RegisterStudentDto } from '../dtos/register-student.dto.js';
import {
  RegisterStudentPresenter,
  type RegisterStudentResponse,
} from '../presenters/register-student.presenter.js';

@Controller('students')
export class StudentsController {
  constructor(private readonly registerStudent: RegisterStudentUseCase) {}

  @Post()
  async register(
    @Body() dto: RegisterStudentDto,
  ): Promise<RegisterStudentResponse> {
    const output = await this.registerStudent.execute({
      name: dto.name,
      email: dto.email,
      cpf: dto.cpf,
      password: dto.password,
      phone: dto.phone ?? null,
      enrollmentNumber: dto.enrollmentNumber,
      course: dto.course,
      period: dto.period,
      expectedGraduation: new Date(dto.expectedGraduation),
    });

    return RegisterStudentPresenter.toHttp(output);
  }
}
