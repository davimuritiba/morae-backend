import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { StudentRepository } from '../../../domain/repositories/student.repository.js';
import { profileDetailsInput } from '../dtos/profile-details.dto.js';
import { RegisterStudentUseCase } from '../../../application/use-cases/register-student/register-student.use-case.js';
import { RegisterStudentDto } from '../dtos/register-student.dto.js';
import {
  RegisterStudentPresenter,
  type RegisterStudentResponse,
} from '../presenters/register-student.presenter.js';

@Controller('students')
export class StudentsController {
  constructor(
    private readonly registerStudent: RegisterStudentUseCase,
    private readonly students: StudentRepository,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUserId() userId: string) {
    const student = await this.students.findByUserId(userId);
    if (!student)
      throw new NotFoundException('Perfil de estudante não encontrado.');

    const answers = student.compatibilityAnswers;
    return {
      studentId: student.id,
      enrollmentNumber: student.enrollmentNumber.value,
      course: student.course,
      period: student.period.value,
      expectedGraduation: student.expectedGraduation.toISOString().slice(0, 10),
      verificationStatus: student.verificationStatus,
      compatibilityAnswers: answers
        ? {
            sleepTime: answers.sleepTime,
            studyAtHome: answers.studyAtHome,
            organization: answers.organization,
            visitors: answers.visitors,
            smoking: answers.smoking,
            pets: answers.pets,
            cleaning: answers.cleaning,
            environment: answers.environment,
            lifestyle: answers.lifestyle,
          }
        : null,
    };
  }

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
      profileDetails: profileDetailsInput(dto.profileDetails),
      enrollmentNumber: dto.enrollmentNumber,
      course: dto.course,
      period: dto.period,
      expectedGraduation: new Date(dto.expectedGraduation),
      compatibilityAnswers: dto.compatibilityAnswers,
      advertisesProperty: dto.advertisesProperty ?? false,
      profileData: dto.profileData,
    });

    return RegisterStudentPresenter.toHttp(output);
  }
}
