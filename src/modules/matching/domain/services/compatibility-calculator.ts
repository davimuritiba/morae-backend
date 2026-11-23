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

export type CompatibilityField =
  | 'sleepTime'
  | 'studyAtHome'
  | 'organization'
  | 'visitors'
  | 'smoking'
  | 'pets'
  | 'cleaning'
  | 'environment'
  | 'lifestyle';

export type CompatibilityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CompatibilityPoint {
  field: CompatibilityField;
  message: string;
  // Diferença que costuma inviabilizar a convivência (ex.: fumante e não fumante).
  critical?: boolean;
}

export interface CompatibilityCriterion {
  field: CompatibilityField;
  label: string;
  weight: number;
  // 0–100: quão próximas estão as respostas nesse critério.
  similarity: number;
}

export interface CompatibilityCalculation {
  score: number;
  level: CompatibilityLevel;
  summary: string;
  commonPoints: CompatibilityPoint[];
  differences: CompatibilityPoint[];
  breakdown: CompatibilityCriterion[];
}

// Pesos somam 100. Hábitos que geram mais atrito no dia a dia (sono, fumo,
// organização) pesam mais que preferências fáceis de negociar.
export const COMPATIBILITY_WEIGHTS: Record<CompatibilityField, number> = {
  sleepTime: 15,
  smoking: 15,
  organization: 14,
  cleaning: 11,
  visitors: 10,
  environment: 10,
  pets: 9,
  studyAtHome: 8,
  lifestyle: 8,
};

// Com um conflito crítico o índice não passa deste teto, mesmo que o resto combine.
export const CRITICAL_CONFLICT_SCORE_CAP = 50;
// A partir desta proximidade (0–1) o critério conta como ponto em comum.
const COMMON_POINT_THRESHOLD = 0.75;

// Escalas ordenadas: a proximidade cai conforme a distância entre as respostas.
const ordinalScales = {
  sleepTime: [
    SleepTime.BEFORE_21,
    SleepTime.FROM_21_TO_23,
    SleepTime.FROM_23_TO_01,
    SleepTime.AFTER_01,
  ],
  studyAtHome: [StudyAtHome.NO, StudyAtHome.SOMETIMES, StudyAtHome.YES],
  organization: [
    OrganizationLevel.IMPROVING,
    OrganizationLevel.SOMEWHAT,
    OrganizationLevel.VERY_ORGANIZED,
  ],
  visitors: [
    VisitorFrequency.RARELY,
    VisitorFrequency.SOMETIMES,
    VisitorFrequency.FREQUENTLY,
  ],
  smoking: [SmokingFrequency.NO, SmokingFrequency.SOMETIMES, SmokingFrequency.YES],
  cleaning: [
    CleaningFrequency.FLEXIBLE,
    CleaningFrequency.WEEKLY,
    CleaningFrequency.DAILY,
  ],
} as const;

type OrdinalField = keyof typeof ordinalScales;
type ScalarField = Exclude<CompatibilityField, 'lifestyle'>;

const topics: Record<CompatibilityField, string> = {
  sleepTime: 'horário de dormir',
  studyAtHome: 'estudar em casa',
  organization: 'organização',
  visitors: 'frequência de visitas',
  smoking: 'fumo',
  pets: 'animais de estimação',
  cleaning: 'frequência de limpeza',
  environment: 'preferência de ambiente',
  lifestyle: 'estilo de vida',
};

const criterionLabels: Record<CompatibilityField, string> = {
  sleepTime: 'Horário de dormir',
  studyAtHome: 'Estudo em casa',
  organization: 'Organização',
  visitors: 'Visitas',
  smoking: 'Fumo',
  pets: 'Animais de estimação',
  cleaning: 'Limpeza',
  environment: 'Ambiente',
  lifestyle: 'Estilo de vida',
};

