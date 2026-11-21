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
} from '../enums/student-compatibility.enum.js';
import { InvalidStudentCompatibilityAnswersError } from '../errors/invalid-student-compatibility-answers.error.js';

export interface StudentCompatibilityAnswersInput {
  sleepTime: SleepTime;
  studyAtHome: StudyAtHome;
  organization: OrganizationLevel;
  visitors: VisitorFrequency;
  smoking: SmokingFrequency;
  pets: PetPreference;
  cleaning: CleaningFrequency;
  environment: EnvironmentPreference;
  lifestyle: LifestyleTrait[];
  updatedAt?: Date;
}

export class StudentCompatibilityAnswers {
  readonly #lifestyle: readonly LifestyleTrait[];

  private constructor(
    readonly sleepTime: SleepTime,
    readonly studyAtHome: StudyAtHome,
    readonly organization: OrganizationLevel,
    readonly visitors: VisitorFrequency,
    readonly smoking: SmokingFrequency,
    readonly pets: PetPreference,
    readonly cleaning: CleaningFrequency,
    readonly environment: EnvironmentPreference,
    lifestyle: LifestyleTrait[],
    readonly updatedAt: Date,
  ) {
    this.#lifestyle = Object.freeze([...lifestyle]);
  }

  static create(
    input: StudentCompatibilityAnswersInput,
  ): StudentCompatibilityAnswers {
    const enumAnswers = [
      [input.sleepTime, SleepTime],
      [input.studyAtHome, StudyAtHome],
      [input.organization, OrganizationLevel],
      [input.visitors, VisitorFrequency],
      [input.smoking, SmokingFrequency],
      [input.pets, PetPreference],
      [input.cleaning, CleaningFrequency],
      [input.environment, EnvironmentPreference],
    ] as const;

    if (
      enumAnswers.some(
        ([answer, values]) => !Object.values(values).includes(answer as never),
      ) ||
      !Array.isArray(input.lifestyle) ||
      input.lifestyle.length === 0 ||
      input.lifestyle.some(
        (trait) => !Object.values(LifestyleTrait).includes(trait),
      ) ||
      new Set(input.lifestyle).size !== input.lifestyle.length
    ) {
      throw new InvalidStudentCompatibilityAnswersError();
    }

    return new StudentCompatibilityAnswers(
      input.sleepTime,
      input.studyAtHome,
      input.organization,
      input.visitors,
      input.smoking,
      input.pets,
      input.cleaning,
      input.environment,
      input.lifestyle,
      input.updatedAt ?? new Date(),
    );
  }

  static restore(
    input: StudentCompatibilityAnswersInput & { updatedAt: Date },
  ): StudentCompatibilityAnswers {
    return StudentCompatibilityAnswers.create(input);
  }

  get lifestyle(): readonly LifestyleTrait[] {
    return [...this.#lifestyle];
  }
}
