import { IsUUID } from 'class-validator';

export class CompareCompatibilityDto {
  @IsUUID()
  targetUserId: string;
}
