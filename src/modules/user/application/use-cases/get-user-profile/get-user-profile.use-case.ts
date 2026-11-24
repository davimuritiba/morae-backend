import { AccountType } from '../../../domain/enums/account-type.enum.js';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error.js';
import type { StudentRepository } from '../../../domain/repositories/student.repository.js';
import type { UserProfileDetailsRepository } from '../../../domain/repositories/user-profile-details.repository.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import type { HousingPreferencesView, UserProfileView } from './get-user-profile.output.js';

export interface GetUserProfileInput {
  viewerId: string;
  targetUserId: string;
}

// Perfil completo de um usuário. Quem vê o próprio perfil recebe também os
// dados privados (e-mail, telefone, nascimento, endereço); os demais veem só a
// idade, a cidade e as preferências.
export class GetUserProfileUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly students: StudentRepository,
    private readonly profileDetails: UserProfileDetailsRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: GetUserProfileInput): Promise<UserProfileView> {
    const user = await this.users.findById(input.targetUserId);
    if (!user || user.status === AccountStatus.DEACTIVATED) throw new UserNotFoundError();

    const [accountType, student, details] = await Promise.all([
      this.users.findAccountType(user.id),
      this.students.findByUserId(user.id),
      this.profileDetails.findByUserId(user.id),
    ]);
    const data = details?.data ?? null;
    const isSelf = input.viewerId === user.id;
    const isStudent =
      accountType === AccountType.STUDENT_SEEKER || accountType === AccountType.STUDENT_OFFERER;

    const housingPreferences: HousingPreferencesView | null =
      data && isStudent
        ? {
            housingType: data.housingType,
            maxBudget: data.maxBudget,
            campusDistance: data.campusDistance,
            preferredNeighborhoods: data.preferredNeighborhoods,
            desiredRoommates: data.desiredRoommates,
            roommateGender: data.roommateGender,
          }
        : null;

    const answers = student?.compatibilityAnswers;
    return {
      userId: user.id,
      name: user.name,
      photoUrl: user.photoUrl?.value ?? null,
      accountType,
      age: details?.ageAt(this.now()) ?? null,
      // Contas do seed têm a apresentação só no perfil de estudante antigo.
      bio: data?.bio ?? student?.profile?.bio ?? null,
      city: data?.city ?? null,
      state: data?.state ?? null,
      country: data?.country ?? null,
      student: student
        ? {
            course: student.course,
            period: student.period.value,
            university: data?.university ?? null,
            campus: data?.campus ?? null,
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
                  lifestyle: [...answers.lifestyle],
                }
              : null,
          }
        : null,
      housingPreferences,
      private: isSelf
        ? {
            email: user.email.value,
            phone: user.phone?.value ?? null,
            birthDate: data?.birthDate ? data.birthDate.toISOString().slice(0, 10) : null,
            gender: data?.gender ?? null,
            neighborhood: data?.neighborhood ?? null,
            postalCode: data?.postalCode ?? null,
            address: data?.address ?? null,
          }
        : null,
    };
  }
}
