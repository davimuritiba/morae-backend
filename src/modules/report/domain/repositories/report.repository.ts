import type { ReportCategory } from '../enums/report-category.enum.js';
import type { ReportStatus } from '../enums/report-status.enum.js';

export interface CreateReportInput {
  targetUserId?: string;
  listingId?: string;
  category: ReportCategory;
  description: string;
}

export interface UpdateReportInput {
  status: ReportStatus;
  adminNote?: string;
}

export interface ReportRecord {
  id: string;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  reporter: { id: string; name: string; email: string };
  targetUser: { id: string; name: string; email: string };
  listing: { id: string; title: string } | null;
}

export interface AdminReportQuery {
  search?: string;
  status?: ReportStatus;
  page: number;
  limit: number;
}

export interface AdminReportPage {
  items: ReportRecord[];
  total: number;
  page: number;
  limit: number;
}

export abstract class ReportRepository {
  abstract create(reporterId: string, input: CreateReportInput): Promise<ReportRecord>;
  abstract findPage(query: AdminReportQuery): Promise<AdminReportPage>;
  abstract update(id: string, input: UpdateReportInput): Promise<ReportRecord>;
  abstract removeReportedProfile(reportId: string): Promise<ReportRecord>;
  abstract removeReportedListing(reportId: string): Promise<ReportRecord>;
}
