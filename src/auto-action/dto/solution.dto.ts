// src/auto-action/dto/solution.dto.ts
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AlertDto } from './alert.dto';
import { StepDto } from './step.dto';

export class SolutionDto {
  @IsString()
  version: string;

  @ValidateNested()
  @Type(() => AlertDto)
  alert: AlertDto;

  @IsOptional()
  @IsInt()
  alertLogId?: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  prechecks: StepDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  actions: StepDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  rollback: StepDto[];
}
