import { describe, expect, it } from 'vitest';
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
import {
  COMPATIBILITY_WEIGHTS,
  CRITICAL_CONFLICT_SCORE_CAP,
  CompatibilityCalculator,
} from '../../domain/services/compatibility-calculator.js';
import { makeAnswers } from '../fixtures.js';

const calculator = new CompatibilityCalculator();

describe('CompatibilityCalculator', () => {
  it('os pesos dos critérios somam 100', () => {
    const total = Object.values(COMPATIBILITY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBe(100);
  });

  it('dá 100% e nível alto para respostas idênticas', () => {
    const result = calculator.calculate(makeAnswers(), makeAnswers());

    expect(result.score).toBe(100);
    expect(result.level).toBe('HIGH');
    expect(result.differences).toEqual([]);
    expect(result.breakdown.every((criterion) => criterion.similarity === 100)).toBe(true);
  });

  it('é simétrico', () => {
    const first = makeAnswers({ sleepTime: SleepTime.AFTER_01, pets: PetPreference.YES });
    const second = makeAnswers({ visitors: VisitorFrequency.FREQUENTLY });

    expect(calculator.calculate(first, second).score).toBe(calculator.calculate(second, first).score);
  });

  it('pontua respostas vizinhas mais alto que respostas opostas', () => {
    const viewer = makeAnswers({ sleepTime: SleepTime.BEFORE_21 });
    const close = calculator.calculate(viewer, makeAnswers({ sleepTime: SleepTime.FROM_21_TO_23 }));
    const far = calculator.calculate(viewer, makeAnswers({ sleepTime: SleepTime.AFTER_01 }));

    expect(close.score).toBeGreaterThan(far.score);
    expect(close.breakdown.find((c) => c.field === 'sleepTime')?.similarity).toBe(67);
    expect(far.breakdown.find((c) => c.field === 'sleepTime')?.similarity).toBe(0);
    // Diferença de 1 faixa de horário custa 1/3 do peso do critério.
    expect(close.score).toBe(100 - Math.round(COMPATIBILITY_WEIGHTS.sleepTime / 3));
  });

  it('trata preferência de ambiente indiferente como ponto em comum parcial', () => {
    const result = calculator.calculate(
      makeAnswers({ environment: EnvironmentPreference.INDIFFERENT }),
      makeAnswers({ environment: EnvironmentPreference.BUSY }),
    );

    expect(result.breakdown.find((c) => c.field === 'environment')?.similarity).toBe(75);
    expect(result.commonPoints.some((p) => p.field === 'environment')).toBe(true);
  });

  it('marca fumante × não fumante como diferença crítica e limita o índice', () => {
    const result = calculator.calculate(
      makeAnswers({ smoking: SmokingFrequency.YES }),
      makeAnswers({ smoking: SmokingFrequency.NO }),
    );

    expect(result.score).toBeLessThanOrEqual(CRITICAL_CONFLICT_SCORE_CAP);
    expect(result.level).toBe('LOW');
    expect(result.differences[0]).toMatchObject({ field: 'smoking', critical: true });
  });

  it('fumar às vezes não é conflito crítico', () => {
    const result = calculator.calculate(
      makeAnswers({ smoking: SmokingFrequency.SOMETIMES }),
      makeAnswers({ smoking: SmokingFrequency.NO }),
    );

    expect(result.differences.some((p) => p.critical)).toBe(false);
    expect(result.score).toBeGreaterThan(CRITICAL_CONFLICT_SCORE_CAP);
  });

  it('mede o estilo de vida pela proporção de características compartilhadas', () => {
    const result = calculator.calculate(
      makeAnswers({ lifestyle: [LifestyleTrait.CALM, LifestyleTrait.STUDIOUS] }),
      makeAnswers({ lifestyle: [LifestyleTrait.CALM, LifestyleTrait.SOCIAL] }),
    );

    expect(result.breakdown.find((c) => c.field === 'lifestyle')?.similarity).toBe(33);
    expect(result.commonPoints.filter((p) => p.field === 'lifestyle')).toHaveLength(1);
  });

  it('dá nível baixo para perfis opostos', () => {
    const result = calculator.calculate(
      makeAnswers(),
      makeAnswers({
        sleepTime: SleepTime.AFTER_01,
        studyAtHome: StudyAtHome.NO,
        organization: OrganizationLevel.IMPROVING,
        visitors: VisitorFrequency.FREQUENTLY,
        smoking: SmokingFrequency.SOMETIMES,
        pets: PetPreference.YES,
        cleaning: CleaningFrequency.FLEXIBLE,
        environment: EnvironmentPreference.BUSY,
        lifestyle: [LifestyleTrait.SOCIAL, LifestyleTrait.ADVENTUROUS],
      }),
    );

    expect(result.level).toBe('LOW');
    expect(result.score).toBeLessThan(30);
    expect(result.commonPoints).toEqual([]);
  });

  it('descreve os traços em comum com rótulos curtos, priorizando os critérios de maior peso', () => {
    const tags = calculator.sharedTraits(
      makeAnswers(),
      makeAnswers({ sleepTime: SleepTime.AFTER_01 }),
    );

    expect(tags).toEqual(['Não fuma', 'Muito organizado', 'Limpeza semanal']);
  });
});
