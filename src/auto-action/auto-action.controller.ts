// src/auto-action/auto-action.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { AutoActionService } from './auto-action.service';
import { SolutionOutput } from './models/solution-execution-result.model';

@Controller()
export class AutoActionController {
  constructor(private readonly autoActionService: AutoActionService) {}

  @Post('aam')
  async execute(
    @Body() body: any,
  ): Promise<SolutionOutput> {
    return this.autoActionService.executeAllAndBuildOutput(body);
  }
}


