import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryUnitOfWork } from '../../../../../shared/infra/database/in-memory-unit-of-work.js';
import { FakeLogger } from '../../../../../shared/test/fakes/fake-logger.js';
import { FixedClock } from '../../../../../shared/test/fakes/fixed-clock.js';
import { GetUserProfileUseCase } from '../../../application/use-cases/get-user-profile/get-user-profile.use-case.js';
import { RegisterPropertyOwnerUseCase } from '../../../application/use-cases/register-property-owner/register-property-owner.use-case.js';
import type { RegisterStudentInput } from '../../../application/use-cases/register-student/register-student.input.js';
import { RegisterStudentUseCase } from '../../../application/use-cases/register-student/register-student.use-case.js';
import { SendEmailVerificationUseCase } from '../../../application/use-cases/send-email-verification/send-email-verification.use-case.js';
import { UpdateMyProfileUseCase } from '../../../application/use-cases/update-my-profile/update-my-profile.use-case.js';
import { AccountType } from '../../../domain/enums/account-type.enum.js';
import {
  CampusDistance,
  DesiredRoommates,
  Gender,
  PreferredHousingType,
  RoommateGender,
} from '../../../domain/enums/profile-details.enum.js';
import {
  CleaningFrequency,
  EnvironmentPreference,
  LifestyleTrait,
  OrganizationLevel,
  PetPreference,
  SleepTime,
  SmokingFrequency,
  StudyAtHome,
  VisitorFrequency,
} from '../../../domain/enums/student-compatibility.enum.js';
import { EmptyUserProfileUpdateError } from '../../../domain/errors/empty-user-profile-update.error.js';
import { InvalidProfileDetailsError } from '../../../domain/errors/invalid-profile-details.error.js';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error.js';
import { InMemoryEmailVerificationTokenRepository } from '../../../infra/persistence/in-memory/in-memory-email-verification-token.repository.js';
import { InMemoryPropertyOwnerRepository } from '../../../infra/persistence/in-memory/in-memory-property-owner.repository.js';
import { InMemoryStudentRepository } from '../../../infra/persistence/in-memory/in-memory-student.repository.js';
import { InMemoryUserProfileDetailsRepository } from '../../../infra/persistence/in-memory/in-memory-user-profile-details.repository.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';
import { FakeEmailVerificationNotifier } from '../../fakes/fake-email-verification-notifier.js';
import { FakeHasher } from '../../fakes/fake-hasher.js';
import { FakeVerificationTokenGenerator } from '../../fakes/fake-verification-token-generator.js';

const NOW = new Date('2026-11-23T12:00:00Z');

const answers = {
  sleepTime: SleepTime.FROM_21_TO_23,
  studyAtHome: StudyAtHome.YES,
  organization: OrganizationLevel.VERY_ORGANIZED,
  visitors: VisitorFrequency.RARELY,
  smoking: SmokingFrequency.NO,
  pets: PetPreference.NO,
  cleaning: CleaningFrequency.WEEKLY,
  environment: EnvironmentPreference.QUIET,
  lifestyle: [LifestyleTrait.CALM, LifestyleTrait.STUDIOUS],
};

function studentInput(overrides: Partial<RegisterStudentInput> = {}): RegisterStudentInput {
  return {
    name: 'Maria Silva',
    email: 'maria@ufal.br',
    cpf: '529.982.247-25',
    password: 'senha-segura-123',
    enrollmentNumber: '20231234',
    course: 'Ciência da Computação',
    period: 3,
    expectedGraduation: new Date('2028-12-15'),
    compatibilityAnswers: answers,
    profileDetails: {
      bio: 'Estudo à noite e gosto de casa silenciosa.',
      birthDate: '2004-05-18',
      gender: Gender.FEMALE,
      country: 'Brasil',
      state: 'Alagoas',
      city: 'Maceió',
      university: 'UFAL',
      campus: 'A. C. Simões',
      housingType: PreferredHousingType.REPUBLIC,
      maxBudget: 800,
      campusDistance: CampusDistance.FROM_1_TO_3_KM,
      preferredNeighborhoods: 'Serraria, Farol',
      desiredRoommates: DesiredRoommates.THREE_TO_FOUR,
      roommateGender: RoommateGender.FEMALE,
    },
    ...overrides,
  };
}

