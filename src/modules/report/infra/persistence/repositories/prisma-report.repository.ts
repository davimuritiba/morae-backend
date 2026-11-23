import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../shared/infra/database/generated/prisma/client.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import {
  assertReportActorVerified,
  assertReportCanBeRemoved,
} from '../../../domain/entities/report.entity.js';
import { ReportNotFoundError } from '../../../domain/errors/report-not-found.error.js';
import { ReportNotReviewedError } from '../../../domain/errors/report-not-reviewed.error.js';
import { ReportSelfActionError } from '../../../domain/errors/report-self-action.error.js';
import { ReportTargetNotFoundError } from '../../../domain/errors/report-target-not-found.error.js';
import { ReportRepository } from '../../../domain/repositories/report.repository.js';
import type {
  AdminReportPage,
  AdminReportQuery,
  CreateReportInput,
  ReportRecord,
  UpdateReportInput,
} from '../../../domain/repositories/report.repository.js';

const reportInclude = {
  reporter: { select: { id: true, name: true, email: true } },
  targetUser: { select: { id: true, name: true, email: true } },
  listing: { select: { id: true, title: true } },
} satisfies Prisma.ReportInclude;

@Injectable()
export class PrismaReportRepository extends ReportRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(reporterId: string, input: CreateReportInput): Promise<ReportRecord> {
    const reporter = await this.prisma.user.findUnique({
      where: { id: reporterId },
      select: {
        emailVerified: true,
        student: { select: { verificationStatus: true } },
        propertyOwner: { select: { verificationStatus: true } },
      },
    });
    assertReportActorVerified(
      reporter
        ? {
            emailVerified: reporter.emailVerified,
            studentVerificationStatus: reporter.student?.verificationStatus ?? null,
            propertyOwnerVerificationStatus: reporter.propertyOwner?.verificationStatus ?? null,
          }
        : null,
    );

    let targetUserId = input.targetUserId;
    if (input.listingId) {
      const listing = await this.prisma.listing.findUnique({
        where: { id: input.listingId },
        select: { property: { select: { owner: { select: { userId: true } } } } },
      });
      if (!listing) throw new ReportTargetNotFoundError();
      targetUserId = listing.property.owner.userId;
    }

    if (!targetUserId) throw new ReportTargetNotFoundError();
    if (targetUserId === reporterId) throw new ReportSelfActionError();

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!target) throw new ReportTargetNotFoundError();

    return this.prisma.report.create({
      data: {
        id: randomUUID(),
        reporterId,
        targetUserId,
        listingId: input.listingId,
        category: input.category,
        description: input.description.trim(),
      },
      include: reportInclude,
    });
  }

  async findPage(query: AdminReportQuery): Promise<AdminReportPage> {
    const searchFilters: Prisma.ReportWhereInput[] = query.search
      ? [
          { description: { contains: query.search, mode: 'insensitive' } },
          { reporter: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
          { targetUser: { is: { name: { contains: query.search, mode: 'insensitive' } } } },
          { listing: { is: { title: { contains: query.search, mode: 'insensitive' } } } },
        ]
      : [];
    if (query.search && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.search)) {
      searchFilters.push({ id: { equals: query.search } });
    }
    const where: Prisma.ReportWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(searchFilters.length ? { OR: searchFilters } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        include: reportInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async update(id: string, input: UpdateReportInput): Promise<ReportRecord> {
    try {
      return await this.prisma.report.update({
        where: { id },
        data: {
          status: input.status,
          ...(input.adminNote === undefined
            ? {}
            : { adminNote: input.adminNote || null }),
        },
        include: reportInclude,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ReportNotFoundError();
      }
      throw error;
    }
  }

  async removeReportedProfile(reportId: string): Promise<ReportRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const report = await transaction.report.findUnique({
        where: { id: reportId },
        select: { id: true, targetUserId: true, status: true },
      });
      if (!report) throw new ReportNotFoundError();
      assertReportCanBeRemoved(report.status);

      const claimed = await transaction.report.updateMany({
        where: { id: reportId, status: 'UNDER_REVIEW' },
        data: { status: 'RESOLVED' },
      });
      if (claimed.count !== 1) throw new ReportNotReviewedError();

      await transaction.user.update({
        where: { id: report.targetUserId },
        data: { status: 'DEACTIVATED' },
      });
      const owner = await transaction.propertyOwner.findUnique({
        where: { userId: report.targetUserId },
        select: { id: true },
      });
      if (owner) {
        await transaction.listing.updateMany({
          where: { property: { is: { ownerId: owner.id } } },
          data: { status: 'REMOVED' },
        });
      }
      const updated = await transaction.report.findUnique({
        where: { id: reportId },
        include: reportInclude,
      });
      if (!updated) throw new ReportNotFoundError();
      return updated;
    });
  }

  async removeReportedListing(reportId: string): Promise<ReportRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const report = await transaction.report.findUnique({
        where: { id: reportId },
        select: { id: true, listingId: true, status: true },
      });
      if (!report) throw new ReportNotFoundError();
      assertReportCanBeRemoved(report.status);
      if (!report.listingId) throw new ReportTargetNotFoundError();

      const claimed = await transaction.report.updateMany({
        where: { id: reportId, status: 'UNDER_REVIEW' },
        data: { status: 'RESOLVED' },
      });
      if (claimed.count !== 1) throw new ReportNotReviewedError();

      await transaction.listing.update({
        where: { id: report.listingId },
        data: { status: 'REMOVED' },
      });
      const updated = await transaction.report.findUnique({
        where: { id: reportId },
        include: reportInclude,
      });
      if (!updated) throw new ReportNotFoundError();
      return updated;
    });
  }
}
