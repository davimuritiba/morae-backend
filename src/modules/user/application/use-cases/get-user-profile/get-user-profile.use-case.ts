import { AccountType } from '../../../domain/enums/account-type.enum.js';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import { Gender } from '../../../domain/enums/profile-details.enum.js';
import type { UserProfileData } from '../../../domain/entities/user.entity.js';
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
// dados privados (e-mail, CPF, telefone, nascimento, endereço); os demais veem
// só a idade, a cidade e as preferências.
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
    const birthDate = data?.birthDate ?? legacyBirthDate(user.profileData?.birthDate);
    const gender = data?.gender ?? legacyGender(user.profileData?.gender);
    const now = this.now();

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
      age: details?.ageAt(now) ?? (birthDate ? ageBetween(birthDate, now) : null),
      // Contas do seed têm a apresentação só no perfil de estudante antigo.
      bio: data?.bio ?? student?.profile?.bio ?? null,
      city: data?.city ?? null,
      state: data?.state ?? null,
      country: data?.country ?? null,
      student: student
        ? {
            course: student.course,
            period: student.period.value,
            university: data?.university ?? legacyText(user.profileData, 'university', 'institution'),
            campus: data?.campus ?? legacyText(user.profileData, 'campus'),
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
            cpf: user.cpf.value,
            phone: user.phone?.value ?? null,
            birthDate: birthDate?.toISOString().slice(0, 10) ?? null,
            gender,
            neighborhood: data?.neighborhood ?? null,
            postalCode: data?.postalCode ?? null,
            address: data?.address ?? null,
          }
        : null,
    };
  }
}

function legacyText(data: UserProfileData | null, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function legacyBirthDate(value: UserProfileData[string] | undefined): Date | null {
  if (typeof value !== 'string') return null;
  const datePart = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  const date = new Date(`${datePart}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === datePart
    ? date
    : null;
}

function legacyGender(value: UserProfileData[string] | undefined): Gender | null {
  if (typeof value !== 'string') return null;
  const normalized = value
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const genders: Record<string, Gender> = {
    female: Gender.FEMALE,
    feminino: Gender.FEMALE,
    male: Gender.MALE,
    masculino: Gender.MALE,
    non_binary: Gender.NON_BINARY,
    'nao binario': Gender.NON_BINARY,
    undisclosed: Gender.UNDISCLOSED,
    'prefiro nao informar': Gender.UNDISCLOSED,
  };
  return genders[normalized] ?? null;
}

function ageBetween(birthDate: Date, date: Date): number {
  let age = date.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    date.getUTCMonth() < birthDate.getUTCMonth() ||
    (date.getUTCMonth() === birthDate.getUTCMonth() &&
      date.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
