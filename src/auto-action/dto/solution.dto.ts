// src/auto-action/dto/solution.dto.ts
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StepDto } from './step.dto';

export class SolutionDto {
  @IsString()
  version: string;

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

