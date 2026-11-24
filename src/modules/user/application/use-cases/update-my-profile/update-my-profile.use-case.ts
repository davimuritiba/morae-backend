import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import {
  StudentCompatibilityAnswers,
  type StudentCompatibilityAnswersInput,
} from '../../../domain/entities/student-compatibility-answers.entity.js';
import {
  UserProfileDetails,
  type UserProfileDetailsInput,
} from '../../../domain/entities/user-profile-details.entity.js';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import { EmptyUserProfileUpdateError } from '../../../domain/errors/empty-user-profile-update.error.js';
import { InvalidProfileDetailsError } from '../../../domain/errors/invalid-profile-details.error.js';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error.js';
import type { StudentRepository } from '../../../domain/repositories/student.repository.js';
import type { UserProfileDetailsRepository } from '../../../domain/repositories/user-profile-details.repository.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import { AcademicPeriod } from '../../../domain/value-objects/academic-period.vo.js';
import type { GetUserProfileUseCase } from '../get-user-profile/get-user-profile.use-case.js';
import type { UserProfileView } from '../get-user-profile/get-user-profile.output.js';

export interface UpdateMyProfileInput {
  userId: string;
  details?: UserProfileDetailsInput;
  // Só para estudantes.
  course?: string;
  period?: number;
  compatibilityAnswers?: StudentCompatibilityAnswersInput;
}

// Edição do próprio perfil: dados pessoais, preferências de moradia e, para
// estudantes, curso, período e respostas de convivência. Nome, e-mail, CPF e
// telefone continuam em PATCH /users/me.
export class UpdateMyProfileUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly students: StudentRepository,
    private readonly profileDetails: UserProfileDetailsRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly getUserProfile: Pick<GetUserProfileUseCase, 'execute'>,
  ) {}

  async execute(input: UpdateMyProfileInput): Promise<UserProfileView> {
    const hasDetails = input.details !== undefined && Object.keys(input.details).length > 0;
    const touchesStudent =
      input.course !== undefined || input.period !== undefined || input.compatibilityAnswers !== undefined;
    if (!hasDetails && !touchesStudent) throw new EmptyUserProfileUpdateError();

    const user = await this.users.findById(input.userId);
    if (!user || user.status === AccountStatus.DEACTIVATED) throw new UserNotFoundError();

    const current = await this.profileDetails.findByUserId(user.id);
    const details = hasDetails
      ? current
        ? current.withChanges(input.details!)
        : UserProfileDetails.create(user.id, input.details!)
      : null;

    const student = touchesStudent ? await this.students.findByUserId(user.id) : null;
    if (touchesStudent && !student) {
      throw new InvalidProfileDetailsError(
        'Curso, período e questionário de convivência só existem em perfis de estudante.',
      );
    }
    if (student && (input.course !== undefined || input.period !== undefined)) {
      student.updateAcademicInfo({
        course: input.course ?? student.course,
        period: input.period === undefined ? student.period : AcademicPeriod.create(input.period),
        expectedGraduation: student.expectedGraduation,
      });
    }
    if (student && input.compatibilityAnswers) {
      student.defineCompatibilityAnswers(StudentCompatibilityAnswers.create(input.compatibilityAnswers));
    }

    await this.unitOfWork.run(async () => {
      if (details) await this.profileDetails.save(details);
      if (student) await this.students.save(student);
    });

    return this.getUserProfile.execute({ viewerId: user.id, targetUserId: user.id });
  }
}
