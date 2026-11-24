export const ReportCategory = {
  FRAUD: 'FRAUD',
  HARASSMENT: 'HARASSMENT',
  INAPPROPRIATE_CONTENT: 'INAPPROPRIATE_CONTENT',
  SAFETY: 'SAFETY',
  OTHER: 'OTHER',
} as const;

export type ReportCategory = (typeof ReportCategory)[keyof typeof ReportCategory];
