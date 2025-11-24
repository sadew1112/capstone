import { IsString } from 'class-validator';

export class StepDto {
  @IsString()
  id: string;

  @IsString()
  command: string;

  @IsString()
  description: string;
}
