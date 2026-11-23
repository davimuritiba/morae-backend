import { describe, expect, it } from 'vitest';
import {
  assertReportActorVerified,
  assertReportCanBeRemoved,
} from '../../../domain/entities/report.entity.js';
import { ReportNotReviewedError } from '../../../domain/errors/report-not-reviewed.error.js';
import { ReportUserNotVerifiedError } from '../../../domain/errors/report-user-not-verified.error.js';

describe('assertReportActorVerified', () => {
  it('requires a confirmed email and a verified student or property-owner profile', () => {
    expect(() => assertReportActorVerified(null)).toThrow(ReportUserNotVerifiedError);
    expect(() => assertReportActorVerified({
      emailVerified: false,
      studentVerificationStatus: 'VERIFIED',
      propertyOwnerVerificationStatus: null,
    })).toThrow(ReportUserNotVerifiedError);
    expect(() => assertReportActorVerified({
      emailVerified: true,
      studentVerificationStatus: 'PENDING',
      propertyOwnerVerificationStatus: null,
    })).toThrow(ReportUserNotVerifiedError);
  });

  describe('assertReportCanBeRemoved', () => {
    it('only allows removal after an admin starts reviewing the report', () => {
      expect(() => assertReportCanBeRemoved('OPEN')).toThrow(ReportNotReviewedError);
      expect(() => assertReportCanBeRemoved('RESOLVED')).toThrow(ReportNotReviewedError);
      expect(() => assertReportCanBeRemoved('UNDER_REVIEW')).not.toThrow();
    });
  });

  it('allows verified student or property-owner accounts with a confirmed email', () => {
    expect(() => assertReportActorVerified({
      emailVerified: true,
      studentVerificationStatus: 'VERIFIED',
      propertyOwnerVerificationStatus: null,
    })).not.toThrow();
    expect(() => assertReportActorVerified({
      emailVerified: true,
      studentVerificationStatus: null,
      propertyOwnerVerificationStatus: 'VERIFIED',
    })).not.toThrow();
  });
});
