import { StudentCompatibilityAnswers } from '../../user/domain/entities/student-compatibility-answers.entity.js';
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
} from '../../user/domain/enums/student-compatibility.enum.js';

type Overrides = Partial<Parameters<typeof StudentCompatibilityAnswers.create>[0]>;

export function makeAnswers(overrides: Overrides = {}): StudentCompatibilityAnswers {
  return StudentCompatibilityAnswers.create({
    sleepTime: SleepTime.FROM_21_TO_23,
    studyAtHome: StudyAtHome.YES,
    organization: OrganizationLevel.VERY_ORGANIZED,
    visitors: VisitorFrequency.RARELY,
    smoking: SmokingFrequency.NO,
    pets: PetPreference.NO,
    cleaning: CleaningFrequency.WEEKLY,
    environment: EnvironmentPreference.QUIET,
    lifestyle: [LifestyleTrait.CALM, LifestyleTrait.STUDIOUS],
    updatedAt: new Date('2026-11-01T00:00:00Z'),
    ...overrides,
  });
}
