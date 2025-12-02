// src/auto-action/dto/execution-request.dto.ts
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SolutionDto } from './solution.dto';

export class ExecutionRequestDto {
  @IsInt()
  alertId: number; // 새로 추가된 Alert PK

  @IsInt()
  alertLogId: number; // DB AlertLog PK (메타 정보)

  @IsString()
  @IsIn(['approved']) // 이 모듈까지 온 건 approved만이라고 가정
  decision: string;

  @IsString()
  approvedBy: string;

  @IsISO8601()
  approvedAt: string;

  @ValidateNested()
  @Type(() => SolutionDto)
  plan: SolutionDto;
}

