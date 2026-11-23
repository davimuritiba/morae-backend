export const ReportStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
  DISMISSED: 'DISMISSED',
} as const;

export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];
