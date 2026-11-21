import type { StudentCompatibilityAnswers } from '../../../user/domain/entities/student-compatibility-answers.entity.js';
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
} from '../../../user/domain/enums/student-compatibility.enum.js';

export interface CompatibilityPoint {
  field: string;
  message: string;
}

export interface CompatibilityCalculation {
  score: number;
  summary: string;
  commonPoints: CompatibilityPoint[];
  differences: CompatibilityPoint[];
}

const labels = {
  sleepTime: {
    [SleepTime.BEFORE_21]: 'antes das 21h',
    [SleepTime.FROM_21_TO_23]: 'entre 21h e 23h',
    [SleepTime.FROM_23_TO_01]: 'entre 23h e 1h',
    [SleepTime.AFTER_01]: 'depois da 1h',
  },
  studyAtHome: {
    [StudyAtHome.YES]: 'sim',
    [StudyAtHome.SOMETIMES]: 'às vezes',
    [StudyAtHome.NO]: 'não',
  },
  organization: {
    [OrganizationLevel.VERY_ORGANIZED]: 'muito organizado',
    [OrganizationLevel.SOMEWHAT]: 'mais ou menos organizado',
    [OrganizationLevel.IMPROVING]: 'melhorando a organização',
  },
  visitors: {
    [VisitorFrequency.RARELY]: 'raramente',
    [VisitorFrequency.SOMETIMES]: 'às vezes',
    [VisitorFrequency.FREQUENTLY]: 'frequentemente',
  },
  smoking: {
    [SmokingFrequency.YES]: 'sim',
    [SmokingFrequency.SOMETIMES]: 'às vezes',
    [SmokingFrequency.NO]: 'não',
  },
  pets: {
    [PetPreference.YES]: 'sim',
    [PetPreference.NO]: 'não',
  },
  cleaning: {
    [CleaningFrequency.DAILY]: 'diariamente',
    [CleaningFrequency.WEEKLY]: 'semanalmente',
    [CleaningFrequency.FLEXIBLE]: 'de forma flexível',
  },
  environment: {
    [EnvironmentPreference.QUIET]: 'ambientes silenciosos',
    [EnvironmentPreference.BUSY]: 'ambientes movimentados',
    [EnvironmentPreference.INDIFFERENT]: 'indiferente',
  },
} as const;

const topics = {
  sleepTime: 'horário de dormir',
  studyAtHome: 'estudar em casa',
  organization: 'organização',
  visitors: 'frequência de visitas',
  smoking: 'fumo',
  pets: 'animais de estimação',
  cleaning: 'frequência de limpeza',
  environment: 'preferência de ambiente',
} as const;

const lifestyleLabels: Record<LifestyleTrait, string> = {
  [LifestyleTrait.CALM]: 'tranquilo',
  [LifestyleTrait.SOCIAL]: 'social',
  [LifestyleTrait.ADVENTUROUS]: 'aventureiro',
  [LifestyleTrait.STUDIOUS]: 'estudioso',
};
type ScalarField = keyof typeof labels;
const scalarFields: ScalarField[] = [
  'sleepTime',
  'studyAtHome',
  'organization',
  'visitors',
  'smoking',
  'pets',
  'cleaning',
  'environment',
];

export class CompatibilityCalculator {
  calculate(
    first: StudentCompatibilityAnswers,
    second: StudentCompatibilityAnswers,
  ): CompatibilityCalculation {
    const commonPoints: CompatibilityPoint[] = [];
    const differences: CompatibilityPoint[] = [];
    let matchingFields = 0;

    for (const field of scalarFields) {
      const firstValue = first[field] as string;
      const secondValue = second[field] as string;
      const compatible =
        firstValue === secondValue ||
        (field === 'environment' &&
          (firstValue === EnvironmentPreference.INDIFFERENT ||
            secondValue === EnvironmentPreference.INDIFFERENT));

      if (compatible) {
        matchingFields += 1;
        commonPoints.push({
          field,
          message:
            firstValue === secondValue
              ? `As duas pessoas responderam “${this.answer(field, firstValue)}” para ${topics[field]}.`
              : `Uma pessoa não tem preferência de ambiente e a outra prefere ${this.answer(field, firstValue === EnvironmentPreference.INDIFFERENT ? secondValue : firstValue)}.`,
        });
      } else {
        differences.push({
          field,
          message: `Você respondeu “${this.answer(field, firstValue)}” e a outra pessoa “${this.answer(field, secondValue)}” para ${topics[field]}.`,
        });
      }
    }

    const firstLifestyle = new Set(first.lifestyle);
    const secondLifestyle = new Set(second.lifestyle);
    const sharedLifestyle = [...firstLifestyle].filter((trait) =>
      secondLifestyle.has(trait),
    );
    const allLifestyle = new Set([...firstLifestyle, ...secondLifestyle]);
    const lifestyleSimilarity = sharedLifestyle.length / allLifestyle.size;

    for (const trait of sharedLifestyle) {
      commonPoints.push({
        field: 'lifestyle',
        message: `As duas pessoas se identificam como ${lifestyleLabels[trait]}.`,
      });
    }

    const differentLifestyle = [...allLifestyle].filter(
      (trait) => !firstLifestyle.has(trait) || !secondLifestyle.has(trait),
    );
    if (differentLifestyle.length > 0) {
      differences.push({
        field: 'lifestyle',
        message:
          'Características selecionadas por apenas uma pessoa: ' +
          differentLifestyle.map((trait) => lifestyleLabels[trait]).join(', ') +
          '.',
      });
    }

    const score = Math.round(
      (matchingFields / scalarFields.length) * 80 + lifestyleSimilarity * 20,
    );
    return {
      score,
      summary:
        score >= 80
          ? 'Vocês têm muitas preferências em comum.'
          : score >= 60
            ? 'Vocês compartilham algumas preferências; vale conversar sobre as diferenças.'
            : 'Há diferenças importantes para alinhar antes de dividir a moradia.',
      commonPoints,
      differences,
    };
  }

  private answer(field: ScalarField, value: string): string {
    if (field === 'studyAtHome' && value === StudyAtHome.YES) return 'sim, estudo em casa';
    if (field === 'studyAtHome' && value === StudyAtHome.NO) return 'não estudo em casa';
    if (field === 'studyAtHome') return 'às vezes estudo em casa';
    if (field === 'smoking' && value === SmokingFrequency.YES) return 'fumo';
    if (field === 'smoking' && value === SmokingFrequency.NO) return 'não fumo';
    if (field === 'smoking') return 'fumo às vezes';
    if (field === 'pets' && value === PetPreference.YES) return 'sim, tenho';
    if (field === 'pets') return 'não tenho';
    return (labels[field] as Record<string, string>)[value] ?? value;
  }
}
