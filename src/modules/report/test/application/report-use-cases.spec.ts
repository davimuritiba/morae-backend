import { describe, expect, it } from 'vitest';
import { CreateReportUseCase } from '../../application/use-cases/create-report/create-report.use-case.js';
import { InvalidReportTargetError } from '../../domain/errors/invalid-report-target.error.js';
import { ReportSelfActionError } from '../../domain/errors/report-self-action.error.js';
import { ReportRepository } from '../../domain/repositories/report.repository.js';
import type {
  AdminReportPage,
  AdminReportQuery,
  CreateReportInput,
  ReportRecord,
  UpdateReportInput,
} from '../../domain/repositories/report.repository.js';

class FakeReportRepository extends ReportRepository {
  lastCreated: { reporterId: string; input: CreateReportInput } | null = null;

  async create(reporterId: string, input: CreateReportInput): Promise<ReportRecord> {
    this.lastCreated = { reporterId, input };
    return {
      id: 'report-id',
      ...input,
      targetUserId: input.targetUserId || 'target-id',
      listing: null,
      adminNote: null,
      status: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date(),
      reporter: { id: reporterId, name: 'Reporter', email: 'reporter@example.com' },
      targetUser: { id: input.targetUserId || 'target-id', name: 'Target', email: 'target@example.com' },
    };
  }

  async findPage(_query: AdminReportQuery): Promise<AdminReportPage> {
    return { items: [], total: 0, page: 1, limit: 25 };
  }

  async update(_id: string, _input: UpdateReportInput): Promise<ReportRecord> {
    throw new Error('Not implemented');
  }

  async removeReportedProfile(): Promise<ReportRecord> {
    throw new Error('Not implemented');
  }

  async removeReportedListing(): Promise<ReportRecord> {
    throw new Error('Not implemented');
  }
}

describe('CreateReportUseCase', () => {
  it('requires exactly one report target', async () => {
    const repository = new FakeReportRepository();
    const useCase = new CreateReportUseCase(repository);

    expect(() => useCase.execute({
      reporterId: 'reporter-id',
      category: 'OTHER',
      description: 'Descrição suficientemente longa para o relato.',
    })).toThrow(InvalidReportTargetError);

    expect(() => useCase.execute({
      reporterId: 'reporter-id',
      targetUserId: 'target-id',
      listingId: 'listing-id',
      category: 'OTHER',
      description: 'Descrição suficientemente longa para o relato.',
    })).toThrow(InvalidReportTargetError);
    expect(repository.lastCreated).toBeNull();
  });

  it('rejects reporting the current user', async () => {
    const repository = new FakeReportRepository();
    const useCase = new CreateReportUseCase(repository);

    expect(() => useCase.execute({
      reporterId: 'same-id',
      targetUserId: 'same-id',
      category: 'OTHER',
      description: 'Descrição suficientemente longa para o relato.',
    })).toThrow(ReportSelfActionError);
    expect(repository.lastCreated).toBeNull();
  });

  it('trims and stores a valid report', async () => {
    const repository = new FakeReportRepository();
    const useCase = new CreateReportUseCase(repository);

    const report = await useCase.execute({
      reporterId: 'reporter-id',
      targetUserId: 'target-id',
      category: 'HARASSMENT',
      description: '  Descrição suficientemente longa para o relato.  ',
    });

    expect(report.status).toBe('OPEN');
    expect(repository.lastCreated).toEqual({
      reporterId: 'reporter-id',
      input: {
        targetUserId: 'target-id',
        listingId: undefined,
        category: 'HARASSMENT',
        description: 'Descrição suficientemente longa para o relato.',
      },
    });
  });
});