describe('Perfil do usuário', () => {
  let users: InMemoryUserRepository;
  let students: InMemoryStudentRepository;
  let owners: InMemoryPropertyOwnerRepository;
  let details: InMemoryUserProfileDetailsRepository;
  let registerStudent: RegisterStudentUseCase;
  let registerOwner: RegisterPropertyOwnerUseCase;
  let getProfile: GetUserProfileUseCase;
  let updateProfile: UpdateMyProfileUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    students = new InMemoryStudentRepository();
    owners = new InMemoryPropertyOwnerRepository();
    details = new InMemoryUserProfileDetailsRepository();
    const unitOfWork = new InMemoryUnitOfWork();
    const sendEmailVerification = new SendEmailVerificationUseCase(
      users,
      new InMemoryEmailVerificationTokenRepository(),
      new FakeVerificationTokenGenerator(),
      new FakeEmailVerificationNotifier(),
      new FixedClock(NOW),
      unitOfWork,
      { tokenTtlMs: 60_000 },
    );
    const hasher = new FakeHasher();
    const logger = new FakeLogger();
    registerStudent = new RegisterStudentUseCase(
      users, students, owners, hasher, unitOfWork, sendEmailVerification, logger, details,
    );
    registerOwner = new RegisterPropertyOwnerUseCase(
      users, owners, hasher, unitOfWork, sendEmailVerification, logger, details,
    );
    getProfile = new GetUserProfileUseCase(users, students, details, () => NOW);
    updateProfile = new UpdateMyProfileUseCase(users, students, details, unitOfWork, getProfile);
  });

  it('o cadastro de estudante grava os dados pessoais e as preferências', async () => {
    const { userId } = await registerStudent.execute(studentInput());

    expect(details.items.get(userId)?.data).toMatchObject({
      city: 'Maceió',
      university: 'UFAL',
      maxBudget: 800,
      housingType: PreferredHousingType.REPUBLIC,
    });
  });

  it('dados de perfil inválidos impedem o cadastro antes de gravar qualquer coisa', async () => {
    await expect(
      registerStudent.execute(studentInput({ profileDetails: { postalCode: '123' } })),
    ).rejects.toBeInstanceOf(InvalidProfileDetailsError);
    expect(users.items).toHaveLength(0);
  });

  it('o cadastro de proprietário grava os dados pessoais', async () => {
    const { userId } = await registerOwner.execute({
      name: 'João Souza',
      email: 'joao@example.com',
      cpf: '111.444.777-35',
      password: 'senha-segura-123',
      phone: '82999990000',
      profileDetails: { gender: Gender.MALE, city: 'Maceió', postalCode: '57035-120', address: 'Rua A, 10' },
    });

    expect(details.items.get(userId)?.data).toMatchObject({ postalCode: '57035120', address: 'Rua A, 10' });
  });

  it('a própria pessoa vê o perfil completo, com os dados privados', async () => {
    const { userId } = await registerStudent.execute(studentInput());

    const profile = await getProfile.execute({ viewerId: userId, targetUserId: userId });

    expect(profile).toMatchObject({
      name: 'Maria Silva',
      accountType: AccountType.STUDENT_SEEKER,
      age: 22,
      bio: 'Estudo à noite e gosto de casa silenciosa.',
      city: 'Maceió',
      student: {
        course: 'Ciência da Computação',
        period: 3,
        university: 'UFAL',
        campus: 'A. C. Simões',
        compatibilityAnswers: answers,
      },
      housingPreferences: { maxBudget: 800, roommateGender: RoommateGender.FEMALE },
      private: {
        email: 'maria@ufal.br',
        cpf: '52998224725',
        birthDate: '2004-05-18',
        gender: Gender.FEMALE,
      },
    });
  });

  it('outras pessoas não veem e-mail, telefone, nascimento nem endereço', async () => {
    const { userId } = await registerStudent.execute(studentInput());

    const profile = await getProfile.execute({ viewerId: 'outra-pessoa', targetUserId: userId });

    expect(profile.private).toBeNull();
    expect(profile.age).toBe(22);
    expect(profile.student?.course).toBe('Ciência da Computação');
    expect(JSON.stringify(profile)).not.toContain('maria@ufal.br');
    expect(JSON.stringify(profile)).not.toContain('52998224725');
    expect(JSON.stringify(profile)).not.toContain('2004-05-18');
  });

  it('conta sem dados de perfil aparece com os campos vazios', async () => {
    const { userId } = await registerStudent.execute(studentInput({ profileDetails: undefined }));

    const profile = await getProfile.execute({ viewerId: userId, targetUserId: userId });

    expect(profile).toMatchObject({ age: null, bio: null, city: null, housingPreferences: null });
    expect(profile.student?.course).toBe('Ciência da Computação');
  });

  it('usuário inexistente gera erro', async () => {
    await expect(getProfile.execute({ viewerId: 'x', targetUserId: 'nao-existe' })).rejects.toBeInstanceOf(
      UserNotFoundError,
    );
  });

  it('edita dados pessoais, curso, período e questionário de convivência', async () => {
    const { userId } = await registerStudent.execute(studentInput());

    const profile = await updateProfile.execute({
      userId,
      details: { city: 'Rio Largo', maxBudget: 950, campus: null },
      course: 'Engenharia Civil',
      period: 4,
      compatibilityAnswers: { ...answers, smoking: SmokingFrequency.SOMETIMES },
    });

    expect(profile).toMatchObject({
      city: 'Rio Largo',
      housingPreferences: { maxBudget: 950 },
      student: { course: 'Engenharia Civil', period: 4, campus: null, university: 'UFAL' },
    });
    expect(profile.student?.compatibilityAnswers?.smoking).toBe(SmokingFrequency.SOMETIMES);
  });

  it('cria os dados de perfil para contas antigas que não tinham', async () => {
    const { userId } = await registerStudent.execute(studentInput({ profileDetails: undefined }));

    const profile = await updateProfile.execute({ userId, details: { bio: 'Agora tenho apresentação.' } });

    expect(profile.bio).toBe('Agora tenho apresentação.');
  });

  it('recusa edição vazia', async () => {
    const { userId } = await registerStudent.execute(studentInput());

    await expect(updateProfile.execute({ userId, details: {} })).rejects.toBeInstanceOf(
      EmptyUserProfileUpdateError,
    );
  });

  it('proprietário não pode definir curso nem questionário', async () => {
    const { userId } = await registerOwner.execute({
      name: 'João Souza',
      email: 'joao@example.com',
      cpf: '111.444.777-35',
      password: 'senha-segura-123',
    });

    await expect(updateProfile.execute({ userId, course: 'Direito' })).rejects.toBeInstanceOf(
      InvalidProfileDetailsError,
    );
  });
});
