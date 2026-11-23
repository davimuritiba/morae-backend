export enum InterestStatus {
  PENDING = 'PENDING',
  IN_CONVERSATION = 'IN_CONVERSATION',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export function canOwnerTransitionInterestStatus(
  from: InterestStatus,
  to: InterestStatus,
): boolean {
  if (from === to) return true;
  if (to === InterestStatus.IN_CONVERSATION) return from === InterestStatus.PENDING;
  if (to === InterestStatus.ACCEPTED || to === InterestStatus.REJECTED) {
    return from === InterestStatus.PENDING || from === InterestStatus.IN_CONVERSATION;
  }
  return false;
}