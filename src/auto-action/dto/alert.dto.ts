import { IsInt, IsString } from 'class-validator';

export class AlertDto {
  @IsInt()
  id: number; // pk

  @IsString()
  name: string;

  @IsString()
  severity: string;

  @IsString()
  instance: string;

  @IsString()
  summary: string; 
}