const answerLabels: Record<ScalarField, Record<string, string>> = {
  sleepTime: {
    [SleepTime.BEFORE_21]: 'antes das 21h',
    [SleepTime.FROM_21_TO_23]: 'entre 21h e 23h',
    [SleepTime.FROM_23_TO_01]: 'entre 23h e 1h',
    [SleepTime.AFTER_01]: 'depois da 1h',
  },
  studyAtHome: {
    [StudyAtHome.YES]: 'sim, estudo em casa',
    [StudyAtHome.SOMETIMES]: 'às vezes estudo em casa',
    [StudyAtHome.NO]: 'não estudo em casa',
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
    [SmokingFrequency.YES]: 'fumo',
    [SmokingFrequency.SOMETIMES]: 'fumo às vezes',
    [SmokingFrequency.NO]: 'não fumo',
  },
  pets: {
    [PetPreference.YES]: 'sim, tenho',
    [PetPreference.NO]: 'não tenho',
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
};

// Rótulos curtos que descrevem uma pessoa (usados em cards de recomendação).
const traitTags: Record<ScalarField, Record<string, string>> = {
  sleepTime: {
    [SleepTime.BEFORE_21]: 'Dorme cedo',
    [SleepTime.FROM_21_TO_23]: 'Dorme até 23h',
    [SleepTime.FROM_23_TO_01]: 'Dorme tarde',
    [SleepTime.AFTER_01]: 'Notívago',
  },
  studyAtHome: {
    [StudyAtHome.YES]: 'Estuda em casa',
    [StudyAtHome.SOMETIMES]: 'Estuda em casa às vezes',
    [StudyAtHome.NO]: 'Estuda fora',
  },
  organization: {
    [OrganizationLevel.VERY_ORGANIZED]: 'Muito organizado',
    [OrganizationLevel.SOMEWHAT]: 'Organização moderada',
    [OrganizationLevel.IMPROVING]: 'Melhorando a organização',
  },
  visitors: {
    [VisitorFrequency.RARELY]: 'Poucas visitas',
    [VisitorFrequency.SOMETIMES]: 'Visitas às vezes',
    [VisitorFrequency.FREQUENTLY]: 'Recebe visitas',
  },
  smoking: {
    [SmokingFrequency.YES]: 'Fuma',
    [SmokingFrequency.SOMETIMES]: 'Fuma às vezes',
    [SmokingFrequency.NO]: 'Não fuma',
  },
  pets: {
    [PetPreference.YES]: 'Tem pets',
    [PetPreference.NO]: 'Sem pets',
  },
  cleaning: {
    [CleaningFrequency.DAILY]: 'Limpeza diária',
    [CleaningFrequency.WEEKLY]: 'Limpeza semanal',
    [CleaningFrequency.FLEXIBLE]: 'Limpeza flexível',
  },
  environment: {
    [EnvironmentPreference.QUIET]: 'Prefere silêncio',
    [EnvironmentPreference.BUSY]: 'Curte movimento',
    [EnvironmentPreference.INDIFFERENT]: 'Ambiente indiferente',
  },
};

const lifestyleLabels: Record<LifestyleTrait, string> = {
  [LifestyleTrait.CALM]: 'tranquilo',
  [LifestyleTrait.SOCIAL]: 'social',
  [LifestyleTrait.ADVENTUROUS]: 'aventureiro',
  [LifestyleTrait.STUDIOUS]: 'estudioso',
};

const scalarFields: ScalarField[] = [
  'sleepTime',
  'smoking',
  'organization',
  'cleaning',
  'visitors',
  'environment',
  'pets',
  'studyAtHome',
];

interface FieldComparison {
  similarity: number;
  critical: boolean;
}

export class CompatibilityCalculator {
  calculate(
    first: StudentCompatibilityAnswers,
    second: StudentCompatibilityAnswers,
  ): CompatibilityCalculation {
    const commonPoints: CompatibilityPoint[] = [];
    const differences: CompatibilityPoint[] = [];
    const breakdown: CompatibilityCriterion[] = [];
    let weightedSum = 0;
    let hasCriticalConflict = false;

    for (const field of scalarFields) {
      const firstValue = first[field] as string;
      const secondValue = second[field] as string;
      const { similarity, critical } = this.compareScalar(field, firstValue, secondValue);

      weightedSum += COMPATIBILITY_WEIGHTS[field] * similarity;
      breakdown.push(this.criterion(field, similarity));
      hasCriticalConflict ||= critical;

      if (similarity >= COMMON_POINT_THRESHOLD) {
        commonPoints.push({ field, message: this.commonMessage(field, firstValue, secondValue) });
      } else {
        differences.push({
          field,
          message: this.differenceMessage(field, firstValue, secondValue, critical),
          ...(critical ? { critical: true } : {}),
        });
      }
    }

    const lifestyle = this.compareLifestyle(first.lifestyle, second.lifestyle);
    weightedSum += COMPATIBILITY_WEIGHTS.lifestyle * lifestyle.similarity;
    breakdown.push(this.criterion('lifestyle', lifestyle.similarity));
    commonPoints.push(...lifestyle.commonPoints);
    differences.push(...lifestyle.differences);

    let score = Math.round(weightedSum);
    if (hasCriticalConflict) score = Math.min(score, CRITICAL_CONFLICT_SCORE_CAP);
    const level = levelFor(score);

    // Diferenças críticas primeiro: são o que mais importa conversar.
    differences.sort((a, b) => Number(Boolean(b.critical)) - Number(Boolean(a.critical)));

    return {
      score,
      level,
      summary: summaryFor(level, hasCriticalConflict),
      commonPoints,
      differences,
      breakdown,
    };
  }

  // Rótulos curtos das respostas de uma pessoa nos critérios em que ela combina
  // com quem está vendo — os primeiros são os de maior peso.
  sharedTraits(
    viewer: StudentCompatibilityAnswers,
    target: StudentCompatibilityAnswers,
    limit = 3,
  ): string[] {
    const tags: string[] = [];
    for (const field of scalarFields) {
      const targetValue = target[field] as string;
      if (this.compareScalar(field, viewer[field] as string, targetValue).similarity === 1) {
        tags.push(traitTags[field][targetValue]);
      }
    }
    const viewerLifestyle = new Set(viewer.lifestyle);
    for (const trait of target.lifestyle) {
      if (viewerLifestyle.has(trait)) tags.push(capitalize(lifestyleLabels[trait]));
    }
    return tags.slice(0, limit);
  }

  private compareScalar(field: ScalarField, first: string, second: string): FieldComparison {
    if (first === second) return { similarity: 1, critical: false };

    if (field === 'environment') {
      const indifferent =
        first === EnvironmentPreference.INDIFFERENT || second === EnvironmentPreference.INDIFFERENT;
      return { similarity: indifferent ? 0.75 : 0, critical: false };
    }

    // Ter ou não ter pet: dá para combinar regras, mas é uma diferença real.
    if (field === 'pets') return { similarity: 0.25, critical: false };

    const scale = ordinalScales[field as OrdinalField] as readonly string[];
    const distance = Math.abs(scale.indexOf(first) - scale.indexOf(second));
    const similarity = 1 - distance / (scale.length - 1);
    // Quem fuma com quem não fuma é o conflito mais citado em convivência estudantil.
    const critical =
      field === 'smoking' &&
      [first, second].includes(SmokingFrequency.YES) &&
      [first, second].includes(SmokingFrequency.NO);
    return { similarity, critical };
  }

  private compareLifestyle(
    first: readonly LifestyleTrait[],
    second: readonly LifestyleTrait[],
  ): { similarity: number; commonPoints: CompatibilityPoint[]; differences: CompatibilityPoint[] } {
    const firstSet = new Set(first);
    const secondSet = new Set(second);
    const all = new Set([...firstSet, ...secondSet]);
    const shared = [...all].filter((trait) => firstSet.has(trait) && secondSet.has(trait));
    const notShared = [...all].filter((trait) => !firstSet.has(trait) || !secondSet.has(trait));

    return {
      similarity: all.size === 0 ? 0 : shared.length / all.size,
      commonPoints: shared.map((trait) => ({
        field: 'lifestyle' as const,
        message: `As duas pessoas se identificam como ${lifestyleLabels[trait]}.`,
      })),
      differences:
        notShared.length > 0
          ? [
              {
                field: 'lifestyle' as const,
                message:
                  'Características selecionadas por apenas uma pessoa: ' +
                  notShared.map((trait) => lifestyleLabels[trait]).join(', ') +
                  '.',
              },
            ]
          : [],
    };
  }

  private criterion(field: CompatibilityField, similarity: number): CompatibilityCriterion {
    return {
      field,
      label: criterionLabels[field],
      weight: COMPATIBILITY_WEIGHTS[field],
      similarity: Math.round(similarity * 100),
    };
  }

  private commonMessage(field: ScalarField, first: string, second: string): string {
    if (first === second) {
      return `As duas pessoas responderam “${answerLabels[field][first]}” para ${topics[field]}.`;
    }
    const preference = first === EnvironmentPreference.INDIFFERENT ? second : first;
    return `Uma pessoa não tem preferência de ambiente e a outra prefere ${answerLabels.environment[preference]}.`;
  }

  private differenceMessage(
    field: ScalarField,
    first: string,
    second: string,
    critical: boolean,
  ): string {
    const base = `Você respondeu “${answerLabels[field][first]}” e a outra pessoa “${answerLabels[field][second]}” para ${topics[field]}.`;
    return critical ? `${base} Esse ponto costuma ser decisivo para dividir moradia.` : base;
  }
}

function levelFor(score: number): CompatibilityLevel {
  if (score >= 75) return 'HIGH';
  if (score >= 55) return 'MEDIUM';
  return 'LOW';
}

function summaryFor(level: CompatibilityLevel, hasCriticalConflict: boolean): string {
  if (hasCriticalConflict) {
    return 'Há uma diferença importante de hábitos; convém conversar sobre ela antes de dividir a moradia.';
  }
  if (level === 'HIGH') return 'Vocês têm muitas preferências em comum.';
  if (level === 'MEDIUM') {
    return 'Vocês compartilham algumas preferências; vale conversar sobre as diferenças.';
  }
  return 'Há diferenças importantes para alinhar antes de dividir a moradia.';
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1);
}
