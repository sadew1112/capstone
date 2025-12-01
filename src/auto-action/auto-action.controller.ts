import { Body, Controller, Post } from '@nestjs/common';
import { AutoActionService } from './auto-action.service';
import { SolutionExecutionResult } from './models/solution-execution-result.model';

@Controller()
export class AutoActionController {
  constructor(private readonly autoActionService: AutoActionService) {}

  @Post('aam')
  async execute(
    @Body() body: any,
  ): Promise<SolutionExecutionResult[]> {
    return this.autoActionService.executeAll(body);
  }
}


