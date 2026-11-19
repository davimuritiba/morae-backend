import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class StartDirectChatDto {
  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @IsOptional()
  @IsUUID()
  listingId?: string;
}

export class CreateGroupChatDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  memberIds: string[];
}

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  content?: string | null;

  @IsOptional()
  @IsUUID()
  listingId?: string | null;
}

export class PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
