import { CheckRegistrationAvailabilityUseCase } from '../../../application/use-cases/check-registration-availability/check-registration-availability.use-case.js';
import { InMemoryStudentRepository } from '../../../infra/persistence/in-memory/in-memory-student.repository.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';

describe('CheckRegistrationAvailabilityUseCase', () => {
  let users: InMemoryUserRepository;
  let students: InMemoryStudentRepository;
  let sut: CheckRegistrationAvailabilityUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    students = new InMemoryStudentRepository();
    sut = new CheckRegistrationAvailabilityUseCase(users, students);
  });

  it('normalizes valid values and reports whether each one is unique', async () => {
    const cpfCheck = vi.spyOn(users, 'existsByCpf').mockResolvedValue(false);
    const emailCheck = vi.spyOn(users, 'existsByEmail').mockResolvedValue(true);
    const enrollmentCheck = vi
      .spyOn(students, 'existsByEnrollmentNumber')
      .mockResolvedValue(false);

    await expect(
      sut.execute({
        cpf: '529.982.247-25',
        email: ' Maria@Example.com ',
        enrollmentNumber: ' 20231234 ',
      }),
    ).resolves.toEqual({
      cpf: { valid: true, unique: true },
      email: { valid: true, unique: false },
      enrollmentNumber: { valid: true, unique: true },
    });

    expect(cpfCheck.mock.calls[0]?.[0].value).toBe('52998224725');
    expect(emailCheck.mock.calls[0]?.[0].value).toBe('maria@example.com');
    expect(enrollmentCheck.mock.calls[0]?.[0].value).toBe('20231234');
  });

  it('returns invalid formats without querying the repositories', async () => {
    const cpfCheck = vi.spyOn(users, 'existsByCpf');
    const emailCheck = vi.spyOn(users, 'existsByEmail');
    const enrollmentCheck = vi.spyOn(students, 'existsByEnrollmentNumber');

    await expect(
      sut.execute({
        cpf: '111.111.111-11',
        email: 'not-an-email',
        enrollmentNumber: 'abc',
      }),
    ).resolves.toEqual({
      cpf: { valid: false, unique: null },
      email: { valid: false, unique: null },
      enrollmentNumber: { valid: false, unique: null },
    });

    expect(cpfCheck).not.toHaveBeenCalled();
    expect(emailCheck).not.toHaveBeenCalled();
    expect(enrollmentCheck).not.toHaveBeenCalled();
  });

  it('returns only checks for the fields supplied', async () => {
    await expect(sut.execute({ email: 'maria@example.com' })).resolves.toEqual({
      email: { valid: true, unique: true },
    });
  });
});
