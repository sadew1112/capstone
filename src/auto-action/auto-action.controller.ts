// src/auto-action/auto-action.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { AutoActionService } from './auto-action.service';
import { SolutionOutput } from './models/solution-execution-result.model';
import { ExecutionRequestDto } from './dto/execution-request.dto';

@Controller()
export class AutoActionController {
  constructor(private readonly autoActionService: AutoActionService) {}

  @Post('aam')
  async execute(
    @Body() body: ExecutionRequestDto, // 🚩 단일 DTO로 받기
  ): Promise<SolutionOutput> {
    // Global ValidationPipe가 ExecutionRequestDto + 중첩 plan 까지 검증해줌
    return this.autoActionService.executeAndBuildOutput(body);
  }
}



