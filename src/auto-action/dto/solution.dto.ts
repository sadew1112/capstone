import {
  ArrayMinSize,
  IsArray,
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
